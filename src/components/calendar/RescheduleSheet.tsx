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
        .select("appointment_time, service:services(duration:duration_minutes)")
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md rounded-t-2xl flex flex-col"
        style={{ background: "#fff", maxHeight: "90vh", boxShadow: "0 -4px 24px rgba(30,26,20,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 shrink-0" style={{ background: "var(--color-cream-2)" }} />
        <div className="overflow-y-auto px-5 pb-4">
          <p className="text-center font-black text-lg mt-3 mb-5" style={{ color: "var(--color-dark)" }}>
            Reschedule
          </p>

          <div className="mb-5">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Date
            </label>
            <input
              type="date"
              value={format(date, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) { setDate(parseISO(e.target.value)); setTime(null); }
              }}
              className="w-full h-12 px-4 rounded-xl border text-base outline-none"
              style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Time · {booking.service?.duration ?? 30} min
            </label>
            {loadingSlots ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--color-muted)" }}>No available times this day.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => slot.available && setTime(slot.time)}
                    className="py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                    style={
                      time === slot.time
                        ? { background: "var(--color-amber)", color: "#fff", borderColor: "var(--color-amber)" }
                        : slot.available
                        ? { background: "var(--color-cream)", color: "var(--color-dark)", borderColor: "var(--color-cream-2)" }
                        : {
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
          className="shrink-0 px-5 pb-8 pt-3 flex gap-3 border-t"
          style={{ borderColor: "var(--color-cream-2)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)" }}
          >
            Cancel
          </button>
          <button
            disabled={!time || saving}
            onClick={handleSave}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--color-amber)", color: "#fff" }}
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
