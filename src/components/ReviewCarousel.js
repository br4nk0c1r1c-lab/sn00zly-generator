"use client";

import { useEffect, useRef, useState } from "react";

const ROTATE_MS = 5000;

// Matches the live Judge.me widget on sn00zly.com: 38 five-star and 3
// four-star ratings. Most of those 41 are star-only with no written quote,
// so this is higher than REVIEWS.length below.
const TOTAL_REVIEW_COUNT = 41;
const AVERAGE_RATING = "4.92";

// Real reviews transcribed verbatim from the live Judge.me widget on
// sn00zly.com, rotated locally instead of pulled live.
const REVIEWS = [
  {
    quote:
      "I loved that I didn't need to sign up or spend forever figuring things out. I entered my baby's details and got an easy plan right away.",
    author: "Lauren P.",
  },
  {
    quote:
      "As a first-time mom, I was overwhelmed by all the conflicting sleep advice online. This tool made everything simple and easy to follow.",
    author: "Samantha K.",
  },
  {
    quote:
      "The most helpful part was seeing the entire day mapped out. It took so much stress out of planning our routine.",
    author: "Jennifer H.",
  },
  {
    quote:
      "We were struggling with early morning wake-ups. After following the recommended timing for naps and bedtime, mornings became much more manageable.",
    author: "Stephanie W.",
  },
  {
    quote:
      "This tool gave me confidence. Instead of guessing, I finally had a flexible plan that actually matched my baby's age and needs.",
    author: "Kristen F.",
  },
  {
    quote:
      "I love how quick it is. In less than a minute, I had a realistic schedule that helped bring structure back to our day.",
    author: "Danielle G.",
  },
  {
    quote:
      "My baby's naps were all over the place, and I felt like I was constantly behind. This planner helped me build a routine that actually works.",
    author: "Sarah L.",
  },
  {
    quote:
      "Such a simple tool, but such a big difference. It helped me understand my baby's sleep patterns and made our days feel so much calmer.",
    author: "Rebecca J.",
  },
  {
    quote:
      "My baby was getting overtired before bed and fighting sleep every night. This planner helped me adjust nap timing, and bedtime became so much easier.",
    author: "Heather M.",
  },
  {
    quote:
      "Working full-time means I need a predictable evening routine. This schedule helped us stop guessing and finally create a bedtime we can stick to.",
    author: "Jennifer R.",
  },
  {
    quote:
      "Our bedtime routine felt like complete chaos. The planner gave me a clear structure, and now my toddler actually seems ready for sleep when bedtime comes.",
    author: "Amanda C.",
  },
  {
    quote:
      "The biggest change was bedtime. We went from endless rocking and crying to a much calmer and quicker bedtime routine.",
    author: "Erica S.",
  },
  {
    quote:
      "I love knowing exactly when bedtime should happen instead of guessing every night. It's one less thing to stress about after a long day at work.",
    author: "Danielle P.",
  },
  {
    quote:
      "We were dealing with bedtime meltdowns every evening. Following the suggested wake windows completely changed the mood in our house.",
    author: "Nicole H.",
  },
  {
    quote:
      "Between work meetings and daycare pickup, I needed a realistic routine. This planner fit perfectly into our schedule and helped my baby settle much easier at night.",
    author: "Christina T.",
  },
  {
    quote:
      "I had read so many sleep articles and still couldn't figure out bedtime. This tool made it simple and gave me a schedule that actually worked.",
    author: "Stephanie L.",
  },
  {
    quote:
      "As a busy working mom, I appreciate anything that saves time. This planner helped us build a better schedule, and bedtime has become the easiest part of the day.",
    author: "Brittany G.",
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
        <div className="review-rating-row">
          <span className="review-stars" aria-hidden="true">★★★★★</span>
          <span>{AVERAGE_RATING} ({TOTAL_REVIEW_COUNT})</span>
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
