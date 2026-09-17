"use client";

import { useEffect } from "react";
import { trackEvent, trackMeta } from "@/lib/analytics";
import { PLANNER_PRICE } from "@/lib/site";

export default function WelcomeBanner({ eventId }) {
  useEffect(() => {
    if (!eventId) return;
    // Same event id as the server-side Conversions API event → counted once.
    let already = false;
    try {
      already = window.sessionStorage.getItem(`sn_purchase_${eventId}`) === "1";
      window.sessionStorage.setItem(`sn_purchase_${eventId}`, "1");
    } catch {
      // ignore
    }
    if (already) return;
    trackMeta("Purchase", { value: PLANNER_PRICE, currency: "USD", content_name: "Daily Sleep Planner" }, eventId);
    trackEvent("purchase", { transaction_id: eventId, value: PLANNER_PRICE, currency: "USD" });
    // Drop eid from the address bar so a refresh or a bookmark is clean.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("eid");
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  }, [eventId]);

  return (
    <div className="notice notice-good">
      <strong>Welcome — you&apos;re in.</strong> Your planner is ready below. We&apos;ve also emailed your receipt,
      the Wake Window Cheat Sheet and your guide code.
    </div>
  );
}
