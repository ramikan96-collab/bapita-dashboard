"use client";

import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format,
} from "date-fns";
import type { Booking } from "@/types";
import { STATUS_COLOR } from "@/types";

interface Props {
  date: Date;
  bookings: Booking[];
  onSelectDay: (d: Date) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthView({ date, bookings, onSelectDay }: Props) {
  const today = new Date();

  const gridStart = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const gridEnd   = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDay = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      const key = b.appointment_date;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="px-3 py-2">
      {/* Header row */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center" style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", paddingBottom: 4 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-y-1">
          {week.map((day) => {
            const key       = format(day, "yyyy-MM-dd");
            const dayBkgs   = byDay[key] ?? [];
            const isToday   = isSameDay(day, today);
            const inMonth   = isSameMonth(day, date);
            const isSelected = isSameDay(day, date);

            // Up to 3 status dots, then "+N"
            const dots = dayBkgs.slice(0, 3);
            const extra = dayBkgs.length - 3;

            return (
              <button
                key={key}
                onClick={() => onSelectDay(day)}
                className="flex flex-col items-center py-1 rounded-xl transition-colors"
                style={{
                  opacity: inMonth ? 1 : 0.3,
                  background: isSelected ? "rgba(232,146,10,0.12)" : "transparent",
                  minHeight: 52,
                }}
              >
                {/* Day number */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: isToday ? 900 : 500,
                    background: isToday ? "var(--color-amber)" : "transparent",
                    color: isToday ? "#fff" : isSelected ? "var(--color-amber)" : "var(--color-dark)",
                  }}
                >
                  {format(day, "d")}
                </div>

                {/* Status dots */}
                <div className="flex gap-0.5 mt-1 items-center">
                  {dots.map((b, i) => (
                    <div
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: STATUS_COLOR[b.status],
                      }}
                    />
                  ))}
                  {extra > 0 && (
                    <span style={{ fontSize: 8, color: "var(--color-muted)", fontWeight: 700, marginLeft: 1 }}>
                      +{extra}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
