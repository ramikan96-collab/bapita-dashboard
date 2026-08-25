"use client";

import {
  Children,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/hub/cn";
import { motionTier } from "@/lib/hub/motion";

/**
 * Scroll-triggered reveal — reliability-first.
 *
 * Content is VISIBLE BY DEFAULT (server render, no-JS, and if the observer never
 * fires). The fade+lift is a progressive enhancement layered on client-side: we
 * only hide an element once an IntersectionObserver is wired that will un-hide it,
 * and a fail-safe timer force-reveals if that observer ever stays silent.
 *
 * This is deliberate. The previous version set `opacity:0` up front and depended
 * entirely on framer-motion `whileInView` to restore it; when that trigger didn't
 * fire on mobile (touch scroll + Lenis + observer races) the content stayed
 * permanently invisible. Visibility must never be gated on an animation firing.
 */

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = 520; // ms
const DISTANCE = 16; // px lift
const FAILSAFE_MS = 1400; // content must never stay hidden past this

// useLayoutEffect on the client (applies the hidden state before first paint, so
// there's no flash), useEffect on the server (React would warn otherwise).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Phase = "static" | "hidden" | "shown";

function useRevealPhase(): {
  ref: React.RefObject<HTMLDivElement | null>;
  phase: Phase;
  calm: boolean;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");
  // Read once on mount rather than per render: a section already revealed must
  // not re-hide itself if the setting changes mid-page.
  const [calm, setCalm] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // The calm tier still reveals — it fades without the lift. Skipping the
    // reveal entirely is what left a Reduce Motion reader with a page where
    // nothing ever happened.
    setCalm(motionTier() === "calm");

    if (!("IntersectionObserver" in window)) {
      setPhase("shown");
      return;
    }

    // Arm: hide before paint, now that we know we can observe + reveal it.
    setPhase("hidden");

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setPhase("shown");
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            io.disconnect();
            break;
          }
        }
      },
      // threshold 0 + a small bottom margin fires as soon as the element edges
      // into view — works for elements taller than the viewport, unlike an
      // "N% of the element visible" threshold which such elements can never meet.
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);

    // Fail-safe for the mount race: if the element is already within the viewport
    // but the observer hasn't reported yet, reveal it. Scoped to in-view elements
    // so genuinely below-the-fold content still gets its scroll reveal (never
    // force-shown early) — visibility is only ever guaranteed for what's on screen.
    const timer = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < vh && rect.bottom > 0) reveal();
    }, FAILSAFE_MS);

    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return { ref, phase, calm };
}

function revealStyle(phase: Phase, delay = 0, calm = false): CSSProperties {
  if (phase === "static") return {};
  const shown = phase === "shown";
  // Calm keeps the fade and drops the 16px lift — the part that is travel.
  const lift = calm ? 0 : DISTANCE;
  return {
    opacity: shown ? 1 : 0,
    transform: shown || !lift ? "none" : `translateY(${lift}px)`,
    transition: `opacity ${DURATION}ms ${EASE} ${delay}ms, transform ${DURATION}ms ${EASE} ${delay}ms`,
    willChange: phase === "hidden" ? "opacity, transform" : undefined,
  };
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** delay before the reveal starts, in ms */
  delay?: number;
}

/** Fade + lift into view on scroll. Visible by default; motion is enhancement. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const { ref, phase, calm } = useRevealPhase();
  return (
    <div ref={ref} className={className} style={revealStyle(phase, delay, calm)}>
      {children}
    </div>
  );
}

// ---- Staggered variant --------------------------------------------------------

const STAGGER_MS = 80;

const StaggerContext = createContext<{
  phase: Phase;
  delay: number;
  calm: boolean;
}>({
  phase: "static",
  delay: 0,
  calm: false,
});

/** Parent that staggers its direct <RevealItem> children 80ms apart on scroll-in. */
export function RevealStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, phase, calm } = useRevealPhase();
  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) => (
        <StaggerContext.Provider value={{ phase, delay: i * STAGGER_MS, calm }}>
          {child}
        </StaggerContext.Provider>
      ))}
    </div>
  );
}

/** Direct child of <RevealStagger>. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { phase, delay, calm } = useContext(StaggerContext);
  return (
    <div className={cn(className)} style={revealStyle(phase, delay, calm)}>
      {children}
    </div>
  );
}
