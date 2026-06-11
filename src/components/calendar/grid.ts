"use client";

// Shared geometry + helpers for the day / week time grids.
// One source of truth so Day and Week views stay pixel-aligned.

import { useRef, useCallback } from "react";
import type { Business, DayKey } from "@/types";

export const PX_PER_HOUR = 64;
export const PX_PER_MIN = PX_PER_HOUR / 60;
export const DAY_MIN = 24 * 60;
export const TOTAL_H = DAY_MIN * PX_PER_MIN; // full 24h grid height
export const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

export const GRID_LINE = "rgba(30,26,20,0.10)";
export const GRID_LINE_HALF = "rgba(30,26,20,0.05)";

const DAY_KEYS: DayKey[] = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
];

export function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minsToTime(mins: number): string {
  const m = Math.max(0, Math.min(DAY_MIN - 1, Math.round(mins)));
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function snap(mins: number, step = 15): number {
  return Math.round(mins / step) * step;
}

export function formatRange(time: string, duration: number): string {
  const start = timeToMins(time);
  return `${minsToTime(start)} – ${minsToTime(start + duration)}`;
}

export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// Opening hour used for the auto-scroll target.
// Day view: that day's opening hour. Week view: earliest open day of the week.
export function openHourFor(business: Business | null, date?: Date): number {
  const hours = business?.business_hours;
  if (!hours) return 9;

  if (date) {
    const day = hours[DAY_KEYS[date.getDay()]];
    if (day?.open) return Math.floor(timeToMins(day.start) / 60);
    return 9;
  }

  // Week: min start across open days
  let min = 24;
  for (const key of DAY_KEYS) {
    const d = hours[key];
    if (d?.open) min = Math.min(min, Math.floor(timeToMins(d.start) / 60));
  }
  return min === 24 ? 9 : min;
}

// Greedy lane packing so overlapping blocks sit side-by-side in a column.
export function packLanes<T extends { start: number; end: number }>(
  items: T[],
): { item: T; lane: number; lanes: number }[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: { item: T; lane: number; lanes: number }[] = [];
  let cluster: { item: T; lane: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = cluster.reduce((m, c) => Math.max(m, c.lane + 1), 0);
    cluster.forEach((c) => out.push({ item: c.item, lane: c.lane, lanes }));
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) flush();
    const taken = new Set(cluster.filter((c) => c.item.end > item.start).map((c) => c.lane));
    let lane = 0;
    while (taken.has(lane)) lane++;
    cluster.push({ item, lane });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return out;
}

// Pointer interactions for an absolutely-positioned time column.
// Tap (quick release, no drag) → onTap(snappedMinutes)
// Long-press (500ms hold) → onLongPress(snappedMinutes)
// Children (booking/blocked blocks) stop propagation so they don't trigger these.
export function useGridGestures(
  onTap: (mins: number) => void,
  onLongPress: (mins: number) => void,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startY = useRef(0);
  const startMins = useRef(0);
  const longFired = useRef(false);
  const moved = useRef(false);

  const minsAt = (el: HTMLElement, clientY: number) => {
    const rect = el.getBoundingClientRect();
    return snap((clientY - rect.top) / PX_PER_MIN);
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return; // ignore taps on blocks
      longFired.current = false;
      moved.current = false;
      startY.current = e.clientY;
      startMins.current = minsAt(e.currentTarget, e.clientY);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        longFired.current = true;
        onLongPress(startMins.current);
      }, 500);
    },
    [onLongPress],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (Math.abs(e.clientY - startY.current) > 8) {
      moved.current = true;
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      if (e.target !== e.currentTarget) return;
      if (!longFired.current && !moved.current) onTap(startMins.current);
    },
    [onTap],
  );

  const onPointerLeave = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave };
}

// Lightweight horizontal swipe detector (for week/day navigation).
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const x0 = useRef(0);
  const y0 = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    x0.current = e.touches[0].clientX;
    y0.current = e.touches[0].clientY;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - x0.current;
      const dy = e.changedTouches[0].clientY - y0.current;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onLeft();
        else onRight();
      }
    },
    [onLeft, onRight],
  );
  return { onTouchStart, onTouchEnd };
}
