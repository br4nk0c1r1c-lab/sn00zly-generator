import { NextResponse } from "next/server";
import { getMember } from "@/lib/membership";
import { signedShareQuery } from "@/lib/share-link";
import { parseDobParam, parseNameParam, parseStruggleParam, parseWakeParam, formatWakeParam } from "@/lib/share-params";
import { SITE_URL } from "@/lib/site";

// Members get signed share / image links for the schedule they are looking at.
export async function POST(request) {
  const member = await getMember();
  if (!member) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    // validated below
  }
  const fields = {
    name: parseNameParam(body.name) || "Your baby",
    dob: parseDobParam(body.dob),
    wake: parseWakeParam(formatWakeParam(body.wake)),
    struggle: parseStruggleParam(body.struggle),
  };
  if (!fields.dob || !fields.wake) {
    return NextResponse.json({ error: "Missing schedule details." }, { status: 400 });
  }

  const query = signedShareQuery(fields);
  return NextResponse.json({
    url: `${SITE_URL}/?${query}&utm_source=share&utm_medium=planner&utm_campaign=shared_schedule`,
    imageUrl: `${SITE_URL}/api/og?${query}&format=story`,
  });
}
