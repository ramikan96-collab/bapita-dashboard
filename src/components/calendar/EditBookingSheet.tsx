"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import { useLang } from "@/i18n";
import { getAvailableSlots } from "@/lib/availability";
import { loadActiveStaff } from "@/lib/staff";
import type { Booking, Service, StaffMember } from "@/types";

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
  const { t } = useLang();
  const supabase = createClient();

  const [serviceId, setServiceId] = useState<string>(booking.service_id);
  const [date, setDate] = useState<Date>(parseISO(booking.appointment_date));
  const [time, setTime] = useState<string | null>(booking.appointment_time.slice(0, 5));
  const [notes, setNotes] = useState<string>(booking.notes ?? "");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(booking.staff_id ?? null);

  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const eligibleStaff =
    selectedService?.staff_ids && selectedService.staff_ids.length > 0
      ? staff.filter((s) => selectedService.staff_ids!.includes(s.id))
      : staff;

  // ─── Load services ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!business) return;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, duration, price, active, display_order, business_id, staff_ids")
        .eq("business_id", business.id)
        .eq("active", true)
        .order("display_order");
      setServices((data as Service[]) || []);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  // ─── Load active staff ──────────────────────────────────────────────────
  useEffect(() => {
    if (!business) return;
    loadActiveStaff(supabase, business.id).then(setStaff);
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
    const patch = {
      service_id: serviceId,
      appointment_date: dateStr,
      appointment_time: time,
      notes: notes.trim() || null,
      staff_id: selectedStaffId,
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
    const selectedStaff = staff.find((s) => s.id === selectedStaffId) ?? null;
    onSaved({
      service_id: serviceId,
      appointment_date: dateStr,
      appointment_time: time,
      notes: notes.trim() || null,
      staff_id: selectedStaffId,
      staff: selectedStaff,
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md rounded-t-2xl md:rounded-2xl flex flex-col"
        style={{ background: "var(--color-surface)", maxHeight: "92vh", boxShadow: "0 -4px 24px rgba(30,26,20,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto shrink-0 md:hidden" style={{ background: "var(--color-cream-2)", marginTop: 10, marginBottom: 2 }} />
        <div className="overflow-y-auto" style={{ padding: "0 20px 8px" }}>
          <p className="text-center font-black text-lg" style={{ color: "var(--color-dark)", marginTop: 14, marginBottom: 22 }}>
            Edit Booking
          </p>

          {/* Service */}
          <div style={{ marginBottom: 18 }}>
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)", marginBottom: 8 }}>
              Service
            </label>
            <div className="relative">
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setTime(null);
              }}
              className="w-full h-12 rounded-xl border text-base outline-none appearance-none"
              style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)", padding: "0 40px 0 16px" }}
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
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted)" }} />
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom: 18 }}>
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)", marginBottom: 8 }}>
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
              className="w-full h-12 rounded-xl border text-base outline-none"
              style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)", padding: "0 16px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          {/* Time slots */}
          <div style={{ marginBottom: 18 }}>
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)", marginBottom: 10 }}>
              Time · {selectedService?.duration ?? booking.service?.duration ?? 30} min
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
                        ? { padding: "12px 0", background: "var(--color-amber)", color: "var(--color-surface)", borderColor: "var(--color-amber)" }
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

          {/* Staff */}
          {staff.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)", marginBottom: 8 }}>
                {t("Staff")}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedStaffId(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999,
                    border: `1.5px solid ${selectedStaffId === null ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                    background: selectedStaffId === null ? "var(--amber-soft)" : "transparent", cursor: "pointer", fontSize: 13,
                    color: "var(--color-dark)", fontFamily: "inherit",
                  }}
                >
                  {t("Any")}
                </button>
                {eligibleStaff.map((s) => {
                  const on = selectedStaffId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStaffId(s.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999,
                        border: `1.5px solid ${on ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                        background: on ? "var(--amber-soft)" : "transparent", cursor: "pointer", fontSize: 13,
                        color: "var(--color-dark)", fontFamily: "inherit",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color || "var(--color-amber)" }} />
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 4 }}>
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)", marginBottom: 8 }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes…"
              className="w-full rounded-xl border text-base outline-none resize-none"
              style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)", padding: "12px 16px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

        </div>

        {/* Footer buttons */}
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
            style={{ background: "var(--color-amber)", color: "var(--color-surface)", padding: "13px 0" }}
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
