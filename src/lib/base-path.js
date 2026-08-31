// Set only on the Vercel deployment that sits behind the Shopify App Proxy
// (e.g. NEXT_PUBLIC_BASE_PATH=/apps/schedule). Empty string everywhere else
// (local dev, a plain Vercel URL) so nothing here changes behavior today.
// Must match next.config.mjs's basePath exactly — see README "Shopify App
// Proxy" section.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
