"use client";

import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format,
} from "date-fns";
import type { Booking } from "@/types";
import { STATUS_COLOR } from "@/types";
import { firstName, useSwipe } from "./grid";

interface Props {
  date: Date;
  bookings: Booking[];
  onSelectDay: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

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
    // keep each day sorted by time
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
    );
    return map;
  }, [bookings]);

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "var(--color-cream)" }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Weekday header row */}
      <div className="grid grid-cols-7 shrink-0" style={{ borderBottom: "1px solid var(--color-cream-2)" }}>
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center"
            style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", paddingBlock: 6, textTransform: "uppercase", letterSpacing: 0.4 }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Month grid — weeks fill remaining height */}
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const key     = format(day, "yyyy-MM-dd");
              const dayBkgs = byDay[key] ?? [];
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, date);

              const chips = dayBkgs.slice(0, MAX_CHIPS);
              const extra = dayBkgs.length - chips.length;

              return (
                <button
                  key={key}
                  onClick={() => onSelectDay(day)}
                  className="flex flex-col items-stretch text-start overflow-hidden transition-colors hover:bg-white/40"
                  style={{
                    borderInlineStart: "1px solid var(--color-cream-2)",
                    borderBottom: "1px solid var(--color-cream-2)",
                    background: inMonth ? "transparent" : "rgba(107,96,82,0.03)",
                    paddingTop: 4,
                    paddingInline: 4,
                  }}
                >
                  {/* Day number */}
                  <div className="flex justify-center md:justify-start">
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 24,
                        height: 24,
                        fontSize: 13,
                        fontWeight: isToday ? 800 : 500,
                        background: isToday ? "var(--color-amber)" : "transparent",
                        color: isToday ? "#fff" : inMonth ? "var(--color-dark)" : "var(--color-muted)",
                      }}
                    >
                      {format(day, "d")}
                    </div>
                  </div>

                  {/* Event chips */}
                  <div className="flex flex-col gap-0.5 mt-0.5 w-full">
                    {chips.map((b) => {
                      const color = STATUS_COLOR[b.status];
                      return (
                        <div
                          key={b.id}
                          className="rounded-[4px] truncate"
                          style={{
                            fontSize: 10,
                            lineHeight: "15px",
                            paddingInline: 4,
                            color: "var(--color-dark)",
                            background: `${color}1f`,
                            borderInlineStart: `2px solid ${color}`,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{b.appointment_time.slice(0, 5)}</span>{" "}
                          {firstName(b.customer_name)}
                        </div>
                      );
                    })}
                    {extra > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", paddingInline: 4 }}>
                        +{extra} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
