"use client";

import { parseISO, isSameDay, format } from "date-fns";
import { useLang } from "@/i18n";
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
  const { t, dateLocale } = useLang();
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: "rgba(232,146,10,0.12)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>
          {t(emptyMessage)}
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
    <div className="mx-auto w-full max-w-2xl px-3 sm:px-4 py-4">
      {dates.map((dateStr) => {
        const day = parseISO(dateStr);
        const isToday = isSameDay(day, new Date());
        const list = byDate[dateStr];

        return (
          <div key={dateStr} className="mb-7 last:mb-0">
            {/* Date label — sits on page background above the cards */}
            <div className="flex items-center gap-2 px-1 mb-3">
              {isToday && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: "var(--color-amber)" }}
                />
              )}
              <span
                className="text-[15px] font-bold tracking-tight"
                style={{ color: isToday ? "var(--color-amber)" : "var(--color-dark)" }}
              >
                {isToday ? `${t("Today")} · ${format(day, "EEE, MMM d", { locale: dateLocale })}` : format(day, "EEEE, MMMM d", { locale: dateLocale })}
              </span>
              <span className="text-[13px] font-medium ms-auto" style={{ color: "var(--color-muted)" }}>
                {list.length} appt{list.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Reservation cards */}
            <div className="flex flex-col gap-2.5">
              {list.map((b) => (
                <AgendaCard key={b.id} booking={b} onClick={onSelectBooking} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
