"use client";

import type { Booking } from "@/types";
import AgendaList from "./AgendaList";

interface Props {
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
  onNewBooking: () => void;
}

export default function AgendaView({ bookings, onSelectBooking, onNewBooking }: Props) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-[var(--color-surface)] md:bg-[var(--color-cream)]">
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(232,146,10,0.12)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-[17px] font-semibold mb-1" style={{ color: "var(--color-dark)" }}>
            No upcoming appointments
          </p>
          <p className="text-[14px] mb-6" style={{ color: "var(--color-muted)" }}>
            Your next 90 days are clear
          </p>
          <button
            onClick={onNewBooking}
            className="px-6 py-3 rounded-xl text-[15px] font-semibold text-white"
            style={{ background: "var(--color-amber)" }}
          >
            Add appointment
          </button>
        </div>
      ) : (
        <AgendaList
          bookings={bookings}
          onSelectBooking={onSelectBooking}
          emptyMessage="No upcoming appointments"
        />
      )}
    </div>
  );
}
