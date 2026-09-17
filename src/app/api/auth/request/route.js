import { NextResponse } from "next/server";
import { customerHasAccess, findCustomersByEmail } from "@/lib/stripe";
import { createLoginToken } from "@/lib/session";
import { sendLoginEmail } from "@/lib/mailer";
import { SITE_URL } from "@/lib/site";

// Always answers the same way whether or not the email belongs to a member,
// so the form cannot be used to find out who bought the planner.

export async function POST(request) {
  let email = "";
  try {
    ({ email = "" } = await request.json());
  } catch {
    // fall through to validation
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 200) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  try {
    const customers = await findCustomersByEmail(email);
    for (const customer of customers) {
      if (!customerHasAccess(customer)) continue;
      const url = `${SITE_URL}/api/auth/verify?t=${encodeURIComponent(createLoginToken(customer.id))}`;
      await sendLoginEmail({ to: customer.email || email.trim(), url });
      break;
    }
  } catch (err) {
    console.error("login request failed:", err);
    return NextResponse.json({ error: "Could not send the link right now. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
