"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { BASE_PATH } from "@/lib/base-path";
import { COUPON_VALUE, SHOP_URL, shopLinkWithCode } from "@/lib/site";

export default function MemberPerks({ couponCode }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The code is visible on screen anyway.
    }
  }

  return (
    <section className="card perks-card" style={{ marginTop: 16 }}>
      <div className="card-label">Your member extras</div>

      <div className="perk-row">
        <div>
          <strong>${COUPON_VALUE} off any Sn00zly guide</strong>
          <span>One use, on anything at sn00zly.com.</span>
        </div>
        {couponCode ? (
          <button type="button" className="code-box" onClick={copy} aria-label="Copy code">
            {copied ? "Copied!" : couponCode}
          </button>
        ) : (
          <span className="code-pending">On its way — refresh in a minute</span>
        )}
      </div>
      <a
        className="btn btn-ghost"
        href={shopLinkWithCode(`${SHOP_URL}/collections/all`, couponCode, "perks_shop")}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("member_shop_click")}
      >
        Browse the guides{couponCode ? " — code applied" : ""}
      </a>

      <div className="perk-row" style={{ marginTop: 18 }}>
        <div>
          <strong>Wake Window Cheat Sheet</strong>
          <span>Printable PDF, 0–24 months.</span>
        </div>
      </div>
      <a
        className="btn btn-ghost"
        href={`${BASE_PATH}/api/cheatsheet`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("cheatsheet_download")}
      >
        Download the cheat sheet
      </a>
    </section>
  );
}
