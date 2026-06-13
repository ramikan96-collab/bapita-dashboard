"use client";

import { parseISO, isSameDay, format } from "date-fns";
import type { Booking } from "@/types";
import AgendaCard from "./AgendaCard";

interface Props {
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
  emptyMessage?: string;
}

export default function AgendaList({
  bookings,
  onSelectBooking,
  emptyMessage = "No appointments",
}: Props) {
  if (bookings.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 px-4">
        <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>
          {emptyMessage}
        </span>
      </div>
    );
  }

  // Group by date, preserve sort order from API
  const byDate: Record<string, Booking[]> = {};
  bookings.forEach((b) => {
    (byDate[b.appointment_date] ??= []).push(b);
  });
  const dates = Object.keys(byDate).sort();

  return (
    <div>
      {dates.map((dateStr) => {
        const day = parseISO(dateStr);
        const isToday = isSameDay(day, new Date());
        const list = byDate[dateStr];

        return (
          <div key={dateStr}>
            {/* Date header */}
            <div
              className="sticky top-0 flex items-center gap-2 px-4 py-2 z-10"
              style={{
                background: "var(--color-cream-2)",
                borderBottom: "1px solid var(--color-cream-2)",
              }}
            >
              {isToday && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--color-amber)" }}
                />
              )}
              <span
                className="text-[13px] font-semibold"
                style={{ color: isToday ? "var(--color-amber)" : "var(--color-dark)" }}
              >
                {isToday ? `Today · ${format(day, "EEE, MMM d")}` : format(day, "EEEE, MMMM d")}
              </span>
              <span className="text-[12px] ms-auto" style={{ color: "var(--color-muted)" }}>
                {list.length} appt{list.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Booking cards */}
            {list.map((b) => (
              <AgendaCard key={b.id} booking={b} onClick={onSelectBooking} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
