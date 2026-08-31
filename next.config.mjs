// NEXT_PUBLIC_BASE_PATH is set only on the Vercel deployment that sits
// behind the Shopify App Proxy (e.g. "/apps/schedule"). See
// src/lib/base-path.js and README "Shopify App Proxy" for the full setup.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
};

export default nextConfig;
