import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

export async function POST() {
  const res = NextResponse.redirect(`${SITE_URL}/`, 303);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
