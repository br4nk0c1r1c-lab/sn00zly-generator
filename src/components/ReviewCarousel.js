"use client";

import { useEffect, useRef, useState } from "react";

const ROTATE_MS = 5000;

// Judge.me stays a Shopify-only widget until the paid cross-platform plan is
// active. Until then these are real reviews transcribed verbatim from the
// live Judge.me widget on sn00zly.com, rotated locally instead of pulled live.
const REVIEWS = [
  {
    quote:
      "As a mom of a 5 months old, I was compleatly exausted and overwhelmed by the sleep struggles we were going through. This guide made me feel like I wasn't alone. It helped me understand my baby's sleep regression, gave me gentle, practical advic…",
    author: "Misha C.",
    guide: "Baby Sleep Guide 4–6 Months",
  },
  {
    quote:
      "Life-saver for the 18-month sleep regression! Capping naps at 2 hours and holding the bedtime routine boundary brought back quiet nights. Worth it for exhausted parents.",
    author: "Anonymous",
    guide: "Toddler Sleep Guide 12–24 Months",
  },
  {
    quote:
      "The Sn00zly Newborn Sleep Guide 0–3 Months is SO comprehensive! I love that it covers more than just sleep—it also gives helpful wake window recommendations, which made it so much easier to understand when my baby was ready for sleep. It'…",
    author: "Lynn S.",
    guide: "Newborn Sleep Guide 0–3 Months",
  },
  {
    quote:
      "I really like this guide, it helped us set routine for our baby girl and greatly improved her night sleep hours and daily naps. For sure we will continue using Sn00zly as our companion for good sleep in the future. Thank you ❤️",
    author: "Ana C.",
    guide: "Baby Sleep Guide 7–12 Months",
  },
];

export default function ReviewCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused || REVIEWS.length <= 1) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % REVIEWS.length);
    }, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  const current = REVIEWS[index];

  return (
    <div
      className="review-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="review-carousel-header">
        <h3>Reviews</h3>
        <div className="review-rating-row">
          <span className="review-stars" aria-hidden="true">★★★★★</span>
          <span>5.00 ({REVIEWS.length})</span>
          <span className="review-verified">✓ Verified</span>
        </div>
      </div>
      <div className="review-carousel-track" role="tablist" aria-label="Reviews">
        <div className="review-card" key={index}>
          <div className="review-quote-mark" aria-hidden="true">
            &rdquo;
          </div>
          <p className="review-quote-text">{current.quote}</p>
          <div className="review-card-stars" aria-hidden="true">★★★★★</div>
          <div className="review-author">
            {current.author} <span className="review-author-badge">✓</span>
          </div>
          <span className="review-guide-label">{current.guide}</span>
        </div>
      </div>
      {REVIEWS.length > 1 ? (
        <div className="review-carousel-dots">
          {REVIEWS.map((r, i) => (
            <button
              key={r.author + i}
              type="button"
              role="tab"
              className="review-carousel-dot"
              aria-label={`Show review ${i + 1}`}
              aria-selected={i === index}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
