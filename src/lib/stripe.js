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

// One-time purchase: access lives on the Stripe customer as
// metadata.planner_access = "lifetime". A refund sets it to "refunded".
export const ACCESS_KEY = "planner_access";
export const ACCESS_GRANTED = "lifetime";
export const ACCESS_REFUNDED = "refunded";

export function customerHasAccess(customer) {
  return Boolean(customer && !customer.deleted && customer.metadata?.[ACCESS_KEY] === ACCESS_GRANTED);
}

/** The Stripe customer if it has planner access, otherwise null. */
export async function findAccessCustomer(customerId) {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    return customerHasAccess(customer) ? customer : null;
  } catch (err) {
    if (err?.statusCode === 404) return null;
    throw err;
  }
}

/** A completed, paid Checkout Session for the planner price. */
export function isPaidPlannerSession(session) {
  if (!session || session.mode !== "payment" || session.status !== "complete") return false;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return false;
  return session.metadata?.product === "daily_sleep_planner";
}

export async function grantAccess(customerId) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw new Error(`Customer ${customerId} was deleted`);
  // Never re-open access after a refund just because a success link or a
  // webhook for the original payment is replayed.
  if (customer.metadata?.[ACCESS_KEY] === ACCESS_REFUNDED) return customer;
  if (customer.metadata?.[ACCESS_KEY] === ACCESS_GRANTED) return customer;
  return stripe.customers.update(customerId, {
    metadata: { [ACCESS_KEY]: ACCESS_GRANTED, planner_purchased_at: new Date().toISOString() },
  });
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
