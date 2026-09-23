import { createHash } from "node:crypto";

// TikTok Events API. Same reasoning as src/lib/meta-capi.js: the purchase
// happens on Stripe, not a platform TikTok's pixel already watches, so this
// is how TikTok learns about planner purchases. The browser fires the same
// event with the same event_id on the welcome page, and TikTok de-duplicates
// the pair.

const EVENTS_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

function sha256(value) {
  return createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

export async function sendTikTokEvent({
  eventName,
  eventId,
  eventTime,
  email,
  ttclid,
  ttp,
  ip,
  userAgent,
  sourceUrl,
  value,
  currency = "USD",
  contentId,
  contentName,
}) {
  const pixelId = process.env.TIKTOK_PIXEL_ID || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_EVENTS_TOKEN;
  if (!pixelId || !token) {
    console.warn(`TikTok Events API not configured; skipped ${eventName}`);
    return;
  }

  const user = {};
  if (email) user.email = sha256(email);
  if (ttclid) user.ttclid = ttclid;
  if (ttp) user.ttp = ttp;
  if (ip) user.ip = ip;
  if (userAgent) user.user_agent = userAgent;

  const properties = { currency, content_type: "product" };
  if (typeof value === "number") properties.value = value;
  if (contentId) {
    properties.contents = [{ content_id: contentId, content_name: contentName, quantity: 1, price: value }];
  }

  const event = {
    event: eventName,
    event_time: eventTime || Math.floor(Date.now() / 1000),
    event_id: eventId,
    user,
    properties,
  };
  if (sourceUrl) event.page = { url: sourceUrl };

  const body = { event_source: "web", event_source_id: pixelId, data: [event] };
  if (process.env.TIKTOK_TEST_EVENT_CODE) body.test_event_code = process.env.TIKTOK_TEST_EVENT_CODE;

  const res = await fetch(EVENTS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Access-Token": token },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TikTok Events API ${eventName} failed: ${res.status} ${text.slice(0, 300)}`);
  }
}
