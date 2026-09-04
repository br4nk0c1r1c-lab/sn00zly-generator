import { NextResponse } from "next/server";
import { weeksOld } from "@/lib/schedule-engine";
import { bundleForWeeks } from "@/lib/bundles";

const KLAVIYO_API_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2024-10-15";
const FREE_GUIDE_LIST_ID = "SFCu7v";

function klaviyoHeaders() {
  return {
    Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,
    revision: KLAVIYO_REVISION,
    "Content-Type": "application/json",
    accept: "application/json",
  };
}

async function upsertProfile({ email, babyName, dob, ageRange }) {
  const properties = {
    baby_name: babyName,
    baby_dob: dob,
    baby_age_range: ageRange,
  };

  const createRes = await fetch(`${KLAVIYO_API_BASE}/profiles/`, {
    method: "POST",
    headers: klaviyoHeaders(),
    body: JSON.stringify({
      data: {
        type: "profile",
        attributes: { email, properties },
      },
    }),
  });

  if (createRes.ok) return;
  if (createRes.status !== 409) {
    throw new Error(`Klaviyo profile create failed: ${createRes.status}`);
  }

  const body = await createRes.json();
  const existingId = body?.errors?.[0]?.meta?.duplicate_profile_id;
  if (!existingId) throw new Error("Klaviyo profile conflict without duplicate_profile_id");

  const updateRes = await fetch(`${KLAVIYO_API_BASE}/profiles/${existingId}/`, {
    method: "PATCH",
    headers: klaviyoHeaders(),
    body: JSON.stringify({
      data: {
        type: "profile",
        id: existingId,
        attributes: { properties },
      },
    }),
  });
  if (!updateRes.ok) {
    throw new Error(`Klaviyo profile update failed: ${updateRes.status}`);
  }
}

async function subscribeToFreeGuideList(email) {
  const res = await fetch(`${KLAVIYO_API_BASE}/profile-subscription-bulk-create-jobs/`, {
    method: "POST",
    headers: klaviyoHeaders(),
    body: JSON.stringify({
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: { marketing: { consent: "SUBSCRIBED" } },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: { data: { type: "list", id: FREE_GUIDE_LIST_ID } },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Klaviyo list subscribe failed: ${res.status}`);
  }
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, name, dob } = payload || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!dob || typeof dob !== "string") {
    return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
  }

  const babyName = typeof name === "string" && name.trim() ? name.trim() : "your baby";
  const ageRange = bundleForWeeks(weeksOld(dob)).range;

  try {
    await upsertProfile({ email, babyName, dob, ageRange });
    await subscribeToFreeGuideList(email);
  } catch (err) {
    console.error("subscribe route error:", err);
    return NextResponse.json({ error: "Could not subscribe right now" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
