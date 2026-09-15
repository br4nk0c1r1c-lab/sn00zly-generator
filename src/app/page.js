import SalesPage from "@/components/SalesPage";
import ScheduleGenerator from "@/components/ScheduleGenerator";
import { Brandmark, TopBar } from "@/components/BrandHeader";
import { PageShell } from "@/components/TrustCards";
import { BASE_PATH } from "@/lib/base-path";
import { hasSessionCookie } from "@/lib/membership";
import { verifiedShare } from "@/lib/share-link";
import { buildShareQuery } from "@/lib/share-params";
import { hmac } from "@/lib/signing";

function toUrlSearchParams(sp) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp || {})) {
    if (typeof v === "string") params.set(k, v);
    else if (Array.isArray(v) && v.length) params.set(k, v[0]);
  }
  return params;
}

export async function generateMetadata({ searchParams }) {
  const shared = verifiedShare(toUrlSearchParams(await searchParams));

  if (!shared) {
    return {
      title: "Sn00zly Daily Sleep Planner — today’s naps and bedtime for your baby",
      description:
        "Enter this morning's wake-up and get today's naps, wake windows and bedtime for your baby (0–24 months). $4.99 a month, cancel anytime.",
      alternates: { canonical: "/" },
      openGraph: {
        title: "Sn00zly Daily Sleep Planner",
        description: "Today's naps, wake windows and bedtime for your baby — in ten seconds.",
        images: [{ url: `${BASE_PATH}/api/og`, width: 1200, height: 630 }],
      },
    };
  }

  const name = shared.name || "a baby";
  const query = buildShareQuery(shared);
  const ogImage = `${BASE_PATH}/api/og?${query}&k=${hmac("share", query)}`;
  const title = `Today's sleep plan for ${name} — Sn00zly`;
  const description = `Naps, wake windows and bedtime for ${name}, from the Sn00zly Daily Sleep Planner.`;
  return {
    title,
    description,
    // Shared links carry the baby's name and birth date, so keep them out
    // of search results.
    robots: { index: false, follow: true },
    alternates: { canonical: "/" },
    openGraph: { title, description, images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

const CHECKOUT_NOTES = {
  canceled: "Checkout was closed and nothing was charged. The offer is still here whenever you are ready.",
  pending: "We couldn't confirm the payment yet. If you were charged, check your email for the sign-in link or use Member sign in.",
};

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const signedIn = await hasSessionCookie();
  const shared = verifiedShare(toUrlSearchParams(sp));
  const checkoutKey = typeof sp?.checkout === "string" ? sp.checkout : null;

  if (!shared) {
    return <SalesPage signedIn={signedIn} checkoutNote={CHECKOUT_NOTES[checkoutKey] || null} />;
  }

  return (
    <PageShell>
      <TopBar signedIn={signedIn} />
      <header className="app-head">
        <Brandmark />
        <div className="eyebrow">Shared from the Sn00zly Daily Sleep Planner</div>
      </header>
      <ScheduleGenerator mode="shared" initial={shared} />
    </PageShell>
  );
}
