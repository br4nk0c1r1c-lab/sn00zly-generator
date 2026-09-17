// Klaviyo server-side helpers. Events create or update the profile they name,
// so one call both records what happened and keeps the profile current.

const KLAVIYO_API_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2024-10-15";

function klaviyoHeaders() {
  return {
    Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,
    revision: KLAVIYO_REVISION,
    "Content-Type": "application/json",
    accept: "application/json",
  };
}

/**
 * Record a Klaviyo event (metric) for a profile.
 * Flows in Klaviyo trigger on the metric name, e.g. "Planner Subscription Started".
 */
export async function trackKlaviyoEvent({ email, metric, properties = {}, profileProperties = {}, uniqueId, value }) {
  if (!process.env.KLAVIYO_PRIVATE_API_KEY) {
    console.warn(`Klaviyo key missing; skipped event "${metric}"`);
    return;
  }
  const attributes = {
    properties,
    metric: { data: { type: "metric", attributes: { name: metric } } },
    profile: {
      data: {
        type: "profile",
        attributes: { email, properties: profileProperties },
      },
    },
  };
  if (uniqueId) attributes.unique_id = uniqueId;
  if (typeof value === "number") attributes.value = value;

  const res = await fetch(`${KLAVIYO_API_BASE}/events/`, {
    method: "POST",
    headers: klaviyoHeaders(),
    body: JSON.stringify({ data: { type: "event", attributes } }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Klaviyo event "${metric}" failed: ${res.status} ${text.slice(0, 300)}`);
  }
}
