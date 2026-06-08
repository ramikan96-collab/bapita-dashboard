"use client";

import { useMemo } from "react";
import { isSameDay } from "date-fns";
import type { Booking } from "@/types";
import { STATUS_COLOR, STATUS_BG } from "@/types";

const GRID_START = 8 * 60;   // 08:00 in minutes
const GRID_END   = 20 * 60;  // 20:00 in minutes
const PX_PER_MIN = 1.2;
const HOUR_H     = 60 * PX_PER_MIN; // 72px per hour
const TOTAL_H    = (GRID_END - GRID_START) * PX_PER_MIN;
const HOURS      = Array.from({ length: 13 }, (_, i) => 8 + i); // 08–20

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTimeRange(time: string, duration: number) {
  const start = timeToMins(time);
  const endH = Math.floor((start + duration) / 60);
  const endM = (start + duration) % 60;
  const hh = time.substring(0, 5);
  const eh = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  return `${hh} – ${eh}`;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface Props {
  date: Date;
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
}

export default function DayView({ date, bookings, onSelectBooking }: Props) {
  const now = new Date();
  const isToday = isSameDay(date, now);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && currentMins >= GRID_START && currentMins <= GRID_END;

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
    [bookings]
  );

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span style={{ fontSize: 40 }}>📅</span>
        <p className="font-bold text-sm" style={{ color: "var(--color-dark)" }}>No appointments today</p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>Tap ➕ to add a booking</p>
      </div>
    );
  }

  return (
    <div className="flex overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
      {/* Time labels column */}
      <div className="shrink-0 w-11 relative" style={{ height: TOTAL_H }}>
        {HOURS.map((h) => (
          <div
            key={h}
            style={{
              position: "absolute",
              top: (h * 60 - GRID_START) * PX_PER_MIN - 8,
              right: 6,
              fontSize: 10,
              color: "var(--color-muted)",
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {/* Grid + bookings */}
      <div className="flex-1 relative border-l" style={{ height: TOTAL_H, borderColor: "var(--color-cream-2)" }}>
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

        {/* Current time indicator */}
        {showNowLine && (
          <div
            style={{
              position: "absolute",
              top: (currentMins - GRID_START) * PX_PER_MIN,
              left: -4,
              right: 0,
              height: 2,
              background: "#EF4444",
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: -3,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#EF4444",
              }}
            />
          </div>
        )}

        {/* Booking blocks */}
        {sorted.map((booking) => {
          const startMins = timeToMins(booking.appointment_time);
          const duration  = booking.service?.duration ?? 30;
          const top    = (startMins - GRID_START) * PX_PER_MIN;
          const height = Math.max(duration * PX_PER_MIN, 28);
          const color  = STATUS_COLOR[booking.status];
          const bg     = STATUS_BG[booking.status];
          const tall   = height >= 40;

          return (
            <button
              key={booking.id}
              onClick={() => onSelectBooking(booking)}
              style={{
                position: "absolute",
                top,
                left: 6,
                right: 6,
                height,
                background: bg,
                borderLeft: `3px solid ${color}`,
                borderRadius: 8,
                padding: "4px 8px",
                textAlign: "left",
                overflow: "hidden",
                zIndex: 5,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {booking.customer_name}
              </div>
              {tall && (
                <div style={{ fontSize: 10, color: "var(--color-muted)", lineHeight: 1.2, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {formatTimeRange(booking.appointment_time, duration)}
                  {booking.service && ` · ${booking.service.name}`}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// re-export for use in BookingDrawer
export { initials };
