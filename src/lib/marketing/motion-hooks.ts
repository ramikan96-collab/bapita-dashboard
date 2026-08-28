"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useCalmMotion } from "@/lib/hub/motion";

/**
 * The three behaviours the "What we build" cards and the add-ons section share:
 * notice when you are actually being looked at, count a number up once you are,
 * and demonstrate yourself until the reader takes over.
 *
 * They live together because they are one idea — a surface that plays only
 * while it is being watched — and because all three share a failure mode if
 * written casually: content that never arrives because an observer never fired.
 * So every one of them has a resting state that is CORRECT with no JS (in view
 * resolves true if it cannot be observed, the counters are already the final
 * figure in the markup, the cycle sits on index 0), and motion is layered over
 * the top of that.
 */

/* ── In view ──────────────────────────────────────────────────── */

interface InViewOptions {
  /** Stop observing after the first intersection. Default true. */
  once?: boolean;
  rootMargin?: string;
}

/** Content must never be gated on this — use it only to start motion. */
export function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { once = true, rootMargin = "0px 0px -12% 0px" }: InViewOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // `typeof`, not `"IntersectionObserver" in window`: the property IS on the
    // Window type, so TS narrows the negative branch of an `in` check to never.
    if (typeof window.IntersectionObserver === "undefined") {
      // Through a task rather than straight from the effect body: a synchronous
      // setState here is a second render pass before the browser has painted
      // the first one.
      const t = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(t);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: 0, rootMargin },
    );
    io.observe(el);

    // Same fail-safe <Reveal> carries, for the same reason: if the element is
    // already on screen at mount and the observer hasn't reported yet, start
    // anyway. Scoped to elements actually in the viewport so content further
    // down still gets its scroll trigger.
    const timer = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < vh && rect.bottom > 0) setInView(true);
    }, 1400);

    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [ref, once, rootMargin]);

  return inView;
}

/* ── Section progress ─────────────────────────────────────────── */

/**
 * Calls back with 0→1 as a pinned section scrolls past, once per frame.
 *
 * Deliberately a callback rather than state: the callers write the result
 * straight into the DOM (a counter's text, a bar's width, a transform), and
 * re-rendering React sixty times a second to move a number is how a scroll
 * sequence starts dropping frames. The steps that DO need state — which tab,
 * which switches — guard on the value changing first.
 *
 * `enabled` false unsubscribes entirely — no loop, nothing left running — which
 * is what a section gets whenever its layout is not the pinned one.
 *
 * ── Driven from BOTH a scroll listener and an rAF loop, on purpose ──
 *
 * Each one alone has a failure mode that makes the section look broken, and
 * they are not the same failure mode:
 *
 *   A scroll listener misses Lenis. Lenis owns the scroll on this page and
 *   drives it by writing scroll positions itself, so the listener can sit at
 *   whatever value it had on mount — `band.tsx` hit this first and grew its own
 *   loop because of it.
 *
 *   An rAF loop misses whenever rAF is not running. The browser suspends it in
 *   a backgrounded or occluded tab and throttles it under low-power conditions.
 *   A section whose only clock is rAF is inert exactly then, and the page it is
 *   on has no other way to find out that the reader moved.
 *
 * So: the rAF loop is the steady clock, and scroll/resize additionally poke
 * `read()` directly, which is what makes the first frame after any of those
 * events correct rather than up-to-one-frame stale. Both funnel through the
 * same guarded read, so double-driving costs one extra rect measurement and
 * never a duplicate callback — `last` throws away anything that has not moved.
 *
 * The read is skipped entirely while the section is nowhere near the viewport,
 * so the cost is paid only by the section you are actually looking at.
 */
export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onProgress: (p: number) => void,
): void {
  const cb = useRef(onProgress);

  useEffect(() => {
    cb.current = onProgress;
  });

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    let frame = 0;
    let last = Number.NaN;

    const read = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Off screen in either direction: nothing to report, and the endpoint
      // value has already been delivered by the read that left the range.
      if (rect.bottom < -vh || rect.top > vh) return;
      const scrollable = rect.height - vh;
      const p =
        scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      // Sub-pixel churn is not information. The guard is what keeps a section
      // that is merely visible from re-running its callback sixty times a
      // second while the page is still, and it is also what makes it safe for
      // the scroll listener and the loop to both call this.
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      cb.current(p);
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      read();
    };

    read();
    frame = requestAnimationFrame(tick);
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [ref, enabled]);
}

/**
 * True once the viewport is wide enough for a pinned scroll sequence.
 *
 * Starts false so the server renders the unpinned layout: a hijacked scroll
 * arriving before hydration is how a section becomes impossible to get past.
 *
 * `minWidth` is per-caller and, since 2026-08-28, most callers pass 0 — the
 * phone pins too.
 *
 * ── Why the calm tier no longer switches this off ──
 *
 * It used to return false whenever Reduce Motion was on, which made an OS
 * accessibility setting the difference between a page that works and a page
 * where four of its sections silently do nothing. That is not a graceful
 * degradation, it is a second product — and it is the one a third of iOS users
 * would have been getting.
 *
 * It was also inconsistent with the two pinned things on this page that never
 * consulted the tier at all: the hero scene pins on both tiers, and the
 * how-it-works deck is CSS `position: sticky` with no JS gate anywhere near it.
 * Those two are the precedent, not the exception.
 *
 * The reduction still happens — it just happens to the MOTION rather than to
 * the layout, which is what WCAG 2.3.3 is actually asking for. On the calm tier
 * the falafels are set down instead of falling on an arc, the card loops fade
 * instead of sliding, the marquees and float loops stop entirely, the display
 * word travels ~7px instead of a strip height, and Lenis hands the scroll back
 * to the browser. All of that lives in `globals.css` under `[data-motion=calm]`
 * and in the components' own `calm` branches. A pinned section is the page
 * scrolling past a fixed thing; it is not motion played at the reader.
 */
export function usePinned(minWidth = 1024): boolean {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const check = () => setPinned(window.innerWidth >= minWidth);
    const id = window.setTimeout(check, 0);
    window.addEventListener("resize", check);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", check);
    };
  }, [minWidth]);

  return pinned;
}

/* ── Count up ─────────────────────────────────────────────────── */

/**
 * Eases a number from zero to `target` the first time `active` turns true.
 *
 * Writes `textContent` through a ref rather than returning state, which is what
 * lets the FINAL figure be what's actually in the HTML. A counter rendered from
 * state ships `0` to a reader whose JS never runs, and a marketing page that
 * claims ₪0 of revenue is worse than one that doesn't animate.
 *
 * Settles straight on `target` on the calm tier: a figure climbing on its own
 * is unrequested motion, and the number is the information either way.
 *
 * `format` is an effect dependency, so pass a module-level function rather than
 * an inline arrow — an inline one restarts the count on every parent render.
 */
export function useCountUp(
  target: number,
  {
    active,
    format,
    durationMs = 1500,
  }: { active: boolean; format: (n: number) => string; durationMs?: number },
): RefObject<HTMLSpanElement | null> {
  const ref = useRef<HTMLSpanElement>(null);
  const calm = useCalmMotion();
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || played.current) return;
    if (!active) {
      // Arm: hold at zero until the card is looked at. Only ever done once JS
      // is running and the animation below is guaranteed to follow.
      if (!calm) el.textContent = format(0);
      return;
    }
    played.current = true;

    if (calm) {
      el.textContent = format(target);
      return;
    }

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      // easeOutExpo — quick off the line, long settle. Reads as a figure
      // landing rather than a slot machine spinning down.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -9 * t);
      el.textContent = format(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, calm, target, durationMs, format]);

  return ref;
}

/* ── Auto cycle ───────────────────────────────────────────────── */

interface CycleOptions {
  /** Container to watch: the demo only runs while this is on screen. */
  ref: RefObject<HTMLElement | null>;
  /** ms per step. */
  intervalMs?: number;
}

interface Cycle {
  index: number;
  /** Take it over. Stops the automatic advance for good. */
  select: (i: number) => void;
  /** Still driving itself — drives the progress hairline. */
  auto: boolean;
}

/**
 * Advances an index on a timer while the section is on screen, and hands
 * control over permanently the first time the reader picks a step.
 *
 * Held on the calm tier. An interface that changes under you with no input is
 * the most disorienting thing a page can do to someone with a vestibular
 * disorder; there, the tabs are simply tabs.
 */
export function useAutoCycle(
  length: number,
  { ref, intervalMs = 4200 }: CycleOptions,
): Cycle {
  const calm = useCalmMotion();
  const visible = useInView(ref, { once: false, rootMargin: "0px" });
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || calm || !visible || length < 2) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % length),
      intervalMs,
    );
    return () => window.clearInterval(id);
  }, [auto, calm, visible, length, intervalMs]);

  const select = useCallback((i: number) => {
    setAuto(false);
    setIndex(i);
  }, []);

  return { index, select, auto: auto && !calm && visible };
}

/**
 * The same contract for a set of independent switches that demonstrate
 * themselves: one flips every `intervalMs` until the reader touches any of
 * them, after which they are ordinary controls.
 *
 * `initial` is the resting state, and should normally be everything ON — a
 * panel of dead switches is not what the section is selling.
 */
export function useAutoToggles(
  ids: readonly string[],
  {
    ref,
    intervalMs = 1900,
    initial = {},
  }: CycleOptions & { initial?: Record<string, boolean> },
): {
  on: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
  auto: boolean;
} {
  const calm = useCalmMotion();
  const visible = useInView(ref, { once: false, rootMargin: "0px" });
  const [state, setState] = useState<Record<string, boolean>>(initial);
  const [auto, setAuto] = useState(true);
  const step = useRef(0);

  useEffect(() => {
    if (!auto || calm || !visible || ids.length === 0) return;
    const id = window.setInterval(() => {
      const i = step.current % ids.length;
      step.current += 1;
      setState((cur) => ({ ...cur, [ids[i]]: !cur[ids[i]] }));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [auto, calm, visible, ids, intervalMs]);

  const toggle = useCallback((id: string) => {
    setAuto(false);
    setState((cur) => ({ ...cur, [id]: !cur[id] }));
  }, []);

  return {
    on: (id: string) => Boolean(state[id]),
    toggle,
    count: ids.reduce((n, id) => n + (state[id] ? 1 : 0), 0),
    auto: auto && !calm && visible,
  };
}
