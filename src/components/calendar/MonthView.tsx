"use client";

import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format,
} from "date-fns";
import type { Booking } from "@/types";
import { STATUS_COLOR } from "@/types";
import { useSwipe } from "./grid";

interface Props {
  date: Date;
  bookings: Booking[];
  onSelectDay: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthView({ date, bookings, onSelectDay, onPrev, onNext }: Props) {
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
    return map;
  }, [bookings]);

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div
      className="h-full overflow-y-auto px-3 py-2"
      style={{ background: "var(--color-cream)" }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Header row */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center" style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", paddingBottom: 4 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const key        = format(day, "yyyy-MM-dd");
              const dayBkgs    = byDay[key] ?? [];
              const isToday    = isSameDay(day, today);
              const inMonth    = isSameMonth(day, date);
              const isSelected = isSameDay(day, date);

              const dots = dayBkgs.slice(0, 3);
              const extra = dayBkgs.length - dots.length;

              return (
                <button
                  key={key}
                  onClick={() => onSelectDay(day)}
                  className="flex flex-col items-center justify-start rounded-xl active:scale-[0.97] transition-transform"
                  style={{
                    opacity: inMonth ? 1 : 0.35,
                    background: isSelected ? "rgba(232,146,10,0.10)" : "transparent",
                    minHeight: 58,
                    paddingTop: 4,
                  }}
                >
                  {/* Day number */}
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 30,
                      height: 30,
                      fontSize: 14,
                      fontWeight: isToday ? 800 : 500,
                      background: isToday ? "var(--color-amber)" : "transparent",
                      color: isToday ? "#fff" : isSelected ? "var(--color-amber)" : "var(--color-dark)",
                    }}
                  >
                    {format(day, "d")}
                  </div>

                  {/* Status dots + overflow count */}
                  {dayBkgs.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-1">
                      {dots.map((b, i) => (
                        <span
                          key={i}
                          style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_COLOR[b.status] }}
                        />
                      ))}
                      {extra > 0 && (
                        <span style={{ fontSize: 9, color: "var(--color-muted)", fontWeight: 700, marginInlineStart: 1 }}>
                          +{extra}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
