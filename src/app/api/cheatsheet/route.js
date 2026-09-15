import { NextResponse } from "next/server";
import { getMember } from "@/lib/membership";
import { SITE_URL } from "@/lib/site";

export async function GET() {
  const member = await getMember();
  if (!member) return NextResponse.redirect(`${SITE_URL}/login`);
  const url = process.env.CHEATSHEET_URL;
  if (!url) return NextResponse.redirect(`${SITE_URL}/planner?error=cheatsheet`);
  return NextResponse.redirect(url);
}
