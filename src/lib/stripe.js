import Stripe from "stripe";

let client = null;

export function getStripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    // The fetch-based client works the same on Vercel's Node runtime and
    // keeps every outbound call on one code path.
    client = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  }
  return client;
}

// past_due keeps access while Stripe retries a failed card, so one declined
// renewal does not lock a parent out at 6am. Stripe cancels the subscription
// itself when retries run out, and access ends then.
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

export function hasAccess(subscription) {
  return Boolean(subscription && ACCESS_STATUSES.has(subscription.status));
}

function plannerPriceId() {
  return process.env.STRIPE_PRICE_ID;
}

function isPlannerSubscription(sub) {
  const priceId = plannerPriceId();
  if (!priceId) return true;
  return sub.items?.data?.some((item) => item.price?.id === priceId);
}

/** The customer's planner subscription with access, or null. */
export async function findAccessSubscription(customerId) {
  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  return subs.data.find((s) => isPlannerSubscription(s) && hasAccess(s)) || null;
}

export function periodEnd(subscription) {
  // Newer Stripe API versions keep the period on the subscription item.
  const item = subscription?.items?.data?.[0];
  return item?.current_period_end ?? subscription?.current_period_end ?? null;
}

/**
 * All Stripe customers with this email. The list filter is case-sensitive,
 * so a parent who types "Mama@..." at checkout and "mama@..." at sign-in is
 * also looked up through Search, which matches regardless of case.
 */
export async function findCustomersByEmail(email) {
  const stripe = getStripe();
  const clean = email.trim();
  const seen = new Map();
  for (const v of new Set([clean, clean.toLowerCase()])) {
    const res = await stripe.customers.list({ email: v, limit: 10 });
    for (const c of res.data) seen.set(c.id, c);
  }
  if (!seen.size) {
    try {
      const res = await stripe.customers.search({
        query: `email:"${clean.replace(/["\\]/g, "")}"`,
        limit: 10,
      });
      for (const c of res.data) seen.set(c.id, c);
    } catch (err) {
      console.error("customer search failed:", err.message);
    }
  }
  return Array.from(seen.values());
}
