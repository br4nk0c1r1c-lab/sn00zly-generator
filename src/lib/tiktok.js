// Captures the TikTok click id from the landing URL so it can travel with
// checkout into the Stripe metadata the webhook reads for the Events API
// call. Same first-touch-per-session idea as src/lib/utm.js.

const STORAGE_KEY = "sn_ttclid";
const MAX_VALUE_LENGTH = 200;

/** Call once, on mount of the root client component. */
export function captureTtclid() {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;
    const value = new URLSearchParams(window.location.search).get("ttclid");
    if (value) window.sessionStorage.setItem(STORAGE_KEY, value.slice(0, MAX_VALUE_LENGTH));
  } catch {
    // Private mode or blocked storage. Attribution is lost, the product is not.
  }
}

/** Call when starting checkout. Returns "" when nothing was captured. */
export function getTtclid() {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}
