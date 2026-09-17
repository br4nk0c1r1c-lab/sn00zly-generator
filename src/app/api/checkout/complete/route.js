import { NextResponse } from "next/server";
import { getStripe, grantAccess, customerHasAccess, isPaidPlannerSession } from "@/lib/stripe";
import { SESSION_COOKIE, createSessionValue, sessionCookieOptions } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

// Stripe sends the buyer here after paying. We confirm the payment, grant
// access and sign them in on this device straight away, so there is no
// "check your email" step between paying and using the planner. The
// webhook grants access too (whichever runs first wins) and does the rest:
// coupon, emails, Meta.

export async function GET(request) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.redirect(`${SITE_URL}/`);
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!customerId || !isPaidPlannerSession(session)) {
      return NextResponse.redirect(`${SITE_URL}/?checkout=pending`);
    }

    const customer = await grantAccess(customerId);
    if (!customerHasAccess(customer)) {
      return NextResponse.redirect(`${SITE_URL}/login?error=inactive`);
    }

    // The purchase event id is only handed to the browser for fresh
    // sessions, so reopening an old success link does not re-fire Purchase.
    const fresh = Date.now() / 1000 - session.created < 60 * 60;
    const target = new URL(`${SITE_URL}/planner`);
    target.searchParams.set("welcome", "1");
    if (fresh) target.searchParams.set("eid", session.id);

    const res = NextResponse.redirect(target.toString());
    res.cookies.set(SESSION_COOKIE, createSessionValue(customerId), sessionCookieOptions());
    return res;
  } catch (err) {
    console.error("checkout complete failed:", err);
    return NextResponse.redirect(`${SITE_URL}/login?error=checkout`);
  }
}
