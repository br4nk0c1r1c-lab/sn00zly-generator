import { NextResponse } from "next/server";
import { getStripe, hasAccess } from "@/lib/stripe";
import { SESSION_COOKIE, createSessionValue, sessionCookieOptions } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

// Stripe sends the buyer here after paying. We sign them in on this device
// straight away, so there is no "check your email" step between paying and
// using the planner. Fulfilment (coupon, emails, Meta) runs in the webhook.

export async function GET(request) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.redirect(`${SITE_URL}/`);
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const sub = typeof session.subscription === "object" ? session.subscription : null;
    if (session.status !== "complete" || !customerId || !hasAccess(sub)) {
      return NextResponse.redirect(`${SITE_URL}/?checkout=pending`);
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
