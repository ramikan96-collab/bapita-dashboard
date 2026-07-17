"use client";

import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import {
  addDays, eachDayOfInterval, isSameDay, format,
} from "date-fns";
import { useLang } from "@/i18n";
import type { Booking, BlockedTime, Business } from "@/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/types";
import {
  PX_PER_HOUR, PX_PER_MIN, TOTAL_H, DAY_MIN, HOURS, GRID_LINE, GRID_LINE_HALF,
  timeToMins, minsToTime, snap, formatRange, packLanes, useGridGestures, useSwipe, dayIsOpen,
} from "./grid";

interface Props {
  date: Date;
  bookings: Booking[];
  blocked: BlockedTime[];
  openHour: number;
  business: Business | null;
  onSelectBooking: (b: Booking) => void;
  onCreateAt: (date: Date, mins: number) => void;
  onLongPressAt: (date: Date, mins: number) => void;
  onBlockClick: (b: BlockedTime) => void;
  onSelectDay: (d: Date) => void;
  onRescheduleDrop: (booking: Booking, newDate: string, newTime: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

interface DragState {
  booking: Booking;
  dayKey: string;
  mins: number;
  colLeft: number;
  colTop: number;
  colWidth: number;
}

export default function WeekView({
  date, bookings, blocked, openHour, business,
  onSelectBooking, onCreateAt, onLongPressAt, onBlockClick, onSelectDay, onRescheduleDrop, onPrev, onNext,
}: Props) {
  const { t, dateLocale } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekStart = date;
  const weekEnd   = addDays(date, 6);
  const allDays   = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const today     = new Date();
  const nowMins   = today.getHours() * 60 + today.getMinutes();

  const swipe = useSwipe(onNext, onPrev);

  // ─── Long-hold drag-to-reschedule ─────────────────────────────────────────
  // Column + week-strip DOM nodes, keyed by yyyy-MM-dd, for pointer hit-testing
  // (works in both LTR and RTL because we test against live element rects).
  const colEls = useRef<Map<string, HTMLElement>>(new Map());
  const stripEls = useRef<Map<string, HTMLElement>>(new Map());
  const registerCol = useCallback((key: string, el: HTMLElement | null) => {
    if (el) colEls.current.set(key, el); else colEls.current.delete(key);
  }, []);

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const justDragged = useRef(false);

  // Which day (and, via the strip, whether time is preserved) is under the pointer.
  const hitTest = useCallback((cx: number, cy: number): { dayKey: string; viaStrip: boolean } | null => {
    for (const [k, el] of stripEls.current) {
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return { dayKey: k, viaStrip: true };
    }
    for (const [k, el] of colEls.current) {
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right) return { dayKey: k, viaStrip: false };
    }
    return null;
  }, []);

  const beginGrab = useCallback((booking: Booking, originKey: string, e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    const pointerId = e.pointerId;
    const startEl = e.currentTarget;
    const x0 = e.clientX, y0 = e.clientY;
    const duration = booking.service?.duration ?? 30;
    let grabbed = false;

    const update = (cx: number, cy: number) => {
      const hit = hitTest(cx, cy);
      const dayKey = hit?.dayKey ?? originKey;
      const col = colEls.current.get(dayKey);
      const r = col ? col.getBoundingClientRect() : { top: 0, left: 0, width: 0 };
      const mins = hit?.viaStrip
        ? timeToMins(booking.appointment_time) // strip drop → keep time, change date
        : Math.max(0, Math.min(DAY_MIN - duration, snap((cy - r.top) / PX_PER_MIN)));
      const next: DragState = { booking, dayKey, mins, colLeft: r.left, colTop: r.top, colWidth: r.width };
      dragRef.current = next;
      setDrag(next);
    };

    const onMove = (ev: PointerEvent) => {
      if (!grabbed) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) cleanup(); // scroll intent → abort
        return;
      }
      update(ev.clientX, ev.clientY);
    };
    const onUp = () => {
      clearTimeout(timer);
      if (grabbed) {
        const g = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        justDragged.current = true;
        if (g) {
          const newTime = minsToTime(g.mins);
          if (g.dayKey !== booking.appointment_date || newTime !== booking.appointment_time) {
            onRescheduleDrop(booking, g.dayKey, newTime);
          }
        }
      }
      cleanup();
    };
    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      try { startEl.releasePointerCapture(pointerId); } catch { /* noop */ }
    }

    const timer = setTimeout(() => {
      grabbed = true;
      try { startEl.setPointerCapture(pointerId); } catch { /* noop */ }
      navigator.vibrate?.(15);
      update(x0, y0);
    }, 400);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [hitTest, onRescheduleDrop]);

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

  // Columns = the business's OPEN days only, so closing a day widens the grid
  // (7 → 6 → 5 …) and names get room. A booking on a closed day still shows in
  // Day view / Agenda / Search, so nothing is lost. Fall back to all 7 if the
  // business has no open days configured (misconfig / brand-new).
  const weekStartMs = weekStart.getTime();
  const days = useMemo(() => {
    const kept = allDays.filter((d) => dayIsOpen(business, d));
    return kept.length ? kept : allDays;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartMs, business]);

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
      className="h-full overflow-y-auto overscroll-contain bg-[var(--color-surface)] md:bg-[var(--color-cream)]"
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
      onWheel={handleWheel}
    >
      {/* Sticky week strip */}
      <div
        className="sticky top-0 z-10 flex bg-[var(--color-surface)] md:bg-[var(--color-cream)]"
        style={{ height: 56, borderBottom: `1px solid var(--color-cream-2)` }}
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
            ? { background: "var(--color-amber)", color: "var(--color-surface)" }
            : isSelected
              ? { background: "var(--color-dark)", color: "var(--color-surface)" }
              : { background: "transparent", color: "var(--color-dark)" };
          return (
            <button
              key={day.toISOString()}
              ref={(el) => {
                const k = format(day, "yyyy-MM-dd");
                if (el) stripEls.current.set(k, el); else stripEls.current.delete(k);
              }}
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
          style={{ width: 44, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)" }}
          aria-label="Next week"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Time grid */}
      <div
        className="flex md:mx-4 md:mb-4 md:rounded-2xl md:border md:overflow-hidden"
        style={{ height: TOTAL_H, background: "var(--color-surface)", borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* Time labels */}
        <div className="shrink-0 relative" style={{ width: 44 }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute", top: h * PX_PER_HOUR - 6, insetInlineEnd: 8,
                fontSize: 11, color: "var(--time-label)", fontWeight: 600,
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
              dayKey={key}
              isToday={isSameDay(day, today)}
              nowMins={nowMins}
              bookings={bucket?.bookings ?? []}
              blocked={bucket?.blocked ?? []}
              onSelectBooking={onSelectBooking}
              onCreateAt={onCreateAt}
              onLongPressAt={onLongPressAt}
              onBlockClick={onBlockClick}
              registerCol={registerCol}
              onBookingGrab={beginGrab}
              justDragged={justDragged}
              dragBookingId={drag?.booking.id ?? null}
            />
          );
        })}
      </div>

      {/* Drag ghost — snapped placeholder in the target column */}
      {drag && drag.colWidth > 0 && (
        <div
          className="fixed pointer-events-none rounded-lg border-2 border-dashed flex flex-col justify-center px-2"
          style={{
            left: drag.colLeft, width: drag.colWidth,
            top: drag.colTop + drag.mins * PX_PER_MIN,
            height: Math.max((drag.booking.service?.duration ?? 30) * PX_PER_MIN, 24),
            borderColor: STATUS_COLOR[drag.booking.status],
            background: `${STATUS_COLOR[drag.booking.status]}33`,
            zIndex: 60, boxShadow: "0 6px 20px rgba(30,26,20,0.18)",
          }}
        >
          <span className="text-[11px] font-bold leading-tight truncate" style={{ color: "var(--color-dark)" }}>
            {minsToTime(drag.mins)}
          </span>
          <span className="text-[10px] leading-tight truncate" style={{ color: "var(--color-muted)" }}>
            {drag.booking.customer_name}
          </span>
        </div>
      )}

      {/* Empty hint */}
      {bookings.length === 0 && blocked.length === 0 && (
        <div className="pointer-events-none sticky bottom-6 flex justify-center">
          <span className="text-[12px] px-3 py-1.5 rounded-full" style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}>
            {t("Tap a slot to book")}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Single day column ──────────────────────────────────────────────────────

interface ColProps {
  day: Date;
  dayKey: string;
  isToday: boolean;
  nowMins: number;
  bookings: Booking[];
  blocked: BlockedTime[];
  onSelectBooking: (b: Booking) => void;
  onCreateAt: (date: Date, mins: number) => void;
  onLongPressAt: (date: Date, mins: number) => void;
  onBlockClick: (b: BlockedTime) => void;
  registerCol: (key: string, el: HTMLElement | null) => void;
  onBookingGrab: (booking: Booking, originKey: string, e: React.PointerEvent<HTMLElement>) => void;
  justDragged: React.RefObject<boolean>;
  dragBookingId: string | null;
}

function WeekDayColumn({
  day, dayKey, isToday, nowMins, bookings, blocked,
  onSelectBooking, onCreateAt, onLongPressAt, onBlockClick,
  registerCol, onBookingGrab, justDragged, dragBookingId,
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
      ref={(el) => registerCol(dayKey, el)}
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
            aria-label={`Blocked ${bl.start_time}–${bl.end_time}`}
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
        // Give every card enough room for name + service, even short slots.
        const height = Math.max(duration * PX_PER_MIN, 46);
        const statusColor = STATUS_COLOR[b.status];
        const borderColor = b.label?.color ?? statusColor;
        const widthPct = 100 / lanes;
        const showService = !!b.service?.name;
        const showTime = height >= 62;
        const isPast = (!isToday && day < new Date()) ||
          (isToday && item.start + duration <= nowMins);
        return (
          <button
            key={b.id}
            onPointerDown={(e) => onBookingGrab(b, dayKey, e)}
            onClick={(e) => {
              e.stopPropagation();
              if (justDragged.current) { justDragged.current = false; return; }
              onSelectBooking(b);
            }}
            aria-label={`${b.customer_name}, ${b.service?.name ?? ""}, ${formatRange(b.appointment_time, duration)}, ${STATUS_LABEL[b.status]}`}
            className="absolute rounded-lg overflow-hidden text-start border-s-[3px] transition-opacity active:opacity-70"
            style={{
              top, height,
              insetInlineStart: `calc(${lane * widthPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              borderColor: borderColor,
              background: `${statusColor}1f`,
              boxShadow: "var(--shadow-sm)",
              padding: "5px 7px",
              zIndex: 6,
              opacity: dragBookingId === b.id ? 0.35 : isPast ? 0.45 : 1,
            }}
          >
            <div
              className="text-[12px] font-semibold leading-[1.15]"
              style={{
                color: "var(--color-dark)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {b.customer_name}
            </div>
            {showService && (
              <div className="text-[10.5px] leading-[1.2] mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>
                {b.service!.name}
              </div>
            )}
            {showTime && (
              <div className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>
                {formatRange(b.appointment_time, duration)}
              </div>
            )}
          </button>
        );
      })}

      {/* Current-time indicator (today only) */}
      {isToday && (
        <div style={{ position: "absolute", top: nowMins * PX_PER_MIN, left: 0, right: 0, height: 2, background: "var(--now-line)", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ position: "absolute", insetInlineStart: -3, top: -3, width: 8, height: 8, borderRadius: "50%", background: "var(--now-line)" }} />
        </div>
      )}
    </div>
  );
}
