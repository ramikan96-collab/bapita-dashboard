"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { getAvailableSlots, type TimeSlot } from "@/lib/availability";
import type { Business, Service, Customer } from "@/types";

const CARD_SHADOW = "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)";

interface Props {
  business: Business;
  onClose: () => void;
  onCreated: () => void;
  clientToEdit?: Customer;
}

function Spinner() {
  return (
    <div
      className="w-6 h-6 rounded-full border-2 animate-spin"
      style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
    />
  );
}

export default function AddCustomerSheet({ business, onClose, onCreated, clientToEdit }: Props) {
  const { showToast } = useToast();
  const supabase = createClient();
  const isEdit = !!clientToEdit;

  const [name, setName] = useState(clientToEdit?.name ?? "");
  const [phone, setPhone] = useState(clientToEdit?.phone ?? "");
  const [email, setEmail] = useState((clientToEdit as any)?.email ?? "");
  const [lastVisit, setLastVisit] = useState(
    clientToEdit?.last_visit_at ? format(parseISO(clientToEdit.last_visit_at), "yyyy-MM-dd") : ""
  );
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
        .select("id, name, duration, price, active, display_order, business_id")
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
        .select("appointment_time, service:services(duration)")
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
    if (!isEdit && attach && (!service || !time)) {
      showToast("Pick a service and time, or turn off the appointment.", "error");
      return;
    }

    setSubmitting(true);

    if (isEdit && clientToEdit) {
      const { error } = await supabase
        .from("customers")
        .update({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          last_visit_at: lastVisit ? new Date(lastVisit).toISOString() : clientToEdit.last_visit_at,
        })
        .eq("id", clientToEdit.id)
        .eq("business_id", business.id);

      setSubmitting(false);
      if (error) { showToast("Couldn't update client.", "error"); return; }
      showToast("Client updated", "success");
      onCreated();
      onClose();
      return;
    }

    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        business_id: business.id,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        total_visits: 0,
        last_visit_at: lastVisit ? new Date(lastVisit).toISOString() : null,
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
      <style>{`
        .csheet-outer { position: fixed; inset: 0; z-index: 40; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); padding: 0; }
        @media (min-width: 640px) { .csheet-outer { align-items: center; padding: 20px; } }
        .csheet-inner { width: 100%; max-height: 92dvh; display: flex; flex-direction: column; background: var(--color-surface); border-radius: 20px 20px 0 0; box-shadow: 0 -4px 24px rgba(30,26,20,0.12); }
        @media (min-width: 640px) { .csheet-inner { max-width: 480px; border-radius: 20px; max-height: 88dvh; box-shadow: 0 8px 48px rgba(30,26,20,0.18); } }
        .csheet-handle { display: flex; justify-content: center; padding: 12px 0 4px; }
        @media (min-width: 640px) { .csheet-handle { display: none; } }
      `}</style>

      <div className="csheet-outer" onClick={onClose}>
        <div
          className="csheet-inner"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={isEdit ? "Edit client" : "Add client"}
        >
          {/* Drag handle — mobile only */}
          <div className="csheet-handle">
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--color-cream-2)" }} />
          </div>

        {/* Title */}
        <div className="px-5 pb-3 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-dark)", margin: 0 }}>{isEdit ? "Edit client" : "Add client"}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--color-muted)" }}>Full name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Avi Cohen"
              style={{ height: 44, padding: "0 14px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", boxSizing: "border-box" as const, width: "100%" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          {/* Phone */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--color-muted)" }}>Phone *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05X XXX XXXX"
              style={{ height: 44, padding: "0 14px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", boxSizing: "border-box" as const, width: "100%" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--color-muted)" }}>Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{ height: 44, padding: "0 14px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", boxSizing: "border-box" as const, width: "100%" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          {/* Last visit */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--color-muted)" }}>Last visit (optional)</label>
            <input
              type="date"
              value={lastVisit}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setLastVisit(e.target.value)}
              style={{ height: 44, padding: "0 14px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: lastVisit ? "var(--color-dark)" : "var(--color-muted)", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", boxSizing: "border-box" as const, width: "100%" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          {/* Attach booking toggle — add mode only */}
          {!isEdit && <button
            onClick={() => setAttach((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--color-cream-2)", background: "transparent", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-cream)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>Book an appointment too</span>
            <span style={{ position: "relative", width: 40, height: 24, borderRadius: 99, background: attach ? "var(--color-amber)" : "var(--color-cream-2)", transition: "background 0.2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 2, insetInlineStart: attach ? 18 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "all 0.2s" }} />
            </span>
          </button>}

          {!isEdit && attach && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
              {/* Service */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--color-muted)" }}>Service</label>
                {services.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No services yet. Add one in Settings first.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {services.map((s) => {
                      const active = service?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => { setService(s); setTime(null); }}
                          style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${active ? "var(--color-amber)" : "var(--color-cream-2)"}`, background: active ? "var(--amber-soft)" : "var(--color-cream)", cursor: "pointer", boxShadow: active ? "0 0 0 1px var(--color-amber)" : CARD_SHADOW, transition: "all 0.15s" }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2, display: "flex", gap: 12 }}>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--color-muted)" }}>Date</label>
                    <input
                      type="date"
                      value={format(date, "yyyy-MM-dd")}
                      min={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => { if (e.target.value) { setDate(parseISO(e.target.value)); setTime(null); } }}
                      style={{ height: 44, padding: "0 14px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", boxSizing: "border-box" as const, width: "100%" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--color-muted)", display: "block", marginBottom: 8 }}>Available times</label>
                    {loadingSlots ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                        <Spinner />
                      </div>
                    ) : slots.length === 0 ? (
                      <p style={{ fontSize: 13, textAlign: "center", padding: "16px 0", color: "var(--color-muted)" }}>
                        No times available. Try another date.
                      </p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                        {slots.map((slot) => {
                          const active = time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              onClick={() => slot.available && setTime(slot.time)}
                              disabled={!slot.available}
                              style={active
                                ? { padding: "10px 0", borderRadius: 11, border: "1.5px solid var(--color-amber)", background: "var(--color-amber)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }
                                : slot.available
                                ? { padding: "10px 0", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)", fontSize: 13, fontWeight: 600, cursor: "pointer" }
                                : { padding: "10px 0", borderRadius: 11, border: "1.5px solid transparent", background: "var(--color-cream-2)", color: "var(--color-muted)", fontSize: 13, fontWeight: 600, cursor: "not-allowed", textDecoration: "line-through" }
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
        <div style={{ flexShrink: 0, padding: "14px 20px 20px", borderTop: "1px solid var(--color-cream-2)", display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, height: 46, borderRadius: 13, border: "1.5px solid var(--color-cream-2)", background: "transparent", fontSize: 14, fontWeight: 600, color: "var(--color-dark)", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-cream)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            style={{ flex: 1, height: 46, borderRadius: 13, border: "none", background: submitting ? "var(--color-cream-2)" : "var(--wash-amber)", color: submitting ? "var(--color-muted)" : "#fff", fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 4px 14px rgba(232,146,10,0.28)", transition: "all 0.15s" }}
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : attach ? "Save & book" : "Save client"}
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
