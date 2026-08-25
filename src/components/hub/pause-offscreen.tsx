"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Holds the CSS loop animations inside it while the group is off screen.
 *
 * The step panels each run a 6.4s `infinite` scene. Three of them compositing
 * continuously while the reader is four screens away is work nobody sees.
 *
 * Deliberately opt-OUT rather than opt-in: the class that pauses is only ever
 * added by this effect, so with no JS, a dead observer, or a hydration failure
 * the loops just run. `fx-row` starts at `opacity: 0`, so a paused-by-default
 * rule would leave the panels permanently blank — the same failure mode the
 * Reveal component is written to avoid.
 */
export function PauseOffscreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      ([entry]) => el.classList.toggle("fx-hold", !entry.isIntersecting),
      // A generous margin so the scenes are already mid-cycle by the time the
      // first card is actually readable, rather than snapping into motion.
      { rootMargin: "40% 0px 40% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
