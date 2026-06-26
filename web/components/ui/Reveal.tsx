"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll-into-view reveal. Robust by construction:
 *  - animates in when scrolled into view (IntersectionObserver),
 *  - honors prefers-reduced-motion (shows immediately, no motion),
 *  - a safety timer guarantees content is NEVER stuck invisible even if the
 *    observer never fires.
 */
export function Reveal({
  children, delay = 0, className = "", y = 18,
}: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    // safety net: never let content remain hidden
    const t = window.setTimeout(() => setShown(true), 2200);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition:
          "opacity 0.6s var(--ease-out-expo), transform 0.6s var(--ease-out-expo)",
        transitionDelay: shown ? `${delay}s` : "0s",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
