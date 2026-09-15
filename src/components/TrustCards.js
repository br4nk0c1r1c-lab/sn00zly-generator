import ReviewCarousel from "@/components/ReviewCarousel";

export function ClinicalReviewCard() {
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

export function ReviewsCard() {
  return (
    <div className="side-card">
      <div className="side-card-label">What parents say</div>
      {/* Real reviews transcribed from the live Judge.me widget on
          sn00zly.com — see src/components/ReviewCarousel.js. */}
      <ReviewCarousel />
    </div>
  );
}

export function PageShell({ children }) {
  return (
    <div className="page-shell">
      <aside className="side-rail" aria-label="Customer reviews">
        <div className="side-rail-sticky">
          <ReviewsCard />
        </div>
      </aside>
      <div className="wrap">
        {children}
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
