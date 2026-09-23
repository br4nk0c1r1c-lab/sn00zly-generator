import { getStripe, grantAccess, isPaidPlannerSession, ACCESS_KEY, ACCESS_REFUNDED } from "@/lib/stripe";
import { createPlannerCoupon, deactivatePlannerCoupon } from "@/lib/shopify";
import { trackKlaviyoEvent } from "@/lib/klaviyo";
import { sendMetaEvent } from "@/lib/meta-capi";
import { sendTikTokEvent } from "@/lib/tiktok-capi";
import { SITE_URL, PLANNER_PRICE, PRODUCT_NAME, COUPON_VALUE, SHOP_URL } from "@/lib/site";

// Everything that happens once per purchase, driven by Stripe's
// checkout.session.completed webhook. Stripe retries a webhook until it gets
// a 2xx, so every step is safe to run twice: access and the coupon are
// stored on the Stripe customer and reused, Klaviyo and Meta de-duplicate on
// the checkout session id.

function metaFromSession(session) {
  const m = session.metadata || {};
  return {
    fbp: m.fbp || undefined,
    fbc: m.fbc || undefined,
    ttclid: m.tiktok_ttclid || undefined,
    ttp: m.tiktok_ttp || undefined,
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
  const { code, id } = await createPlannerCoupon({ email: customer.email || customer.id });
  await getStripe().customers.update(customer.id, {
    metadata: { planner_coupon: code, planner_coupon_id: id },
  });
  return code;
}

export async function fulfillCheckout(sessionId) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  // Delayed payment methods complete the session before the money arrives;
  // those are handled by checkout.session.async_payment_succeeded.
  if (!isPaidPlannerSession(session)) return;

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) throw new Error(`Checkout ${sessionId} has no customer`);

  const customer = await grantAccess(customerId);
  if (customer.metadata?.[ACCESS_KEY] === ACCESS_REFUNDED) return;

  const email = customer.email || session.customer_details?.email;
  const { fbp, fbc, ttclid, ttp, ip, userAgent, utm } = metaFromSession(session);
  const cleanUtm = Object.fromEntries(Object.entries(utm).filter(([, v]) => v));

  // 1. Coupon first: the welcome email needs it. If Shopify fails, stop
  // here and let Stripe retry the whole webhook — Klaviyo de-duplicates on
  // the session id, so an event sent without a code could never be resent
  // with one.
  const coupon = await ensureCoupon(customer);

  // 2. Klaviyo: profile + event that triggers the welcome flow.
  if (email) {
    await trackKlaviyoEvent({
      email,
      metric: "Planner Purchased",
      uniqueId: session.id,
      value: PLANNER_PRICE,
      properties: {
        product: PRODUCT_NAME,
        coupon_code: coupon,
        coupon_value: COUPON_VALUE,
        planner_url: `${SITE_URL}/planner?utm_source=klaviyo&utm_medium=email&utm_campaign=planner_welcome`,
        login_url: `${SITE_URL}/login?utm_source=klaviyo&utm_medium=email&utm_campaign=planner_welcome`,
        cheat_sheet_url: process.env.CHEATSHEET_URL || "",
        shop_url: `${SHOP_URL}/discount/${encodeURIComponent(coupon)}`,
        ...cleanUtm,
      },
      profileProperties: {
        planner_member: true,
        planner_coupon: coupon,
        planner_purchased_at: new Date(session.created * 1000).toISOString(),
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
      value: (session.amount_total ?? Math.round(PLANNER_PRICE * 100)) / 100,
      currency: (session.currency || "usd").toUpperCase(),
      contentName: PRODUCT_NAME,
    });
  } catch (err) {
    // Never fail the webhook (and re-run Klaviyo) because of ad tracking.
    console.error(err);
  }

  // 4. TikTok: same purchase signal, for the TikTok ad campaign.
  try {
    await sendTikTokEvent({
      eventName: "Purchase",
      eventId: session.id,
      eventTime: session.created,
      email,
      ttclid,
      ttp,
      ip,
      userAgent,
      sourceUrl: `${SITE_URL}/`,
      value: (session.amount_total ?? Math.round(PLANNER_PRICE * 100)) / 100,
      currency: (session.currency || "usd").toUpperCase(),
      contentId: "daily-sleep-planner",
      contentName: "Daily Sleep Planner",
    });
  } catch (err) {
    // Never fail the webhook (and re-run Klaviyo) because of ad tracking.
    console.error(err);
  }
}

/** A full refund closes the planner and switches off the unused guide code. */
export async function revokeForRefund(charge) {
  if (!charge?.refunded) return; // partial refunds keep access
  const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
  if (!customerId) return;

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) return;
  if (customer.metadata?.[ACCESS_KEY] === ACCESS_REFUNDED) return;
  if (!customer.metadata?.[ACCESS_KEY]) return; // not a planner customer

  await stripe.customers.update(customerId, {
    metadata: { [ACCESS_KEY]: ACCESS_REFUNDED, planner_refunded_at: new Date().toISOString() },
  });

  if (customer.metadata?.planner_coupon_id) {
    try {
      await deactivatePlannerCoupon(customer.metadata.planner_coupon_id);
    } catch (err) {
      console.error("coupon deactivation failed:", err);
    }
  }

  if (customer.email) {
    await trackKlaviyoEvent({
      email: customer.email,
      metric: "Planner Refunded",
      uniqueId: `${charge.id}-refunded`,
      properties: { product: PRODUCT_NAME, coupon_code: customer.metadata?.planner_coupon || "" },
      profileProperties: { planner_member: false },
    });
  }
}
