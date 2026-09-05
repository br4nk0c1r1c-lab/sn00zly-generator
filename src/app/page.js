import ReviewCarousel from "@/components/ReviewCarousel";
import ScheduleGenerator from "@/components/ScheduleGenerator";
import { BASE_PATH } from "@/lib/base-path";
import { buildShareQuery, parseShareSearchParams } from "@/lib/share-params";

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const { name, dob, wake, struggle } = parseShareSearchParams(sp);
  const hasShare = Boolean(name && dob && wake);

  const title = hasShare
    ? `A starting schedule for ${name} — Sn00zly`
    : "Sn00zly Sleep Schedule Generator";
  const description = hasShare
    ? `A flexible starting schedule for ${name}, built from age and this morning's wake-up. Free, no signup.`
    : "Free baby sleep schedule generator. Four questions, and a starting schedule for naps and bedtime built from your baby's age and this morning's wake-up.";

  const query = buildShareQuery({ name, dob, wake, struggle });
  const ogImage = `${BASE_PATH}/api/og${query ? `?${query}` : ""}`;

  return {
    title,
    description,
    // Shared links carry the baby's name and birth date in the URL so the
    // schedule can recompute as the baby ages. Keeping those out of search
    // results and always pointing search engines back at the plain
    // generator avoids indexing personal data.
    robots: hasShare ? { index: false, follow: true } : undefined,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

function ClinicalReviewCard() {
  return (
    <div className="side-card">
      <div className="side-card-label">Clinically reviewed</div>
      <p>
        Every Sn00zly guide is reviewed for clinical accuracy by a
        board-certified pediatrician.
      </p>
      <a
        href="https://sn00zly.com/pages/medical-review"
        target="_blank"
        rel="noopener noreferrer"
        className="side-card-link"
      >
        Read the review letter →
      </a>
    </div>
  );
}

function ReviewsCard() {
  return (
    <div className="side-card">
      <div className="side-card-label">What parents say</div>
      {/* Judge.me's live widget needs their paid cross-platform plan
          (the Shopify Liquid snippet only resolves inside a Shopify
          theme). Until then, this rotates real reviews transcribed
          from the live Judge.me widget on sn00zly.com — see
          src/components/ReviewCarousel.js to update the quotes. */}
      <ReviewCarousel />
    </div>
  );
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const initial = parseShareSearchParams(sp);

  return (
    <div className="page-shell">
      <aside className="side-rail" aria-label="Customer reviews">
        <div className="side-rail-sticky">
          <ReviewsCard />
        </div>
      </aside>

      <div className="wrap">
        <header className="app-head">
          <a className="brandmark" href="https://sn00zly.com">
            <svg
              className="moon"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20.5 14.6A8.7 8.7 0 0 1 9.4 3.5a8.7 8.7 0 1 0 11.1 11.1Z"
                fill="currentColor"
              />
              <circle cx="17.5" cy="5.5" r="1.3" fill="#C9A463" />
            </svg>
            Sn00zly
          </a>
          <div className="eyebrow">Free Sleep Schedule Generator</div>
          <h1>Build Your Baby&apos;s Sleep Schedule for Today</h1>
          <p className="lede">
            Enter your baby&apos;s age and today&apos;s wake-up time. We&apos;ll
            map out naps, wake windows and bedtime in seconds.
          </p>
          <div className="trustline">
            <span className="chip-trust">Built from pediatrician-reviewed guides</span>
            <span className="chip-trust">No signup</span>
            <span className="chip-trust">Free</span>
          </div>
        </header>

        <ScheduleGenerator initial={initial} />

        <div className="mobile-trust-stack">
          <ReviewsCard />
          <ClinicalReviewCard />
        </div>
      </div>

      <aside className="side-rail" aria-label="Clinical review">
        <div className="side-rail-sticky">
          <ClinicalReviewCard />
        </div>
      </aside>
    </div>
  );
}
