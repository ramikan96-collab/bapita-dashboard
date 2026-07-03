"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import { getAvailableSlots } from "@/lib/availability";
import type { Booking } from "@/types";

interface Props {
  booking: Booking;
  onRescheduled: (patch: Partial<Booking>) => void;
  onClose: () => void;
}

function Spinner() {
  return (
    <div
      className="w-6 h-6 rounded-full border-2 animate-spin"
      style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
    />
  );
}

export default function RescheduleSheet({ booking, onRescheduled, onClose }: Props) {
  const { business } = useBusiness();
  const { showToast } = useToast();
  const supabase = createClient();

  const [date, setDate] = useState<Date>(parseISO(booking.appointment_date));
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const { data: existing } = await supabase
        .from("bookings")
        .select("appointment_time, service:services(duration)")
        .eq("business_id", business.id)
        .eq("appointment_date", dateStr)
        .neq("id", booking.id)
        .not("status", "eq", "cancelled");
      if (cancelled) return;
      const duration = booking.service?.duration ?? 30;
      const next = getAvailableSlots(
        date,
        duration,
        business.business_hours,
        (existing || []) as unknown as { appointment_time: string; service?: { duration: number } | null }[]
      );
      setSlots(next);
      setLoadingSlots(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, business, booking.id, booking.service?.duration]);

  async function handleSave() {
    if (!time) return;
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const { error } = await supabase
      .from("bookings")
      .update({
        appointment_date: dateStr,
        appointment_time: time,
        appointment_datetime: new Date(`${dateStr}T${time}`).toISOString(),
      })
      .eq("id", booking.id);
    if (error) {
      showToast("Couldn't reschedule. Please try again.", "error");
    } else {
      onRescheduled({ appointment_date: dateStr, appointment_time: time });
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md rounded-t-2xl md:rounded-2xl flex flex-col"
        style={{ background: "#fff", maxHeight: "90vh", boxShadow: "0 -4px 24px rgba(30,26,20,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto shrink-0 md:hidden" style={{ background: "var(--color-cream-2)", marginTop: 10, marginBottom: 2 }} />
        <div className="overflow-y-auto" style={{ padding: "0 20px 8px" }}>
          <p className="text-center font-black text-lg" style={{ color: "var(--color-dark)", marginTop: 14, marginBottom: 22 }}>
            Reschedule
          </p>

          <div style={{ marginBottom: 20 }}>
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)", marginBottom: 10 }}>
              Date
            </label>
            <input
              type="date"
              value={format(date, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) { setDate(parseISO(e.target.value)); setTime(null); }
              }}
              className="w-full h-12 rounded-xl border text-base outline-none"
              style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)", padding: "0 16px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)", marginBottom: 12 }}>
              Time · {booking.service?.duration ?? 30} min
            </label>
            {loadingSlots ? (
              <div className="flex justify-center" style={{ padding: "24px 0" }}><Spinner /></div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-center" style={{ color: "var(--color-muted)", padding: "16px 0" }}>No available times this day.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => slot.available && setTime(slot.time)}
                    className="rounded-xl text-sm font-semibold border transition-colors"
                    style={
                      time === slot.time
                        ? { padding: "12px 0", background: "var(--color-amber)", color: "#fff", borderColor: "var(--color-amber)" }
                        : slot.available
                        ? { padding: "12px 0", background: "var(--color-cream)", color: "var(--color-dark)", borderColor: "var(--color-cream-2)" }
                        : {
                            padding: "12px 0",
                            background: "var(--color-cream-2)",
                            color: "var(--color-muted)",
                            borderColor: "transparent",
                            textDecoration: "line-through",
                            cursor: "not-allowed",
                          }
                    }
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="shrink-0 flex gap-3 border-t"
          style={{ borderColor: "var(--color-cream-2)", padding: "14px 20px calc(14px + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl text-sm font-semibold border"
            style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)", padding: "13px 0" }}
          >
            Cancel
          </button>
          <button
            disabled={!time || saving}
            onClick={handleSave}
            className="flex-1 rounded-2xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--color-amber)", color: "#fff", padding: "13px 0" }}
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
