// Provider-agnostic event tracking. Fires into whichever analytics script is
// loaded on the page (Plausible's window.plausible, GA4's window.gtag).
//
// GA4 is injected from the root layout with strategy="afterInteractive", which
// can finish AFTER a component's mount effect runs. Events fired on mount used
// to hit an undefined window.gtag and vanish silently — that is why
// `generator_start` was missing from GA entirely while `generator_complete`
// (fired on a click, long after load) came through. Anything fired before a
// provider exists is now buffered and flushed once one shows up.

const FLUSH_INTERVAL_MS = 250;
const MAX_WAIT_MS = 10000;

const pending = [];
let timer = null;
let waited = 0;

function providerReady() {
  return (
    typeof window.plausible === "function" || typeof window.gtag === "function"
  );
}

function send(name, props) {
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

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  waited = 0;
}

function flush() {
  if (providerReady()) {
    while (pending.length) {
      const [name, props] = pending.shift();
      send(name, props);
    }
    stopTimer();
    return;
  }

  waited += FLUSH_INTERVAL_MS;
  if (waited >= MAX_WAIT_MS) {
    // No analytics on this page (blocker, or none configured). Drop the
    // buffer rather than hold it for the life of the session.
    pending.length = 0;
    stopTimer();
  }
}

export function trackEvent(name, props) {
  if (typeof window === "undefined") return;

  if (providerReady()) {
    send(name, props);
    return;
  }

  pending.push([name, props]);
  if (!timer) {
    timer = setInterval(flush, FLUSH_INTERVAL_MS);
  }
}
