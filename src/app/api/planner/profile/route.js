import { NextResponse } from "next/server";
import { getMember } from "@/lib/membership";
import { parseDobParam, parseNameParam } from "@/lib/share-params";
import { bundleForWeeks } from "@/lib/bundles";
import { trackKlaviyoEvent } from "@/lib/klaviyo";

// The planner remembers the baby on the member's device. This copies the
// baby's name, date of birth and age band to the member's Klaviyo profile so
// the age-matched nurture emails (and later campaigns) can use them.
// The browser calls it only when the baby or the age band changes.
export async function POST(request) {
  const member = await getMember();
  if (!member) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!member.email) return NextResponse.json({ ok: true, skipped: "no email" });

  let body = {};
  try {
    body = await request.json();
  } catch {
    // validated below
  }
  const dob = parseDobParam(body.dob);
  if (!dob) return NextResponse.json({ error: "Missing date of birth." }, { status: 400 });
  const name = parseNameParam(body.name);

  const ageMs = Date.now() - new Date(`${dob}T00:00:00Z`).getTime();
  const weeks = Math.max(0, Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000)));
  const ageRange = bundleForWeeks(weeks).range;

  const babyProps = { baby_dob: dob, baby_age_range: ageRange };
  if (name) babyProps.baby_name = name;

  try {
    await trackKlaviyoEvent({
      email: member.email,
      metric: "Planner Baby Saved",
      properties: { ...babyProps, baby_age_weeks: weeks },
      profileProperties: { ...babyProps, planner_member: true },
      uniqueId: `${member.customerId}:${dob}:${ageRange}:${name || ""}`,
    });
  } catch (err) {
    console.error("planner profile sync failed:", err);
    return NextResponse.json({ error: "Could not save." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ageRange });
}
