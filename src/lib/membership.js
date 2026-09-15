import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionValue } from "@/lib/session";
import { findAccessSubscription, getStripe, periodEnd } from "@/lib/stripe";

/**
 * The signed-in member for this request, or null.
 * Server-only: reads the session cookie and confirms access with Stripe.
 */
export async function getMember() {
  const store = await cookies();
  const customerId = readSessionValue(store.get(SESSION_COOKIE)?.value);
  if (!customerId) return null;

  try {
    const subscription = await findAccessSubscription(customerId);
    if (!subscription) return null;
    const customer = await getStripe().customers.retrieve(customerId);
    if (!customer || customer.deleted) return null;
    return {
      customerId,
      email: customer.email || "",
      status: subscription.status,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end || subscription.cancel_at),
      periodEnd: periodEnd(subscription),
      couponCode: customer.metadata?.planner_coupon || null,
    };
  } catch (err) {
    console.error("getMember failed:", err);
    return null;
  }
}

/** Cookie check only — no Stripe call. For deciding which header link to show. */
export async function hasSessionCookie() {
  const store = await cookies();
  return Boolean(readSessionValue(store.get(SESSION_COOKIE)?.value));
}
