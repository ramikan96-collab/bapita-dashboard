"use client";

import { useMemo, useRef, useEffect } from "react";
import { isSameDay, format } from "date-fns";
import { useLang } from "@/i18n";
import type { Booking, BlockedTime } from "@/types";
import { STATUS_COLOR } from "@/types";
import {
  PX_PER_HOUR, PX_PER_MIN, TOTAL_H, HOURS, GRID_LINE, GRID_LINE_HALF,
  timeToMins, formatRange, packLanes, useGridGestures, useSwipe,
} from "./grid";
import AgendaList from "./AgendaList";

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
  const { t, dateLocale } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const isToday = isSameDay(date, now);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const gestures = useGridGestures(
    (mins) => onCreateAt(date, mins),
    (mins) => onLongPressAt(date, mins),
  );
  const swipe = useSwipe(onNext, onPrev);

  // Auto-scroll: current time if viewing today, else opening hour.
  useEffect(() => {
    const today = new Date();
    const viewingToday = isSameDay(date, today);
    const target = viewingToday
      ? Math.max(0, (today.getHours() * 60 + today.getMinutes()) * PX_PER_MIN - 32)
      : Math.max(0, openHour * PX_PER_HOUR - 32);
    scrollRef.current?.scrollTo({ top: target });
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
      className="h-full flex flex-col"
      style={{ background: "var(--color-cream)" }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Sticky day nav header */}
      <div
        className="shrink-0 flex items-center sticky top-0 z-10"
        style={{ height: 52, background: "var(--color-cream)", borderBottom: "1px solid var(--color-cream-2)" }}
      >
        <button
          onClick={onPrev}
          style={{ width: 44, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", flexShrink: 0 }}
          aria-label="Previous day"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-dark)" }}>
            {format(date, "EEE, MMM d", { locale: dateLocale })}
          </span>
          {isToday && (
            <span style={{ marginInlineStart: 8, fontSize: 11, fontWeight: 700, background: "var(--color-amber)", color: "var(--color-surface)", padding: "1px 7px", borderRadius: 99 }}>
              {t("Today")}
            </span>
          )}
        </div>
        <button
          onClick={onNext}
          style={{ width: 44, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", flexShrink: 0 }}
          aria-label="Next day"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Time grid — independently scrollable */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
      <div className="flex" style={{ height: TOTAL_H }}>
        {/* Time labels */}
        <div className="shrink-0 relative" style={{ width: 44 }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute", top: h * PX_PER_HOUR - 6, insetInlineEnd: 6,
                fontSize: 12, color: "rgba(30,26,20,0.55)", fontWeight: 600,
              }}
            >
              {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Day column */}
        <div
          className="flex-1 relative border-s touch-pan-y"
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
            const statusColor = STATUS_COLOR[b.status];
            const borderColor = b.label?.color ?? statusColor;
            const widthPct = 100 / lanes;
            const tall = height >= 44;
            const isPast = (!isToday && date < new Date()) ||
              (isToday && item.start + duration <= nowMins);
            return (
              <button
                key={b.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onSelectBooking(b); }}
                className="absolute rounded-lg overflow-hidden text-start border-s-[3px] transition-opacity active:opacity-70"
                style={{
                  top, height,
                  insetInlineStart: `calc(${lane * widthPct}% + 4px)`,
                  width: `calc(${widthPct}% - 6px)`,
                  borderColor: borderColor,
                  background: `${statusColor}1f`,
                  boxShadow: "0 1px 2px rgba(28,25,23,0.06)",
                  padding: "6px 10px",
                  zIndex: 6,
                  opacity: isPast ? 0.45 : 1,
                }}
              >
                <div className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--color-dark)" }}>
                  {b.customer_name}
                </div>
                {tall && (
                  <div className="text-[11px] leading-tight truncate mt-0.5" style={{ color: "var(--color-muted)" }}>
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

      {/* Empty hint */}
      {bookings.length === 0 && blocked.length === 0 && (
        <div className="pointer-events-none sticky bottom-6 flex justify-center">
          <span className="text-[12px] px-3 py-1.5 rounded-full" style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}>
            {t("Tap a slot to book")} · {format(date, "EEE d MMM", { locale: dateLocale })}
          </span>
        </div>
      )}
      </div>{/* end time grid scroll */}

      {/* Agenda list for this day */}
      {bookings.length > 0 && (
        <div
          className="shrink-0 border-t"
          style={{
            borderColor: "var(--color-cream-2)",
            maxHeight: "40%",
            overflowY: "auto",
          }}
        >
          <AgendaList
            bookings={bookings}
            onSelectBooking={onSelectBooking}
          />
        </div>
      )}
    </div>
  );
}
