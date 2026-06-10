"use client";

import { useMemo, useRef, useEffect } from "react";
import { isSameDay, format } from "date-fns";
import type { Booking, BlockedTime } from "@/types";
import { STATUS_COLOR } from "@/types";
import {
  PX_PER_HOUR, PX_PER_MIN, TOTAL_H, HOURS, GRID_LINE, GRID_LINE_HALF,
  timeToMins, formatRange, packLanes, useGridGestures, useSwipe,
} from "./grid";

interface Props {
  date: Date;
  bookings: Booking[];
  blocked: BlockedTime[];
  openHour: number;
  onSelectBooking: (b: Booking) => void;
  onCreateAt: (date: Date, mins: number) => void;
  onLongPressAt: (date: Date, mins: number) => void;
  onBlockClick: (b: BlockedTime) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function DayView({
  date, bookings, blocked, openHour,
  onSelectBooking, onCreateAt, onLongPressAt, onBlockClick, onPrev, onNext,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const isToday = isSameDay(date, now);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const gestures = useGridGestures(
    (mins) => onCreateAt(date, mins),
    (mins) => onLongPressAt(date, mins),
  );
  const swipe = useSwipe(onNext, onPrev);

  // Auto-scroll to opening hour on mount / day change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: Math.max(0, openHour * PX_PER_HOUR - 32) });
  }, [openHour, date]);

  const laid = useMemo(
    () =>
      packLanes(
        bookings.map((b) => {
          const start = timeToMins(b.appointment_time);
          return { start, end: start + (b.service?.duration ?? 30), booking: b };
        }),
      ),
    [bookings],
  );

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overscroll-contain"
      style={{ background: "var(--color-cream)" }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      <div className="flex" style={{ height: TOTAL_H }}>
        {/* Time labels */}
        <div className="shrink-0 relative" style={{ width: 44 }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute", top: h * PX_PER_HOUR - 6, insetInlineEnd: 6,
                fontSize: 11, color: "var(--color-muted)", fontWeight: 500,
              }}
            >
              {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Day column */}
        <div
          className="flex-1 relative border-s touch-none"
          style={{ borderColor: GRID_LINE, background: isToday ? "rgba(232,146,10,0.04)" : "transparent" }}
          {...gestures}
        >
          {/* Hour + half-hour lines */}
          {HOURS.map((h) => (
            <div key={h} style={{ pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: h * PX_PER_HOUR, left: 0, right: 0, height: 1, background: GRID_LINE }} />
              <div style={{ position: "absolute", top: h * PX_PER_HOUR + PX_PER_HOUR / 2, left: 0, right: 0, height: 1, background: GRID_LINE_HALF }} />
            </div>
          ))}

          {/* Blocked time blocks */}
          {blocked.map((bl) => {
            const start = timeToMins(bl.start_time);
            const top = start * PX_PER_MIN;
            const height = Math.max((timeToMins(bl.end_time) - start) * PX_PER_MIN, 24);
            return (
              <button
                key={bl.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onBlockClick(bl); }}
                className="absolute rounded-[6px] overflow-hidden text-start"
                style={{
                  top, height, insetInlineStart: 4, insetInlineEnd: 4, zIndex: 4,
                  background: "var(--color-cream-2)",
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(107,96,82,0.16) 0, rgba(107,96,82,0.16) 1px, transparent 1px, transparent 7px)",
                }}
              >
                {bl.label && (
                  <span className="px-2 text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>
                    {bl.label}
                  </span>
                )}
              </button>
            );
          })}

          {/* Booking blocks */}
          {laid.map(({ item, lane, lanes }) => {
            const b = item.booking;
            const duration = b.service?.duration ?? 30;
            const top = item.start * PX_PER_MIN;
            const height = Math.max(duration * PX_PER_MIN, 28);
            const color = STATUS_COLOR[b.status];
            const widthPct = 100 / lanes;
            const tall = height >= 44;
            return (
              <button
                key={b.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onSelectBooking(b); }}
                className="absolute rounded-[6px] overflow-hidden text-start border-s-[3px] transition-opacity active:opacity-70"
                style={{
                  top, height,
                  insetInlineStart: `calc(${lane * widthPct}% + 4px)`,
                  width: `calc(${widthPct}% - 6px)`,
                  borderColor: color,
                  background: `${color}14`,
                  padding: "4px 8px",
                  zIndex: 6,
                }}
              >
                <div className="text-[12px] font-semibold leading-tight truncate" style={{ color: "var(--color-dark)" }}>
                  {b.customer_name}
                </div>
                {tall && (
                  <div className="text-[11px] leading-tight truncate" style={{ color: "var(--color-muted)" }}>
                    {b.service?.name ? `${b.service.name} · ` : ""}{formatRange(b.appointment_time, duration)}
                  </div>
                )}
              </button>
            );
          })}

          {/* Current-time indicator */}
          {isToday && (
            <div style={{ position: "absolute", top: nowMins * PX_PER_MIN, left: 0, right: 0, height: 2, background: "var(--color-amber)", zIndex: 10, pointerEvents: "none" }}>
              <div style={{ position: "absolute", insetInlineStart: -4, top: -3, width: 8, height: 8, borderRadius: "50%", background: "var(--color-amber)" }} />
            </div>
          )}
        </div>
      </div>

      {/* Empty hint (non-blocking, floats over grid) */}
      {bookings.length === 0 && blocked.length === 0 && (
        <div className="pointer-events-none sticky bottom-6 flex justify-center">
          <span className="text-[12px] px-3 py-1.5 rounded-full" style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}>
            Tap a slot to book · {format(date, "EEE d MMM")}
          </span>
        </div>
      )}
    </div>
  );
}
