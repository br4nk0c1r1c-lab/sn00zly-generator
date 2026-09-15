import { createHash } from "node:crypto";

// Meta Conversions API. The purchase happens on Stripe, not Shopify, so the
// Shopify pixel integration never sees it — this is how Meta learns about
// planner subscriptions. The browser fires the same event with the same
// event_id on the welcome page, and Meta de-duplicates the pair.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v24.0";

function sha256(value) {
  return createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

export async function sendMetaEvent({
  eventName,
  eventId,
  eventTime,
  email,
  externalId,
  fbp,
  fbc,
  ip,
  userAgent,
  sourceUrl,
  value,
  currency = "USD",
  contentName,
}) {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) {
    console.warn(`Meta CAPI not configured; skipped ${eventName}`);
    return;
  }

  const userData = {};
  if (email) userData.em = [sha256(email)];
  if (externalId) userData.external_id = [sha256(externalId)];
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;

  const customData = { currency };
  if (typeof value === "number") customData.value = value;
  if (contentName) customData.content_name = contentName;

  const event = {
    event_name: eventName,
    event_time: eventTime || Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: userData,
    custom_data: customData,
  };
  if (sourceUrl) event.event_source_url = sourceUrl;

  const body = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta CAPI ${eventName} failed: ${res.status} ${text.slice(0, 300)}`);
  }
}
