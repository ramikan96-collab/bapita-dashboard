"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import { getAvailableSlots } from "@/lib/availability";
import type { Booking, Service } from "@/types";

interface Props {
  booking: Booking;
  onSaved: (patch: Partial<Booking>) => void;
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

export default function EditBookingSheet({ booking, onSaved, onClose }: Props) {
  const { business } = useBusiness();
  const { showToast } = useToast();
  const supabase = createClient();

  const [serviceId, setServiceId] = useState<string>(booking.service_id);
  const [date, setDate] = useState<Date>(parseISO(booking.appointment_date));
  const [time, setTime] = useState<string | null>(booking.appointment_time.slice(0, 5));
  const [notes, setNotes] = useState<string>(booking.notes ?? "");
  const [markPaid, setMarkPaid] = useState<boolean>(booking.payment_status !== "none");

  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  // ─── Load services ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!business) return;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, duration, price, active, display_order, business_id")
        .eq("business_id", business.id)
        .eq("active", true)
        .order("display_order");
      setServices((data as Service[]) || []);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  // ─── Load slots ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!business) return;
    const duration =
      selectedService?.duration ?? booking.service?.duration ?? 30;

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
  }, [date, business, serviceId, booking.id]);

  async function handleSave() {
    if (!time) return;
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const paymentStatus = markPaid ? (booking.payment_status !== "none" ? booking.payment_status : "cash") : "none";
    const patch = {
      service_id: serviceId,
      appointment_date: dateStr,
      appointment_time: time,
      notes: notes.trim() || null,
      payment_status: paymentStatus,
    };
    const { error } = await supabase
      .from("bookings")
      .update(patch)
      .eq("id", booking.id);
    if (error) {
      showToast("Couldn't save changes. Please try again.", "error");
      setSaving(false);
      return;
    }
    onSaved({
      service_id: serviceId,
      appointment_date: dateStr,
      appointment_time: time,
      notes: notes.trim() || null,
      payment_status: paymentStatus as Booking["payment_status"],
      ...(selectedService
        ? {
            service: {
              name: selectedService.name,
              duration: selectedService.duration,
              price: selectedService.price,
            },
          }
        : {}),
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md rounded-t-2xl flex flex-col"
        style={{ background: "#fff", maxHeight: "92vh", boxShadow: "0 -4px 24px rgba(30,26,20,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 shrink-0" style={{ background: "var(--color-cream-2)" }} />
        <div className="overflow-y-auto px-5 pb-4">
          <p className="text-center font-black text-lg mt-3 mb-5" style={{ color: "var(--color-dark)" }}>
            Edit Booking
          </p>

          {/* Service */}
          <div className="mb-5">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Service
            </label>
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setTime(null);
              }}
              className="w-full h-12 px-4 rounded-xl border text-base outline-none"
              style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
            >
              {services.length === 0 && (
                <option value={booking.service_id}>{booking.service?.name ?? "Current service"}</option>
              )}
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration} min · ₪{s.price}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="mb-5">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Date
            </label>
            <input
              type="date"
              value={format(date, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(parseISO(e.target.value));
                  setTime(null);
                }
              }}
              className="w-full h-12 px-4 rounded-xl border text-base outline-none"
              style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          {/* Time slots */}
          <div className="mb-5">
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Time · {selectedService?.duration ?? booking.service?.duration ?? 30} min
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

          {/* Notes */}
          <div className="mb-5">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes…"
              className="w-full px-4 py-3 rounded-xl border text-base outline-none resize-none"
              style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          {/* Mark as paid */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "var(--color-dark)" }}>
              Mark as paid
            </span>
            <button
              onClick={() => setMarkPaid((prev) => !prev)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: markPaid ? "var(--color-amber)" : "var(--color-cream-2)" }}
              aria-checked={markPaid}
              role="switch"
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: markPaid ? "translateX(24px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </div>

        {/* Footer buttons */}
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
