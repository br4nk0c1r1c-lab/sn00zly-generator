// Captures UTM parameters from the landing URL so they can travel with the
// email signup into Klaviyo. GA4 already records them as session source on its
// own; this exists so each Klaviyo profile carries the ad it came from, which
// is what segments and flows can act on later.
//
// First touch wins within a session: a visitor who lands from an ad and then
// navigates around keeps the ad's attribution.

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

const STORAGE_KEY = "sn_utm";
const MAX_VALUE_LENGTH = 200;

/** Call once, on mount of the root client component. */
export function captureUtm() {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const found = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, MAX_VALUE_LENGTH);
    }

    if (Object.keys(found).length) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    }
  } catch {
    // Private mode or blocked storage. Attribution is lost, the product is not.
  }
}

/** Call when submitting the email form. Returns {} when nothing was captured. */
export function getUtm() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
