import { NextResponse } from "next/server";
import { getMember } from "@/lib/membership";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

// "Manage subscription": Stripe's hosted page for cancelling, changing the
// card and downloading invoices.
export async function POST() {
  const member = await getMember();
  if (!member) return NextResponse.redirect(`${SITE_URL}/login`, 303);
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: member.customerId,
      return_url: `${SITE_URL}/planner`,
    });
    return NextResponse.redirect(portal.url, 303);
  } catch (err) {
    console.error("portal session failed:", err);
    return NextResponse.redirect(`${SITE_URL}/planner?error=portal`, 303);
  }
}
