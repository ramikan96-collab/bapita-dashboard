"use client";

import { useMemo } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format } from "date-fns";
import type { Booking } from "@/types";
import { STATUS_COLOR, STATUS_BG } from "@/types";

const GRID_START = 8 * 60;
const GRID_END   = 20 * 60;
const PX_PER_MIN = 1.2;
const HOUR_H     = 60 * PX_PER_MIN;
const TOTAL_H    = (GRID_END - GRID_START) * PX_PER_MIN;
const HOURS      = Array.from({ length: 13 }, (_, i) => 8 + i);
const COL_W      = 44; // px per day column
const TIME_W     = 36; // px for time label column

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

interface Props {
  date: Date;
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
  onSelectDay: (d: Date) => void;
}

export default function WeekView({ date, bookings, onSelectBooking, onSelectDay }: Props) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(date, { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const today     = new Date();

  const byDay = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      const key = b.appointment_date;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  return (
    <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
      <div style={{ width: TIME_W + days.length * COL_W, minWidth: "100%" }}>
        {/* Day header row */}
        <div className="flex sticky top-0 z-20" style={{ background: "var(--color-cream)", borderBottom: "1px solid var(--color-cream-2)" }}>
          <div style={{ width: TIME_W }} />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDay(day)}
                style={{
                  width: COL_W,
                  padding: "6px 0",
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? "var(--color-amber)" : "var(--color-muted)",
                  borderLeft: "1px solid var(--color-cream-2)",
                }}
              >
                <div>{format(day, "EEE")}</div>
                <div style={{ fontSize: 12 }}>{format(day, "d")}</div>
              </button>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="flex relative" style={{ height: TOTAL_H }}>
          {/* Time labels */}
          <div style={{ width: TIME_W, position: "relative", flexShrink: 0 }}>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: (h * 60 - GRID_START) * PX_PER_MIN - 7,
                  right: 4,
                  fontSize: 9,
                  color: "var(--color-muted)",
                  fontWeight: 600,
                }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayBookings = byDay[key] ?? [];

            return (
              <div
                key={key}
                style={{
                  width: COL_W,
                  position: "relative",
                  flexShrink: 0,
                  borderLeft: "1px solid var(--color-cream-2)",
                }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      top: (h * 60 - GRID_START) * PX_PER_MIN,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: "var(--color-cream-2)",
                    }}
                  />
                ))}

                {/* Booking blocks */}
                {dayBookings.map((b) => {
                  const startMins = timeToMins(b.appointment_time);
                  const duration  = b.service?.duration ?? 30;
                  const top       = (startMins - GRID_START) * PX_PER_MIN;
                  const height    = Math.max(duration * PX_PER_MIN, 18);
                  const color     = STATUS_COLOR[b.status];

                  return (
                    <button
                      key={b.id}
                      onClick={() => onSelectBooking(b)}
                      style={{
                        position: "absolute",
                        top,
                        left: 2,
                        right: 2,
                        height,
                        background: STATUS_BG[b.status],
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 5,
                        overflow: "hidden",
                        zIndex: 5,
                        padding: "2px 3px",
                      }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 700, color, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {b.customer_name}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
