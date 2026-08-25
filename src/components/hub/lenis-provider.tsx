"use client";

import { type ReactNode, useEffect } from "react";
import Lenis from "lenis";
import { applyMotionAttribute, useMotionTier } from "@/lib/hub/motion";

declare global {
  interface Window {
    /** Set while Lenis is mounted. Use for any programmatic scroll. */
    __lenis?: Lenis;
  }
}

/**
 * Mounts Lenis inertial smooth-scroll once at the root and drives its rAF loop.
 *
 * Lenis is tier-2 motion: it retimes the whole page under the reader's thumb,
 * which is exactly the kind of thing Reduce Motion is asking us not to do. On
 * the calm tier native scroll stands in — but only the *smoothing* goes away,
 * not the effects that ride on scroll position.
 *
 * Also publishes the motion tier to `<html data-motion>` for the stylesheet,
 * and intercepts in-page anchor clicks so #section links scroll via Lenis.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const tier = useMotionTier();

  useEffect(() => {
    applyMotionAttribute(tier);
  }, [tier]);

  useEffect(() => {
    if (tier === "calm") return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Published so other components can scroll programmatically THROUGH Lenis.
    // Calling window.scrollTo() while Lenis is running fights it: Lenis keeps
    // animating toward its own target and the position oscillates.
    window.__lenis = lenis;

    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    function onAnchorClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest('a[href^="#"]');
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -72 });
    }

    document.addEventListener("click", onAnchorClick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onAnchorClick);
      lenis.destroy();
      delete window.__lenis;
    };
  }, [tier]);

  return <>{children}</>;
}
