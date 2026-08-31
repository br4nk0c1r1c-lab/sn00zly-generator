"use client";

import { useEffect, useRef, useState } from "react";

const ROTATE_MS = 5000;

// Judge.me stays a Shopify-only widget until the paid cross-platform plan is
// active. Until then this rotates static screenshots of real reviews (also
// shown on sn00zly.com) instead of live-pulling them.
const REVIEW_IMAGES = [
  { src: "/reviews/placeholder-1.svg", alt: "Customer review screenshot" },
  { src: "/reviews/placeholder-2.svg", alt: "Customer review screenshot" },
  { src: "/reviews/placeholder-3.svg", alt: "Customer review screenshot" },
];

export default function ReviewCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused || REVIEW_IMAGES.length <= 1) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % REVIEW_IMAGES.length);
    }, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  return (
    <div
      className="review-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="review-carousel-track">
        {REVIEW_IMAGES.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- static local screenshots, no next/image benefit
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            className="review-carousel-img"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}
      </div>
      {REVIEW_IMAGES.length > 1 ? (
        <div className="review-carousel-dots" role="tablist" aria-label="Reviews">
          {REVIEW_IMAGES.map((img, i) => (
            <button
              key={img.src}
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
