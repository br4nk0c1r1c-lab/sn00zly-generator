import { NextResponse } from "next/server";
import { buildSchedule, fmt, parseHM, weeksOld } from "@/lib/schedule-engine";
import { rangeStr } from "@/lib/schedule-format";
import { bundleForWeeks } from "@/lib/bundles";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://schedule.sn00zly.com").replace(/\/+$/, "");
const STRUGGLE_KEYS = ["short", "bedtime", "night", "early"];

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

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

// The client sends whatever sat in the landing URL, so take only the five keys
// we expect, only as strings, and only up to a sane length.
function sanitizeUtm(raw) {
  if (!raw || typeof raw !== "object") return {};
  const clean = {};
  for (const key of UTM_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      clean[key] = value.trim().slice(0, 200);
    }
  }
  return clean;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// The schedule is rebuilt here from dob/wake rather than accepted from the
// client, so nothing the browser posts ends up rendered as HTML in an email.
function buildScheduleProps({ babyName, dob, wake, struggle }) {
  if (typeof wake !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(wake)) return {};

  const weeks = weeksOld(dob);
  if (!Number.isFinite(weeks) || weeks < 0 || weeks > 112) return {};

  const wakeMin = parseHM(wake);
  const s = buildSchedule(weeks, wakeMin);

  const rows = [{ label: "Wake", value: fmt(wakeMin) }];
  s.items.forEach((it, i) => {
    rows.push({
      label: it.bridge ? "Catnap" : `Nap ${i + 1}`,
      value: `${fmt(it.start)} – ${fmt(it.end)}`,
    });
  });
  rows.push({
    label: "Bedtime",
    value: s.rhythm ? "No fixed bedtime" : rangeStr(s.bedLow, s.bedHigh),
  });

  const cells = rows
    .map(
      (r) =>
        `<tr>` +
        `<td style="padding:7px 0;border-bottom:1px solid #EFE7DA;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#5C6A85;">${escapeHtml(r.label)}</td>` +
        `<td align="right" style="padding:7px 0;border-bottom:1px solid #EFE7DA;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#22395C;font-weight:bold;">${escapeHtml(r.value)}</td>` +
        `</tr>`
    )
    .join("");

  const query = new URLSearchParams();
  query.set("n", babyName);
  query.set("d", dob);
  query.set("w", wake.replace(":", ""));
  if (STRUGGLE_KEYS.includes(struggle)) query.set("s", struggle);
  const qs = query.toString();

  return {
    schedule_html: `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:420px;border-collapse:collapse;">${cells}</table>`,
    schedule_url: `${SITE_URL}/?${qs}`,
    schedule_image_url: `${SITE_URL}/api/og?${qs}`,
  };
}

async function upsertProfile({ email, babyName, dob, ageRange, utm, schedule }) {
  const properties = {
    baby_name: babyName,
    baby_dob: dob,
    baby_age_range: ageRange,
    ...utm,
    ...schedule,
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

  const { email, name, dob, wake, struggle, utm } = payload || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!dob || typeof dob !== "string") {
    return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
  }

  const babyName = typeof name === "string" && name.trim() ? name.trim() : "your baby";
  const ageRange = bundleForWeeks(weeksOld(dob)).range;

  // Never let a schedule-building slip stop the signup itself.
  let schedule = {};
  try {
    schedule = buildScheduleProps({ babyName, dob, wake, struggle });
  } catch (err) {
    console.error("subscribe route: schedule props failed:", err);
  }

  try {
    await upsertProfile({ email, babyName, dob, ageRange, utm: sanitizeUtm(utm), schedule });
    await subscribeToFreeGuideList(email);
  } catch (err) {
    console.error("subscribe route error:", err);
    return NextResponse.json({ error: "Could not subscribe right now" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
