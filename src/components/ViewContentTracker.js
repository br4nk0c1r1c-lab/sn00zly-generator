"use client";

import { useEffect } from "react";
import { trackTikTok } from "@/lib/analytics";
import { tiktokProductParams } from "@/lib/tiktok";

// Fires TikTok's ViewContent once per page load for a visitor who is not
// signed in yet — the landing page's own "seeing the offer" moment. Signed-in
// members land here too (e.g. a bookmark), but ScheduleGenerator's mount
// effect already covers them once they reach the planner, so this only
// tracks the new-visitor case.
export default function ViewContentTracker({ signedIn }) {
  useEffect(() => {
    if (signedIn) return;
    trackTikTok("ViewContent", tiktokProductParams());
  }, [signedIn]);

  return null;
}
