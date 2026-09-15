// Shared URL helpers. Safe to import from client and server code.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://schedule.sn00zly.com").replace(/\/+$/, "");
export const SHOP_URL = "https://sn00zly.com";
export const PLANNER_PRICE = 4.99;
export const COUPON_VALUE = 15;
export const PRODUCT_NAME = "Sn00zly Daily Sleep Planner";

// Shopify applies a discount code from a link like
// https://shop/discount/CODE?redirect=/products/x — the code is already on the
// cart when the product page opens, so the member never has to copy it.
export function shopLinkWithCode(href, code, utmContent) {
  const target = new URL(href, SHOP_URL);
  target.searchParams.set("utm_source", "planner");
  target.searchParams.set("utm_medium", "app");
  target.searchParams.set("utm_campaign", "daily_planner");
  if (utmContent) target.searchParams.set("utm_content", utmContent);
  if (!code) return target.toString();
  const redirect = `${target.pathname}${target.search}`;
  return `${SHOP_URL}/discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent(redirect)}`;
}
