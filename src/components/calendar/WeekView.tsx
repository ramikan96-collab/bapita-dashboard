"use client";

import { useMemo, useRef, useEffect, useCallback } from "react";
import {
  addDays, eachDayOfInterval, isSameDay, format,
} from "date-fns";
import { useLang } from "@/i18n";
import type { Booking, BlockedTime } from "@/types";
import { STATUS_COLOR } from "@/types";
import {
  PX_PER_HOUR, PX_PER_MIN, TOTAL_H, HOURS, GRID_LINE, GRID_LINE_HALF,
  timeToMins, firstName, packLanes, useGridGestures, useSwipe,
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
  onSelectDay: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function WeekView({
  date, bookings, blocked, openHour,
  onSelectBooking, onCreateAt, onLongPressAt, onBlockClick, onSelectDay, onPrev, onNext,
}: Props) {
  const { dateLocale } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekStart = date;
  const weekEnd   = addDays(date, 6);
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const today     = new Date();
  const nowMins   = today.getHours() * 60 + today.getMinutes();

  const swipe = useSwipe(onNext, onPrev);

  // Touchpad horizontal scroll → next/prev week (debounced 600ms).
  const lastWheelAt = useRef(0);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const now = Date.now();
      if (now - lastWheelAt.current > 600) {
        lastWheelAt.current = now;
        if (e.deltaX > 20) onNext();
        else if (e.deltaX < -20) onPrev();
      }
    }
  }, [onNext, onPrev]);

  // Bucket bookings + blocked by day key once.
  const byDay = useMemo(() => {
    const map: Record<string, { bookings: Booking[]; blocked: BlockedTime[] }> = {};
    for (const b of bookings) {
      (map[b.appointment_date] ??= { bookings: [], blocked: [] }).bookings.push(b);
    }
    for (const bl of blocked) {
      (map[bl.block_date] ??= { bookings: [], blocked: [] }).blocked.push(bl);
    }
    return map;
  }, [bookings, blocked]);

  // Auto-scroll: current time if today is in view, else opening hour.
  useEffect(() => {
    const now = new Date();
    const isCurrentWeek = days.some((d) => isSameDay(d, now));
    const target = isCurrentWeek
      ? Math.max(0, (now.getHours() * 60 + now.getMinutes()) * PX_PER_MIN - 32)
      : Math.max(0, openHour * PX_PER_HOUR - 32);
    scrollRef.current?.scrollTo({ top: target });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openHour, weekStart.getTime()]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overscroll-contain"
      style={{ background: "var(--color-cream)" }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
      onWheel={handleWheel}
    >
      {/* Sticky week strip */}
      <div
        className="sticky top-0 z-10 flex"
        style={{ height: 56, background: "var(--color-cream)", borderBottom: `1px solid var(--color-cream-2)` }}
      >
        {/* Prev arrow sits in the time-label column */}
        <button
          onClick={onPrev}
          className="shrink-0 flex items-center justify-center"
          style={{ width: 44, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)" }}
          aria-label="Previous week"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {days.map((day) => {
          const isToday    = isSameDay(day, today);
          const isSelected = isSameDay(day, date);
          const pill = isToday
            ? { background: "var(--color-amber)", color: "#fff" }
            : isSelected
              ? { background: "var(--color-dark)", color: "#fff" }
              : { background: "transparent", color: "var(--color-dark)" };
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
            >
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-muted)" }}>
                {format(day, "EEE", { locale: dateLocale })}
              </span>
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, fontSize: 15, fontWeight: 600, ...pill }}
              >
                {format(day, "d")}
              </span>
            </button>
          );
        })}
        {/* Next arrow */}
        <button
          onClick={onNext}
          className="shrink-0 flex items-center justify-center"
          style={{ width: 36, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)" }}
          aria-label="Next week"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Time grid */}
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

        {/* Day columns */}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const bucket = byDay[key];
          return (
            <WeekDayColumn
              key={key}
              day={day}
              isToday={isSameDay(day, today)}
              nowMins={nowMins}
              bookings={bucket?.bookings ?? []}
              blocked={bucket?.blocked ?? []}
              onSelectBooking={onSelectBooking}
              onCreateAt={onCreateAt}
              onLongPressAt={onLongPressAt}
              onBlockClick={onBlockClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Single day column ──────────────────────────────────────────────────────

interface ColProps {
  day: Date;
  isToday: boolean;
  nowMins: number;
  bookings: Booking[];
  blocked: BlockedTime[];
  onSelectBooking: (b: Booking) => void;
  onCreateAt: (date: Date, mins: number) => void;
  onLongPressAt: (date: Date, mins: number) => void;
  onBlockClick: (b: BlockedTime) => void;
}

function WeekDayColumn({
  day, isToday, nowMins, bookings, blocked,
  onSelectBooking, onCreateAt, onLongPressAt, onBlockClick,
}: ColProps) {
  const gestures = useGridGestures(
    (mins) => onCreateAt(day, mins),
    (mins) => onLongPressAt(day, mins),
  );

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
        const height = Math.max((timeToMins(bl.end_time) - start) * PX_PER_MIN, 18);
        return (
          <button
            key={bl.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onBlockClick(bl); }}
            className="absolute rounded-[6px] overflow-hidden text-start"
            style={{
              top, height, insetInlineStart: 2, insetInlineEnd: 2, zIndex: 4,
              background: "var(--color-cream-2)",
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(107,96,82,0.16) 0, rgba(107,96,82,0.16) 1px, transparent 1px, transparent 7px)",
            }}
          />
        );
      })}

      {/* Booking blocks */}
      {laid.map(({ item, lane, lanes }) => {
        const b = item.booking;
        const duration = b.service?.duration ?? 30;
        const top = item.start * PX_PER_MIN;
        const height = Math.max(duration * PX_PER_MIN, 24);
        const statusColor = STATUS_COLOR[b.status];
        const borderColor = b.label?.color ?? statusColor;
        const widthPct = 100 / lanes;
        const tall = height >= 48;
        const isPast = (!isToday && day < new Date()) ||
          (isToday && item.start + duration <= nowMins);
        return (
          <button
            key={b.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSelectBooking(b); }}
            className="absolute rounded-[6px] overflow-hidden text-start border-s-[3px] transition-opacity active:opacity-70"
            style={{
              top, height,
              insetInlineStart: `calc(${lane * widthPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              borderColor: borderColor,
              background: `${statusColor}14`,
              padding: "4px 6px",
              zIndex: 6,
              opacity: isPast ? 0.4 : 1,
            }}
          >
            <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: "var(--color-dark)" }}>
              {firstName(b.customer_name)}
            </div>
            {tall && b.service?.name && (
              <div className="text-[10px] leading-tight truncate" style={{ color: "var(--color-muted)" }}>
                {b.service.name}
              </div>
            )}
            {b.label && (
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: b.label.color }}
              />
            )}
          </button>
        );
      })}

      {/* Current-time indicator (today only) */}
      {isToday && (
        <div style={{ position: "absolute", top: nowMins * PX_PER_MIN, left: 0, right: 0, height: 2, background: "var(--color-amber)", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ position: "absolute", insetInlineStart: -3, top: -3, width: 8, height: 8, borderRadius: "50%", background: "var(--color-amber)" }} />
        </div>
      )}
    </div>
  );
}
