// Provider-agnostic event tracking. Fires into whichever analytics script is
// loaded on the page (Plausible's window.plausible, GA4's window.gtag) —
// see brief Korak 4. No provider is wired up yet: both checks simply no-op
// until a script tag for one of them is added to the root layout.
export function trackEvent(name, props) {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.plausible === "function") {
      window.plausible(name, props ? { props } : undefined);
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", name, props || {});
    }
  } catch {
    // Analytics must never break the product.
  }
}
