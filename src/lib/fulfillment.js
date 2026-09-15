import { getStripe, periodEnd } from "@/lib/stripe";
import { createPlannerCoupon } from "@/lib/shopify";
import { trackKlaviyoEvent } from "@/lib/klaviyo";
import { sendMetaEvent } from "@/lib/meta-capi";
import { SITE_URL, PLANNER_PRICE, PRODUCT_NAME, COUPON_VALUE, SHOP_URL } from "@/lib/site";

// Everything that happens once per new planner member, driven by Stripe's
// checkout.session.completed webhook. Stripe retries a webhook until it gets
// a 2xx, so every step is written to be safe to run twice: the coupon is
// stored on the Stripe customer and reused, Klaviyo and Meta de-duplicate on
// the checkout session id.

function metaFromSession(session) {
  const m = session.metadata || {};
  return {
    fbp: m.fbp || undefined,
    fbc: m.fbc || undefined,
    ip: m.ip || undefined,
    userAgent: m.ua || undefined,
    utm: {
      utm_source: m.utm_source,
      utm_medium: m.utm_medium,
      utm_campaign: m.utm_campaign,
      utm_content: m.utm_content,
      utm_term: m.utm_term,
    },
  };
}

async function ensureCoupon(customer) {
  if (customer.metadata?.planner_coupon) return customer.metadata.planner_coupon;
  const code = await createPlannerCoupon({ email: customer.email || customer.id });
  await getStripe().customers.update(customer.id, {
    metadata: { planner_coupon: code },
  });
  return code;
}

export async function fulfillCheckout(sessionId) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  });
  if (session.mode !== "subscription" || session.status !== "complete") return;

  const customer = session.customer;
  if (!customer || typeof customer === "string" || customer.deleted) {
    throw new Error(`Checkout ${sessionId} has no usable customer`);
  }
  const email = customer.email || session.customer_details?.email;
  const { fbp, fbc, ip, userAgent, utm } = metaFromSession(session);
  const cleanUtm = Object.fromEntries(Object.entries(utm).filter(([, v]) => v));

  // 1. Coupon first: the welcome email needs it. If Shopify fails, stop
  // here and let Stripe retry the whole webhook — Klaviyo de-duplicates on
  // the session id, so an event sent without a code could never be resent
  // with one.
  const coupon = await ensureCoupon(customer);

  const subscription = typeof session.subscription === "object" ? session.subscription : null;
  const end = periodEnd(subscription);

  // 2. Klaviyo: profile + event that triggers the welcome flow.
  if (email) {
    await trackKlaviyoEvent({
      email,
      metric: "Planner Subscription Started",
      uniqueId: session.id,
      value: PLANNER_PRICE,
      properties: {
        product: PRODUCT_NAME,
        coupon_code: coupon || "",
        coupon_value: COUPON_VALUE,
        planner_url: `${SITE_URL}/planner?utm_source=klaviyo&utm_medium=email&utm_campaign=planner_welcome`,
        login_url: `${SITE_URL}/login?utm_source=klaviyo&utm_medium=email&utm_campaign=planner_welcome`,
        cheat_sheet_url: process.env.CHEATSHEET_URL || "",
        shop_url: coupon ? `${SHOP_URL}/discount/${encodeURIComponent(coupon)}` : SHOP_URL,
        ...cleanUtm,
      },
      profileProperties: {
        planner_member: true,
        planner_status: subscription?.status || "active",
        planner_coupon: coupon || "",
        planner_renews_at: end ? new Date(end * 1000).toISOString() : "",
        planner_started_at: new Date(session.created * 1000).toISOString(),
        ...Object.fromEntries(Object.entries(cleanUtm).map(([k, v]) => [`planner_${k}`, v])),
      },
    });
  }

  // 3. Meta: the purchase signal the ad campaign optimises for.
  try {
    await sendMetaEvent({
      eventName: "Purchase",
      eventId: session.id,
      eventTime: session.created,
      email,
      externalId: customer.id,
      fbp,
      fbc,
      ip,
      userAgent,
      sourceUrl: `${SITE_URL}/`,
      value: PLANNER_PRICE,
      contentName: PRODUCT_NAME,
    });
  } catch (err) {
    // Never fail the webhook (and re-run Klaviyo) because of ad tracking.
    console.error(err);
  }
}

export async function recordSubscriptionChange(subscription, kind) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(subscription.customer);
  if (!customer || customer.deleted || !customer.email) return;

  const end = periodEnd(subscription);
  const metric =
    kind === "deleted"
      ? "Planner Subscription Ended"
      : subscription.cancel_at_period_end || subscription.cancel_at
        ? "Planner Cancellation Scheduled"
        : null;

  const profileProperties = {
    planner_status: kind === "deleted" ? "canceled" : subscription.status,
    planner_member: kind !== "deleted" && ["active", "trialing", "past_due"].includes(subscription.status),
    planner_cancel_at_period_end: Boolean(subscription.cancel_at_period_end || subscription.cancel_at),
    planner_renews_at: end ? new Date(end * 1000).toISOString() : "",
  };

  if (!metric) {
    // Status-only change (renewal, reactivation, card retry): keep the profile current.
    await trackKlaviyoEvent({
      email: customer.email,
      metric: "Planner Subscription Updated",
      uniqueId: `${subscription.id}-${subscription.status}-${end || ""}-${profileProperties.planner_cancel_at_period_end}`,
      properties: { status: subscription.status },
      profileProperties,
    });
    return;
  }

  await trackKlaviyoEvent({
    email: customer.email,
    metric,
    uniqueId: `${subscription.id}-${metric}-${end || ""}`,
    properties: {
      product: PRODUCT_NAME,
      access_until: end ? new Date(end * 1000).toISOString() : "",
      coupon_code: customer.metadata?.planner_coupon || "",
    },
    profileProperties,
  });
}
