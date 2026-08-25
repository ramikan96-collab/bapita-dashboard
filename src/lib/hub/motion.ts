"use client";

import { useSyncExternalStore } from "react";

/**
 * Two tiers of motion, not an on/off switch.
 *
 * `prefers-reduced-motion` was being read as "animate nothing", which left a
 * Reduce Motion visitor with a completely inert page: no hero sequence, no
 * display-line wipe, no card loops, no reveals. That is not what the setting
 * asks for. WCAG 2.3.3 and Apple's own guidance are about *large-scale* motion —
 * travel across the screen, parallax, zoom, spin — because that is what triggers
 * vestibular symptoms. A colour change, a cross-fade, or a few pixels of lift
 * are fine, and a third of iOS users have the setting on.
 *
 * So:
 *
 *   "full" — everything. Falling falafels, Lenis smoothing, pinned scenes,
 *            the display word riding out through the bottom of its strip.
 *   "calm" — opacity, colour, clip-path wipes, cross-fades, ≤8px of travel.
 *            Same story, same beats, none of the sweep.
 *
 * Read through `useSyncExternalStore` rather than effect-set state: the value
 * decides whether a section is a pinned scroll sequence or a single static
 * screen, and getting it wrong for one frame reflows the page under the reader.
 */

export type MotionTier = "full" | "calm";

const MQ = "(prefers-reduced-motion: reduce)";

/**
 * Dev-only override, so both tiers are testable without touching the OS
 * setting — there is no way to emulate `prefers-reduced-motion` from a page,
 * and the browser harness we check phone widths in cannot fake it either.
 * `?motion=calm` / `?motion=full`. Compiled out of production builds.
 */
function override(): MotionTier | null {
  if (process.env.NODE_ENV === "production") return null;
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("motion");
  return v === "calm" || v === "full" ? v : null;
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function snapshot(): MotionTier {
  return override() ?? (window.matchMedia(MQ).matches ? "calm" : "full");
}

/** Server render assumes full motion; the first client render corrects it. */
function serverSnapshot(): MotionTier {
  return "full";
}

export function useMotionTier(): MotionTier {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** Convenience for the common `tier === "calm"` check. */
export function useCalmMotion(): boolean {
  return useMotionTier() === "calm";
}

/**
 * Non-hook read, for the one caller that runs inside an effect (`band.tsx`)
 * rather than during render.
 */
export function motionTier(): MotionTier {
  if (typeof window === "undefined") return "full";
  return snapshot();
}

/**
 * Mirrors the tier onto `<html data-motion>` so CSS can key off the same
 * decision the components do.
 *
 * The stylesheet still carries a plain `prefers-reduced-motion` block for the
 * no-JS case, scoped `:root:not([data-motion="full"])` so the dev override can
 * opt back out of it. Without this the `?motion=` param would move the
 * JS-driven scenes and leave every CSS loop on the other tier.
 */
export function applyMotionAttribute(tier: MotionTier) {
  document.documentElement.dataset.motion = tier;
}
