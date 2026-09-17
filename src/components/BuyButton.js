"use client";

import { useEffect, useState } from "react";
import { trackEvent, trackMeta } from "@/lib/analytics";
import { captureUtm, getUtm } from "@/lib/utm";
import { BASE_PATH } from "@/lib/base-path";
import { PLANNER_PRICE } from "@/lib/site";

export default function BuyButton({ label, placement }) {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    captureUtm();
  }, []);

  async function handleClick() {
    if (status === "loading") return;
    setStatus("loading");
    trackEvent("begin_checkout", { placement, value: PLANNER_PRICE, currency: "USD" });
    trackMeta("InitiateCheckout", { value: PLANNER_PRICE, currency: "USD", content_name: "Daily Sleep Planner" });

    // Meta's click id only lands in the _fbc cookie once the pixel has run;
    // passing it along covers a buyer who clicks before that happens.
    let fbc;
    try {
      const fbclid = new URLSearchParams(window.location.search).get("fbclid");
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`${BASE_PATH}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utm: getUtm(), fbc, placement }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error || "checkout failed");
      window.location.assign(body.url);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <button type="button" className="btn btn-gold btn-buy" onClick={handleClick} disabled={status === "loading"}>
      {status === "loading"
        ? "Opening secure checkout…"
        : status === "error"
          ? "Couldn't open checkout — try again"
          : label || `Get the Daily Sleep Planner — $${PLANNER_PRICE}`}
    </button>
  );
}
