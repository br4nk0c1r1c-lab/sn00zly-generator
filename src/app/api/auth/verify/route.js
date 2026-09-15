import { NextResponse } from "next/server";
import { findAccessSubscription } from "@/lib/stripe";
import { SESSION_COOKIE, createSessionValue, readLoginToken, sessionCookieOptions } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

export async function GET(request) {
  const customerId = readLoginToken(request.nextUrl.searchParams.get("t"));
  if (!customerId) return NextResponse.redirect(`${SITE_URL}/login?error=expired`);

  try {
    const sub = await findAccessSubscription(customerId);
    if (!sub) return NextResponse.redirect(`${SITE_URL}/login?error=inactive`);
  } catch (err) {
    console.error("login verify failed:", err);
    return NextResponse.redirect(`${SITE_URL}/login?error=server`);
  }

  const res = NextResponse.redirect(`${SITE_URL}/planner`);
  res.cookies.set(SESSION_COOKIE, createSessionValue(customerId), sessionCookieOptions());
  return res;
}
