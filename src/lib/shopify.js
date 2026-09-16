import { randomBytes } from "node:crypto";
import { COUPON_VALUE } from "@/lib/site";

// Creates (and, after a refund, switches off) the one-time $15 guide code
// each planner buyer gets.
//
// Auth: an app created in the Shopify Dev Dashboard (scope write_discounts),
// installed on the store. Its client ID/secret are exchanged for a 24-hour
// Admin API token (client credentials grant). SHOPIFY_ADMIN_TOKEN, if set,
// is used instead — for stores that still have a legacy custom-app token.

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

let cachedToken = null; // { token, expiresAt }

function shopDomain() {
  const d = process.env.SHOPIFY_STORE_DOMAIN; // e.g. sn00zly.myshopify.com
  if (!d) throw new Error("SHOPIFY_STORE_DOMAIN is not set");
  return d.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

async function adminToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const res = await fetch(`https://${shopDomain()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SHOPIFY_CLIENT_ID || "",
      client_secret: process.env.SHOPIFY_CLIENT_SECRET || "",
    }),
  });
  if (!res.ok) throw new Error(`Shopify token request failed: ${res.status}`);
  const body = await res.json();
  cachedToken = {
    token: body.access_token,
    expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000,
  };
  return cachedToken.token;
}

async function adminGraphql(query, variables) {
  const res = await fetch(`https://${shopDomain()}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": await adminToken(),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify Admin API failed: ${res.status}`);
  return res.json();
}

function newCode() {
  // No 0/O/1/I so a code read off a phone screen is never ambiguous.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `PLANNER-${out}`;
}

const CREATE = `
mutation CreatePlannerCoupon($input: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $input) {
    codeDiscountNode { id }
    userErrors { field message }
  }
}`;

const DEACTIVATE = `
mutation DeactivatePlannerCoupon($id: ID!) {
  discountCodeDeactivate(id: $id) {
    userErrors { field message }
  }
}`;

/** Creates a single-use $15 code valid on any product. Returns { code, id }. */
export async function createPlannerCoupon({ email }) {
  const code = newCode();
  const body = await adminGraphql(CREATE, {
    input: {
      title: `Daily Planner buyer $${COUPON_VALUE} — ${email}`.slice(0, 255),
      code,
      startsAt: new Date().toISOString(),
      context: { all: "ALL" },
      customerGets: {
        value: { discountAmount: { amount: String(COUPON_VALUE), appliesOnEachItem: false } },
        items: { all: true },
      },
      usageLimit: 1,
      appliesOncePerCustomer: true,
    },
  });
  const errors = [
    ...(body.errors || []),
    ...(body.data?.discountCodeBasicCreate?.userErrors || []),
  ];
  const id = body.data?.discountCodeBasicCreate?.codeDiscountNode?.id;
  if (errors.length || !id) {
    throw new Error(`Shopify discount create rejected: ${JSON.stringify(errors).slice(0, 400)}`);
  }
  return { code, id };
}

/** Switches a buyer's code off (used after a full refund). */
export async function deactivatePlannerCoupon(id) {
  const body = await adminGraphql(DEACTIVATE, { id });
  const errors = [...(body.errors || []), ...(body.data?.discountCodeDeactivate?.userErrors || [])];
  if (errors.length) throw new Error(`Shopify deactivate rejected: ${JSON.stringify(errors).slice(0, 300)}`);
}
