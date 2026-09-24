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
export async function trackKlaviyoEvent({
  email,
  metric,
  properties = {},
  profileProperties = {},
  firstName,
  lastName,
  location,
  uniqueId,
  value,
}) {
  if (!process.env.KLAVIYO_PRIVATE_API_KEY) {
    console.warn(`Klaviyo key missing; skipped event "${metric}"`);
    return;
  }
  // first_name/last_name/location are standard Klaviyo profile fields, so
  // they sit alongside email rather than in the custom `properties` bag.
  // Omitted entirely when blank, so an empty value never overwrites data
  // already on the profile.
  const profileAttributes = { email, properties: profileProperties };
  if (firstName) profileAttributes.first_name = firstName;
  if (lastName) profileAttributes.last_name = lastName;
  if (location && Object.keys(location).length) profileAttributes.location = location;
  const attributes = {
    properties,
    metric: { data: { type: "metric", attributes: { name: metric } } },
    profile: {
      data: {
        type: "profile",
        attributes: profileAttributes,
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

/**
 * Subscribe Profiles API: opts an email into email marketing on the given
 * list. Async/job-based like the old free-guide subscribe — a 200 confirms
 * the job was accepted, not that the subscription has landed yet.
 */
export async function subscribeToNewsletterList({ email, customSource }) {
  const listId = process.env.KLAVIYO_NEWSLETTER_LIST_ID;
  if (!process.env.KLAVIYO_PRIVATE_API_KEY || !listId) {
    console.warn("Klaviyo newsletter list not configured; skipped subscribe");
    return;
  }
  const body = {
    data: {
      type: "profile-subscription-bulk-create-job",
      attributes: {
        custom_source: customSource,
        profiles: {
          data: [
            {
              type: "profile",
              attributes: {
                email,
                subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } },
              },
            },
          ],
        },
      },
      relationships: {
        list: { data: { type: "list", id: listId } },
      },
    },
  };

  const res = await fetch(`${KLAVIYO_API_BASE}/profile-subscription-bulk-create-jobs/`, {
    method: "POST",
    headers: klaviyoHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Klaviyo newsletter subscribe failed: ${res.status} ${text.slice(0, 300)}`);
  }
}
