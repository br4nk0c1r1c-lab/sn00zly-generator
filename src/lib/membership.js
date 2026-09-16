import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionValue } from "@/lib/session";
import { findAccessCustomer } from "@/lib/stripe";

/**
 * The signed-in member for this request, or null.
 * Server-only: reads the session cookie and confirms access with Stripe,
 * so a refund locks the planner even while the cookie is still valid.
 */
export async function getMember() {
  const store = await cookies();
  const customerId = readSessionValue(store.get(SESSION_COOKIE)?.value);
  if (!customerId) return null;

  try {
    const customer = await findAccessCustomer(customerId);
    if (!customer) return null;
    return {
      customerId,
      email: customer.email || "",
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
