"use client";

import { format, parseISO } from "date-fns";
import { useLang } from "@/i18n";
import type { Booking } from "@/types";

interface Props {
  booking: Booking;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// date-fns Locale type without importing the whole namespace at call sites.
type Locale = ReturnType<typeof useLang>["dateLocale"];

function whenLabel(date: string, time: string, locale: Locale): string {
  return `${format(parseISO(date), "EEE, MMM d", { locale })} · ${time.slice(0, 5)}`;
}

export default function ConfirmRescheduleSheet({
  booking, oldDate, oldTime, newDate, newTime, saving, onConfirm, onCancel,
}: Props) {
  const { dateLocale } = useLang();

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:px-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-sm rounded-t-2xl md:rounded-2xl flex flex-col"
        style={{ background: "var(--color-surface)", boxShadow: "0 -4px 24px rgba(30,26,20,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto shrink-0 md:hidden" style={{ background: "var(--color-cream-2)", marginTop: 10, marginBottom: 2 }} />

        <div style={{ padding: "18px 22px 4px" }}>
          <p className="text-center font-black text-lg" style={{ color: "var(--color-dark)" }}>
            Move appointment?
          </p>
          <p className="text-center text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--color-dark)" }}>{booking.customer_name}</span>
            {booking.service?.name ? ` · ${booking.service.name}` : ""}
          </p>

          <div className="rounded-2xl mt-5" style={{ background: "var(--color-cream)", padding: "16px 18px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>From</span>
              <span className="text-[14px]" style={{ color: "var(--color-muted)", textDecoration: "line-through" }}>
                {whenLabel(oldDate, oldTime, dateLocale)}
              </span>
            </div>
            <div className="flex justify-center" style={{ margin: "8px 0" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--color-amber)" }}>To</span>
              <span className="text-[15px] font-bold" style={{ color: "var(--color-dark)" }}>
                {whenLabel(newDate, newTime, dateLocale)}
              </span>
            </div>
          </div>
        </div>

        <div
          className="shrink-0 flex gap-3"
          style={{ padding: "16px 22px calc(16px + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-2xl text-sm font-semibold border disabled:opacity-50"
            style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)", padding: "13px 0" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 rounded-2xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--color-amber)", color: "var(--color-surface)", padding: "13px 0" }}
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
