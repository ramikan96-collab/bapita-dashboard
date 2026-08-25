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
 * `enabled` false unsubscribes entirely, which is what the phone and the calm
 * tier get: no pinning, no scroll handler, no listener left running.
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
    const apply = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const p =
        scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      cb.current(p);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, enabled]);
}

/**
 * True once the viewport is wide enough and the reader has not asked for calm
 * motion — the two conditions every pinned scroll sequence on this page shares.
 *
 * Starts false so the server renders the unpinned layout: a hijacked scroll
 * that arrives before hydration, or on a phone, is how a section becomes
 * impossible to get past.
 */
export function usePinned(minWidth = 1024): boolean {
  const calm = useCalmMotion();
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const check = () => setPinned(!calm && window.innerWidth >= minWidth);
    const id = window.setTimeout(check, 0);
    window.addEventListener("resize", check);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", check);
    };
  }, [calm, minWidth]);

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
