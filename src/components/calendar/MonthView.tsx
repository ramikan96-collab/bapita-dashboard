"use client";

import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format,
} from "date-fns";
import { useLang } from "@/i18n";
import type { Booking } from "@/types";
import { STATUS_COLOR } from "@/types";
import { firstName, useSwipe } from "./grid";
import AgendaList from "./AgendaList";

interface Props {
  date: Date;
  bookings: Booking[];
  onSelectDay: (d: Date) => void;
  onSelectBooking: (b: Booking) => void;
  onPrev: () => void;
  onNext: () => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

export default function MonthView({ date, bookings, onSelectDay, onSelectBooking, onPrev, onNext }: Props) {
  const { t, dateLocale } = useLang();
  const today = new Date();
  const swipe = useSwipe(onNext, onPrev);

  const gridStart = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const gridEnd   = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDay = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      (map[b.appointment_date] ??= []).push(b);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
    );
    return map;
  }, [bookings]);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "var(--color-cream)" }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Month nav header */}
      <div className="shrink-0 flex items-center justify-center gap-1 px-3 md:px-6" style={{ height: 56 }}>
        <button
          onClick={onPrev}
          className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-cream-2)]"
          style={{ width: 36, height: 36, color: "var(--color-muted)" }}
          aria-label="Previous month"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div
          className="text-center"
          style={{ minWidth: 168, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-dark)" }}
        >
          {format(date, "MMMM yyyy", { locale: dateLocale })}
        </div>
        <button
          onClick={onNext}
          className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-cream-2)]"
          style={{ width: 36, height: 36, color: "var(--color-muted)" }}
          aria-label="Next month"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Framed month grid — unified hairline grid (social look) */}
      <div className="shrink-0 px-0 pt-1 md:px-6 md:pt-2 md:pb-2">
        <div
          className="overflow-hidden md:rounded-2xl md:border"
          style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="grid grid-cols-7 gap-px" style={{ background: "var(--line)" }}>
            {/* Weekday header cells */}
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-center"
                style={{
                  background: "var(--color-surface)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                  color: "var(--color-muted)", textTransform: "uppercase",
                  paddingBlock: 11,
                }}
              >
                {t(d)}
              </div>
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const key     = format(day, "yyyy-MM-dd");
              const dayBkgs = byDay[key] ?? [];
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, date);
              const chips   = dayBkgs.slice(0, MAX_CHIPS);
              const extra   = dayBkgs.length - chips.length;

              return (
                <button
                  key={key}
                  onClick={() => onSelectDay(day)}
                  className="flex flex-col items-stretch text-start overflow-hidden transition-colors"
                  style={{
                    background: inMonth ? "var(--color-surface)" : "var(--color-cream)",
                    minHeight: 100,
                    padding: "8px 8px 6px",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = inMonth ? "var(--color-surface)" : "var(--color-cream)"; }}
                >
                  {/* Day number */}
                  <div className="flex justify-center md:justify-start">
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 26, height: 26, fontSize: 13,
                        fontWeight: isToday ? 700 : 500,
                        background: isToday ? "var(--color-amber)" : "transparent",
                        color: isToday ? "#fff" : inMonth ? "var(--color-dark)" : "var(--color-muted)",
                      }}
                    >
                      {format(day, "d")}
                    </div>
                  </div>

                  {/* Event chips */}
                  <div className="flex flex-col gap-1 mt-1 w-full">
                    {chips.map((b) => {
                      const color = STATUS_COLOR[b.status];
                      return (
                        <div
                          key={b.id}
                          className="flex items-center gap-1.5 truncate"
                          style={{ fontSize: 11, lineHeight: "15px", color: "var(--color-dark)" }}
                        >
                          <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: color }} />
                          <span className="truncate">
                            <span style={{ fontWeight: 600 }}>{b.appointment_time.slice(0, 5)}</span>{" "}
                            <span style={{ color: "var(--color-muted)" }}>{firstName(b.customer_name)}</span>
                          </span>
                        </div>
                      );
                    })}
                    {extra > 0 && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", paddingInlineStart: 12 }}>
                        +{extra} {t("more")}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agenda section below grid */}
      <div className="shrink-0 mt-2">
        <AgendaList
          bookings={bookings}
          onSelectBooking={onSelectBooking}
          emptyMessage="No appointments this month"
        />
      </div>
    </div>
  );
}
