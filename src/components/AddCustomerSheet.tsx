"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { getAvailableSlots, type TimeSlot } from "@/lib/availability";
import type { Business, Service } from "@/types";

const CARD_SHADOW = "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)";

interface Props {
  business: Business;
  onClose: () => void;
  /** Fired after a customer (and optional booking) is saved, so the list can refresh. */
  onCreated: () => void;
}

function Spinner() {
  return (
    <div
      className="w-6 h-6 rounded-full border-2 animate-spin"
      style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
    />
  );
}

export default function AddCustomerSheet({ business, onClose, onCreated }: Props) {
  const { showToast } = useToast();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [attach, setAttach] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch services lazily, only once the owner wants to attach a booking.
  useEffect(() => {
    if (!attach || services.length > 0) return;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, duration:duration_minutes, price:price_nis, active, display_order, business_id")
        .eq("business_id", business.id)
        .eq("active", true)
        .order("display_order");
      setServices(data || []);
    })();
  }, [attach, services.length, business.id, supabase]);

  useEffect(() => {
    if (!attach || !service) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      const { data: existing } = await supabase
        .from("bookings")
        .select("appointment_time, service:services(duration:duration_minutes)")
        .eq("business_id", business.id)
        .eq("appointment_date", format(date, "yyyy-MM-dd"))
        .not("status", "eq", "cancelled");
      if (cancelled) return;
      const next = getAvailableSlots(
        date,
        service.duration,
        business.business_hours,
        (existing || []) as unknown as { appointment_time: string; service?: { duration: number } | null }[]
      );
      if (time && !next.some((s) => s.time === time && s.available)) setTime(null);
      setSlots(next);
      setLoadingSlots(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attach, service, date, business.id, supabase]);

  async function handleSave() {
    if (!name.trim() || !phone.trim()) {
      showToast("Name and phone are required.", "error");
      return;
    }
    if (attach && (!service || !time)) {
      showToast("Pick a service and time, or turn off the appointment.", "error");
      return;
    }

    setSubmitting(true);

    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        business_id: business.id,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        total_visits: 0,
      })
      .select()
      .single();

    if (custErr || !customer) {
      showToast("Couldn't save the client. Please try again.", "error");
      setSubmitting(false);
      return;
    }

    if (attach && service && time) {
      const appointmentDateTime = parseISO(`${format(date, "yyyy-MM-dd")}T${time}`);
      const { error: bookErr } = await supabase.from("bookings").insert({
        business_id: business.id,
        customer_id: customer.id,
        service_id: service.id,
        appointment_date: format(date, "yyyy-MM-dd"),
        appointment_time: time,
        appointment_datetime: appointmentDateTime.toISOString(),
        status: "confirmed",
        payment_status: "none",
      });

      if (bookErr) {
        // Customer saved fine; only the booking failed — say so honestly.
        showToast("Client saved, but the booking failed. Add it from the calendar.", "error");
        setSubmitting(false);
        onCreated();
        onClose();
        return;
      }

      if (customer.email) {
        fetch("/api/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: customer.name,
            customerEmail: customer.email,
            businessName: business.name || "",
            serviceName: service.name || "",
            date: format(date, "yyyy-MM-dd"),
            time,
          }),
        }).catch(console.error);
      }
    }

    showToast(attach ? "Client and booking added" : "Client added", "success");
    setSubmitting(false);
    onCreated();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[20px] flex flex-col"
        style={{ maxHeight: "92dvh", boxShadow: "0 -4px 24px rgba(30,26,20,0.12)" }}
        role="dialog"
        aria-label="Add client"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-cream-2)" }} />
        </div>

        {/* Title */}
        <div className="px-4 pb-3 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
          <h2 className="text-[18px] font-bold text-dark">Add client</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-dark">Full name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Avi Cohen"
              className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
              style={{ borderColor: "var(--color-cream-2)" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-dark">Phone *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05X-XXX-XXXX"
              className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
              style={{ borderColor: "var(--color-cream-2)" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-dark">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
              style={{ borderColor: "var(--color-cream-2)" }}
            />
          </div>

          {/* Attach booking toggle */}
          <button
            onClick={() => setAttach((v) => !v)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl border bg-transparent transition-colors hover:bg-cream"
            style={{ borderColor: "var(--color-cream-2)" }}
          >
            <span className="text-[15px] font-medium text-dark">Book an appointment too</span>
            <span
              className="relative w-10 h-6 rounded-full transition-colors shrink-0"
              style={{ background: attach ? "var(--color-amber)" : "var(--color-cream-2)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ insetInlineStart: attach ? 18 : 2 }}
              />
            </span>
          </button>

          {attach && (
            <div className="space-y-4 pt-1">
              {/* Service */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-dark">Service</label>
                {services.length === 0 ? (
                  <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>
                    No services yet. Add one in Settings first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {services.map((s) => {
                      const active = service?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setService(s);
                            setTime(null);
                          }}
                          className="w-full text-start bg-white rounded-xl p-3 border transition-colors"
                          style={{
                            borderColor: active ? "var(--color-amber)" : "var(--color-cream-2)",
                            boxShadow: active ? "0 0 0 1px var(--color-amber)" : CARD_SHADOW,
                          }}
                        >
                          <div className="text-[15px] font-bold text-dark">{s.name}</div>
                          <div className="text-[13px] flex gap-3 mt-0.5" style={{ color: "var(--color-muted)" }}>
                            <span>{s.duration} min</span>
                            <span>₪{s.price}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {service && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-dark">Date</label>
                    <input
                      type="date"
                      value={format(date, "yyyy-MM-dd")}
                      min={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDate(parseISO(e.target.value));
                          setTime(null);
                        }
                      }}
                      className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                      style={{ borderColor: "var(--color-cream-2)" }}
                    />
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-dark mb-2 block">Available times</label>
                    {loadingSlots ? (
                      <div className="flex justify-center py-8">
                        <Spinner />
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-[14px] text-center py-4" style={{ color: "var(--color-muted)" }}>
                        No times available. Try another date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot) => {
                          const active = time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              onClick={() => slot.available && setTime(slot.time)}
                              disabled={!slot.available}
                              className="py-2.5 rounded-xl text-[14px] font-semibold transition-colors border"
                              style={
                                active
                                  ? { background: "var(--color-amber)", color: "#fff", borderColor: "var(--color-amber)" }
                                  : slot.available
                                  ? { background: "#fff", color: "var(--color-dark)", borderColor: "var(--color-cream-2)" }
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
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t flex gap-3" style={{ borderColor: "var(--color-cream-2)" }}>
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl text-[15px] font-semibold border bg-transparent text-dark hover:bg-cream transition-colors"
            style={{ borderColor: "var(--color-cream-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 bg-amber text-white font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving…" : attach ? "Save & book" : "Save client"}
          </button>
        </div>
      </div>
    </>
  );
}
