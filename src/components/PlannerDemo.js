"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { BASE_PATH } from "@/lib/base-path";

// Once per browser session, not once per mount — a visitor who scrolls the
// demo in and out of view (or revisits the page) shouldn't double-count.
const VIEW_TRACKED_KEY = "sn_demo_view_tracked";

export default function PlannerDemo() {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const viewTrackedRef = useRef(false);
  const completeTrackedRef = useRef(false);

  // matchMedia is client-only, so this starts false on the server and
  // corrects itself right after mount rather than in a lazy useState
  // initializer.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduced = false;
    }
    setReducedMotion(reduced);
    if (reduced) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    function markViewed() {
      if (viewTrackedRef.current) return;
      viewTrackedRef.current = true;
      try {
        if (window.sessionStorage.getItem(VIEW_TRACKED_KEY)) return;
        window.sessionStorage.setItem(VIEW_TRACKED_KEY, "1");
      } catch {
        // Private mode or blocked storage: track anyway, just without dedup.
      }
      trackEvent("demo_view");
    }

    function handleEnded() {
      if (completeTrackedRef.current) return;
      completeTrackedRef.current = true;
      trackEvent("demo_complete");
    }

    video.addEventListener("playing", markViewed);
    video.addEventListener("ended", handleEnded);

    // Plays only while at least half the video is on screen, so it never
    // burns data for a visitor scrolled past it.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("playing", markViewed);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleSound() {
    setMuted((current) => {
      if (current) trackEvent("demo_unmute");
      return !current;
    });
  }

  return (
    <div style={{ position: "relative", maxWidth: 460, margin: "0 auto" }}>
      <video
        ref={videoRef}
        muted={muted}
        loop
        playsInline
        preload="none"
        poster={`${BASE_PATH}/snoozly-planner-demo-poster.jpg`}
        width={1080}
        height={1350}
        style={{ width: "100%", height: "auto", maxWidth: 460, borderRadius: 24, margin: "0 auto", display: "block" }}
      >
        {reducedMotion ? null : <source src={`${BASE_PATH}/snoozly-planner-demo.mp4`} type="video/mp4" />}
      </video>
      {reducedMotion ? null : (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Sound on" : "Sound off"}
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            padding: "7px 13px",
            borderRadius: 999,
            border: "none",
            background: "rgba(0,0,0,.55)",
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {muted ? "Sound on" : "Sound off"}
        </button>
      )}
    </div>
  );
}
