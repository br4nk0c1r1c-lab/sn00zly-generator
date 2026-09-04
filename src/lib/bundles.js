// Real Shopify "Complete Sleep Bundle" products, grouped into the same
// four age bands used for the Klaviyo baby_age_range property so the
// generator's upsell and the nurture-email segmentation stay in sync.
export const BUNDLES = [
  {
    maxMonths: 4,
    range: "0-3 months",
    displayRange: "0–3 months",
    href: "https://sn00zly.com/products/complete-sleep-bundle-0-3-months",
    price: 49,
    wasPrice: 72,
  },
  {
    maxMonths: 7,
    range: "4-6 months",
    displayRange: "4–6 months",
    href: "https://sn00zly.com/products/sn00zly-complete-sleep-bundle-4-6-months",
    price: 49,
    wasPrice: 72,
  },
  {
    maxMonths: 13,
    range: "7-12 months",
    displayRange: "7–12 months",
    href: "https://sn00zly.com/products/sn00zly-complete-sleep-bundle-7-12-months",
    price: 49,
    wasPrice: 72,
  },
  {
    maxMonths: Infinity,
    range: "12-24 months",
    displayRange: "12–24 months",
    href: "https://sn00zly.com/products/sn00zly-complete-sleep-bundle-12-24-months",
    price: 49,
    wasPrice: 79,
  },
];

export function bundleForWeeks(weeks) {
  const months = weeks / 4.345;
  return BUNDLES.find((b) => months < b.maxMonths) ?? BUNDLES[BUNDLES.length - 1];
}
