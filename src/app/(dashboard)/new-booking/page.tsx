"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import { getAvailableSlots, type TimeSlot } from "@/lib/availability";
import type { Service, Customer } from "@/types";

type Step = "client" | "service" | "datetime" | "confirm";
const STEP_ORDER: Step[] = ["client", "service", "datetime", "confirm"];
const STEP_LABEL: Record<Step, string> = {
  client:   "Client",
  service:  "Service",
  datetime: "Time",
  confirm:  "Confirm",
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 44,
  width: "100%",
  padding: "0 13px",
  borderRadius: 11,
  border: "1.5px solid var(--color-cream-2)",
  background: "var(--color-cream)",
  fontSize: 16, // must be >=16 to prevent iOS Safari auto-zoom
  color: "var(--color-dark)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 16,
  border: "1px solid var(--color-cream-2)",
  boxShadow: "var(--shadow-sm)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-dark)",
  display: "block",
  marginBottom: 6,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function onFocusAmber(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "var(--color-amber)";
}
function onBlurCream(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "var(--color-cream-2)";
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size = 22 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid var(--color-amber)`,
        borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ─── Row (confirm summary) ────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14 }}>
      <span style={{ color: "var(--color-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--color-dark)", textAlign: "end" }}>{value}</span>
    </div>
  );
}

// ─── Primary CTA button ───────────────────────────────────────────────────────

function PrimaryBtn({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  type?: "submit" | "button";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 14,
        border: "none",
        background: disabled ? "var(--color-cream-2)" : "var(--wash-amber)",
        color: disabled ? "var(--color-muted)" : "#fff",
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 4px 14px rgba(232,146,10,0.28)",
        transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 14,
        border: "1.5px solid var(--color-cream-2)",
        background: "transparent",
        color: "var(--color-dark)",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-cream)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

// ─── Inner wizard ─────────────────────────────────────────────────────────────

function NewBookingInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const dateParam    = searchParams.get("date");
  const timeParam    = searchParams.get("time");
  const clientIdParam = searchParams.get("clientId");
  const { business, loading: bizLoading } = useBusiness();
  const { showToast } = useToast();
  const supabase = createClient();

  const [step,        setStep]        = useState<Step>("client");
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState(false);

  const [clientSearch,     setClientSearch]     = useState("");
  const [clients,          setClients]          = useState<Customer[]>([]);
  const [selectedClient,   setSelectedClient]   = useState<Customer | null>(null);
  const [preselecting,     setPreselecting]     = useState(!!clientIdParam);
  const [showNewClient,    setShowNewClient]    = useState(false);
  const [newClientName,    setNewClientName]    = useState("");
  const [newClientPhone,   setNewClientPhone]   = useState("");
  const [newClientEmail,   setNewClientEmail]   = useState("");
  const [recentClients,    setRecentClients]    = useState<Customer[]>([]);

  const [services,         setServices]         = useState<Service[]>([]);
  const [selectedService,  setSelectedService]  = useState<Service | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(dateParam ? parseISO(dateParam) : new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(timeParam ?? null);
  const [slots,        setSlots]        = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [notes,      setNotes]      = useState("");
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [sendEmail,  setSendEmail]  = useState(true);

  // ─── Preselect client ───────────────────────────────────────────────────
  useEffect(() => {
    if (!business || !clientIdParam) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("customers").select("*").eq("business_id", business.id).eq("id", clientIdParam).single();
      if (cancelled) return;
      if (data) { setSelectedClient(data); setStep("service"); }
      setPreselecting(false);
    })();
    return () => { cancelled = true; };
  }, [business, clientIdParam, supabase]);

  // ─── Recent clients (shown when search is empty) ────────────────────────
  useEffect(() => {
    if (!business) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentClients(data || []);
    })();
  }, [business, supabase]);

  // ─── Client search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!business || clientSearch.trim().length < 2) { setClients([]); return; }
    const q = clientSearch.trim();
    const delay = setTimeout(async () => {
      const { data } = await supabase.from("customers").select("*").eq("business_id", business.id).or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(10);
      setClients(data || []);
    }, 300);
    return () => clearTimeout(delay);
  }, [clientSearch, business, supabase]);

  // ─── Services ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!business) return;
    (async () => {
      const { data } = await supabase.from("services").select("id, name, name_he, duration, price, active, display_order, business_id").eq("business_id", business.id).eq("active", true).order("display_order");
      setServices(data || []);
    })();
  }, [business, supabase]);

  // ─── Available slots ────────────────────────────────────────────────────
  useEffect(() => {
    if (!business || !selectedService || step !== "datetime") return;
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      const { data: existing } = await supabase.from("bookings").select("appointment_time, service:services(duration)").eq("business_id", business.id).eq("appointment_date", format(selectedDate, "yyyy-MM-dd")).not("status", "eq", "cancelled");
      if (cancelled) return;
      const next = getAvailableSlots(selectedDate, selectedService.duration, business.business_hours, (existing || []) as unknown as { appointment_time: string; service?: { duration: number } | null }[]);
      if (selectedTime && !next.some((s) => s.time === selectedTime && s.available)) setSelectedTime(null);
      setSlots(next);
      setLoadingSlots(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedService, business, step, supabase]);

  async function createNewClient(): Promise<Customer | null> {
    if (!business) return null;
    const { data, error } = await supabase.from("customers").insert({ business_id: business.id, name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim() || null, total_visits: 0 }).select().single();
    if (error) { console.error("[createNewClient] Supabase error:", error); showToast(`Couldn't save the client: ${error.message}`, "error"); return null; }
    return data;
  }

  async function handleClientNext() {
    if (showNewClient) {
      if (!newClientName.trim() || !newClientPhone.trim()) { showToast("Name and phone are required.", "error"); return; }
      const created = await createNewClient();
      if (created) { setSelectedClient(created); setShowNewClient(false); setStep("service"); }
    } else if (selectedClient) {
      setStep("service");
    }
  }

  async function createBooking() {
    if (!business || !selectedClient || !selectedService || !selectedTime) { showToast("Something's missing. Check the booking details.", "error"); return; }
    setSubmitting(true);

    // Race-condition guard: re-check slot is still free before inserting
    const { data: fresh } = await supabase
      .from("bookings")
      .select("appointment_time, service:services(duration)")
      .eq("business_id", business.id)
      .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
      .in("status", ["confirmed", "pending"]);
    if (fresh) {
      const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      const newStart = toMins(selectedTime);
      const newEnd = newStart + selectedService.duration;
      const conflict = (fresh as { appointment_time: string; service: { duration: number }[] | { duration: number } | null }[]).some((b) => {
        const bStart = toMins(b.appointment_time);
        const bDur = Array.isArray(b.service) ? (b.service[0]?.duration || 30) : (b.service?.duration || 30);
        return newStart < bStart + bDur && newEnd > bStart;
      });
      if (conflict) {
        const updated = getAvailableSlots(selectedDate, selectedService.duration, business.business_hours, fresh as unknown as { appointment_time: string; service?: { duration: number } | null }[]);
        setSlots(updated);
        setSelectedTime(null);
        setStep("datetime");
        showToast("That slot was just taken. Pick another time.", "error");
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from("bookings").insert({ business_id: business.id, customer_id: selectedClient.id, service_id: selectedService.id, customer_name: selectedClient.name, customer_phone: selectedClient.phone || null, customer_email: selectedClient.email || null, appointment_date: format(selectedDate, "yyyy-MM-dd"), appointment_time: selectedTime, status: "confirmed", payment_status: markAsPaid ? "cash" : "none", notes: notes.trim() || null });
    if (error) { showToast("Couldn't create the booking. Please try again.", "error"); setSubmitting(false); return; }
    if (selectedClient.email && sendEmail) {
      fetch("/api/send-confirmation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: selectedClient.name, customerEmail: selectedClient.email, businessName: business.name || "", serviceName: selectedService.name || "", date: format(selectedDate, "yyyy-MM-dd"), time: selectedTime }) }).catch(console.error);
    }
    setSubmitting(false);
    setSuccess(true);
  }

  const resetWizard = useCallback(() => {
    setSuccess(false);
    setSelectedService(null);
    setSelectedTime(timeParam ?? null);
    setSelectedDate(dateParam ? parseISO(dateParam) : new Date());
    setNotes("");
    setSendEmail(true);
    setSlots([]);
    if (selectedClient && clientIdParam) {
      setStep("service");
    } else {
      setSelectedClient(null);
      setClientSearch("");
      setClients([]);
      setShowNewClient(false);
      setNewClientName("");
      setNewClientPhone("");
      setNewClientEmail("");
      setStep("client");
    }
  }, [clientIdParam, selectedClient, dateParam, timeParam]);

  function goBack() {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStep(STEP_ORDER[i - 1]);
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (bizLoading || preselecting) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", background: "var(--color-cream)" }}>
        <Spinner />
      </div>
    );
  }

  // ─── Success ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center", background: "var(--color-cream)" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--color-amber)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 6px 24px rgba(232,146,10,0.36)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-dark)", marginBottom: 8 }}>Booking confirmed</h1>
        <p style={{ fontSize: 14, color: "var(--color-muted)", lineHeight: 1.6, maxWidth: 280 }}>
          {selectedClient?.name} · {selectedService?.name}<br />
          {format(selectedDate, "EEEE, MMM d")} at {selectedTime}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280, marginTop: 32 }}>
          <button
            onClick={() => router.push("/calendar")}
            style={{ width: "100%", height: 48, borderRadius: 14, border: "none", background: "var(--wash-amber)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(232,146,10,0.28)" }}
          >
            Go to calendar
          </button>
          <button
            onClick={resetWizard}
            style={{ width: "100%", height: 48, borderRadius: 14, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            Add another booking
          </button>
        </div>
      </div>
    );
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "18px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-dark)", margin: 0 }}>New booking</h1>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-muted)" }}>
                Step {stepIndex + 1} of 4 · {STEP_LABEL[step]}
              </span>
            </div>
            <button
              onClick={() => router.push("/calendar")}
              aria-label="Close"
              style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "var(--color-cream-2)", color: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.15s, color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream)"; e.currentTarget.style.color = "var(--color-dark)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-muted)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {/* Progress */}
          <div style={{ display: "flex", gap: 6 }}>
            {STEP_ORDER.map((s, i) => (
              <div
                key={s}
                style={{ height: 4, flex: 1, borderRadius: 99, background: i <= stepIndex ? "var(--color-amber)" : "var(--color-cream-2)", transition: "background 0.2s" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "20px 20px 28px" }}>

          {/* ── Step 1: Client ──────────────────────────────────────────── */}
          {step === "client" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {!showNewClient ? (
                <>
                  <button
                    onClick={() => setShowNewClient(true)}
                    style={{ width: "100%", height: 44, borderRadius: 11, border: "1.5px dashed var(--color-cream-2)", background: "transparent", color: "var(--color-dark)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.background = "var(--amber-soft)"; e.currentTarget.style.color = "var(--color-amber)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-dark)"; }}
                  >
                    + New client
                  </button>

                  <div>
                    <label style={labelStyle}>Search client</label>
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Name or phone"
                      style={inputStyle}
                      onFocus={onFocusAmber}
                      onBlur={onBlurCream}
                    />
                  </div>

                  {/* Search results */}
                  {clientSearch.trim().length >= 2 && clients.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {clients.map((client) => {
                        const active = selectedClient?.id === client.id;
                        return (
                          <button
                            key={client.id}
                            onClick={() => setSelectedClient(client)}
                            style={{
                              width: "100%",
                              textAlign: "start",
                              padding: "11px 14px",
                              borderRadius: 13,
                              background: "var(--color-surface)",
                              border: `1.5px solid ${active ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                              boxShadow: active ? "0 2px 8px rgba(232,146,10,0.12)" : "var(--shadow-sm)",
                              cursor: "pointer",
                              transition: "border-color 0.15s, box-shadow 0.15s",
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>{client.name}</div>
                            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                              {client.phone}{client.email && ` · ${client.email}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {clientSearch.trim().length >= 2 && clients.length === 0 && (
                    <p style={{ fontSize: 13, textAlign: "center", color: "var(--color-muted)", padding: "4px 0" }}>
                      No client matches &quot;{clientSearch.trim()}&quot;
                    </p>
                  )}

                  {/* Recent clients — shown when search is empty */}
                  {clientSearch.trim().length < 2 && recentClients.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", marginBottom: 8 }}>
                        Recent clients
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {recentClients.map((client) => {
                          const active = selectedClient?.id === client.id;
                          return (
                            <button
                              key={client.id}
                              onClick={() => setSelectedClient(client)}
                              style={{
                                width: "100%",
                                textAlign: "start",
                                padding: "11px 14px",
                                borderRadius: 13,
                                background: "var(--color-surface)",
                                border: `1.5px solid ${active ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                                boxShadow: active ? "0 2px 8px rgba(232,146,10,0.12)" : "var(--shadow-sm)",
                                cursor: "pointer",
                                transition: "border-color 0.15s, box-shadow 0.15s",
                              }}
                            >
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>{client.name}</div>
                              <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                                {client.phone}{client.email && ` · ${client.email}`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </>
              ) : (
                <>
                  <div>
                    <label style={labelStyle}>Full name *</label>
                    <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="e.g. Avi Cohen" style={inputStyle} onFocus={onFocusAmber} onBlur={onBlurCream} />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone *</label>
                    <input type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="05X-XXX-XXXX" style={inputStyle} onFocus={onFocusAmber} onBlur={onBlurCream} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email (optional)</label>
                    <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="name@example.com" style={inputStyle} onFocus={onFocusAmber} onBlur={onBlurCream} />
                  </div>
                  <button
                    onClick={() => setShowNewClient(false)}
                    style={{ width: "100%", height: 36, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--color-muted)", textAlign: "center" }}
                  >
                    ← Back to search
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Service ─────────────────────────────────────────── */}
          {step === "service" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedClient && (
                <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 4 }}>
                  Booking for <strong style={{ color: "var(--color-dark)" }}>{selectedClient.name}</strong>
                </p>
              )}
              {services.map((service) => {
                const active = selectedService?.id === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => { setSelectedService(service); setStep("datetime"); }}
                    style={{
                      width: "100%",
                      textAlign: "start",
                      padding: "13px 16px",
                      borderRadius: 14,
                      background: "var(--color-surface)",
                      border: `1.5px solid ${active ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                      boxShadow: active ? "0 2px 10px rgba(232,146,10,0.12)" : "var(--shadow-sm)",
                      cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s, transform 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(30,26,20,0.09)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = active ? "0 2px 10px rgba(232,146,10,0.12)" : "var(--shadow-sm)"; }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>{service.name}</div>
                    <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 3, display: "flex", gap: 12 }}>
                      <span>{service.duration} min</span>
                      <span>₪{service.price}</span>
                    </div>
                  </button>
                );
              })}

              {services.length === 0 && (
                <div style={{ ...cardStyle, padding: "40px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>No services yet</p>
                  <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 20 }}>Add a service in Settings before you can book.</p>
                  <button onClick={() => router.push("/settings")} style={{ height: 40, padding: "0 20px", borderRadius: 11, border: "none", background: "var(--wash-amber)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    Go to Settings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Date + time ─────────────────────────────────────── */}
          {step === "datetime" && selectedService && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => { if (e.target.value) { setSelectedDate(parseISO(e.target.value)); setSelectedTime(null); } }}
                  style={inputStyle}
                  onFocus={onFocusAmber}
                  onBlur={onBlurCream}
                />
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: 10 }}>
                  Available times · {selectedService.duration} min
                </label>
                {loadingSlots ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                    <Spinner />
                  </div>
                ) : slots.length === 0 ? (
                  <div style={{ ...cardStyle, padding: "32px 20px", textAlign: "center" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 4 }}>No times available</p>
                    <p style={{ fontSize: 13, color: "var(--color-muted)" }}>The day is full or closed. Try another date.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {slots.map((slot) => {
                      const active = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          style={{
                            padding: "10px 0",
                            borderRadius: 11,
                            fontSize: 13,
                            fontWeight: 600,
                            border: "1.5px solid",
                            cursor: slot.available ? "pointer" : "not-allowed",
                            transition: "all 0.12s",
                            ...(active
                              ? { background: "var(--color-amber)", color: "#fff", borderColor: "var(--color-amber)" }
                              : slot.available
                              ? { background: "var(--color-surface)", color: "var(--color-dark)", borderColor: "var(--color-cream-2)" }
                              : { background: "var(--color-cream)", color: "var(--color-muted)", borderColor: "transparent", textDecoration: "line-through" }),
                          }}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Confirm ─────────────────────────────────────────── */}
          {step === "confirm" && selectedClient && selectedService && selectedTime && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Summary */}
              <div style={{ ...cardStyle, padding: "16px 18px" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)", marginBottom: 12 }}>Booking summary</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Row label="Client"   value={selectedClient.name} />
                  <Row label="Service"  value={selectedService.name} />
                  <Row label="When"     value={`${format(selectedDate, "EEEE, MMM d")} at ${selectedTime}`} />
                  <Row label="Duration" value={`${selectedService.duration} min`} />
                  <Row label="Price"    value={`₪${selectedService.price}`} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Internal notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Special requests or notes…"
                  style={{ ...inputStyle, height: "auto", padding: "10px 13px", resize: "none" } as React.CSSProperties}
                  onFocus={onFocusAmber}
                  onBlur={onBlurCream}
                />
              </div>

              {/* Send confirmation email */}
              {(() => {
                const hasEmail = !!selectedClient.email;
                return (
                  <div
                    style={{ ...cardStyle, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, opacity: hasEmail ? 1 : 0.5 }}
                    title={hasEmail ? undefined : "No email on file for this client"}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>Send confirmation email</p>
                      <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                        {hasEmail ? `Send booking details to ${selectedClient.email}` : "No email on file"}
                      </p>
                    </div>
                    <button
                      onClick={() => hasEmail && setSendEmail((v) => !v)}
                      aria-label="Send confirmation email"
                      disabled={!hasEmail}
                      style={{
                        width: 44,
                        height: 26,
                        borderRadius: 99,
                        border: "none",
                        background: hasEmail && sendEmail ? "var(--color-amber)" : "var(--color-cream-2)",
                        position: "relative",
                        cursor: hasEmail ? "pointer" : "not-allowed",
                        flexShrink: 0,
                        transition: "background 0.2s",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#fff",
                          boxShadow: "0 1px 3px rgba(30,26,20,0.2)",
                          transition: "transform 0.18s",
                          transform: hasEmail && sendEmail ? "translateX(18px)" : "translateX(0)",
                        }}
                      />
                    </button>
                  </div>
                );
              })()}

              {/* Mark as paid */}
              <div style={{ ...cardStyle, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>Mark as paid</p>
                  <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>Record cash payment now</p>
                </div>
                <button
                  onClick={() => setMarkAsPaid((v) => !v)}
                  aria-label="Mark as paid"
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 99,
                    border: "none",
                    background: markAsPaid ? "var(--color-amber)" : "var(--color-cream-2)",
                    position: "relative",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 1px 3px rgba(30,26,20,0.2)",
                      transition: "transform 0.18s",
                      transform: markAsPaid ? "translateX(18px)" : "translateX(0)",
                    }}
                  />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderTop: "1px solid var(--color-cream-2)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "12px 20px", display: "flex", gap: 10 }}>
          {step !== "client" && <SecondaryBtn onClick={goBack}>Back</SecondaryBtn>}

          {step === "client" && (selectedClient || showNewClient) && (
            <PrimaryBtn
              onClick={handleClientNext}
              disabled={showNewClient ? !newClientName.trim() || !newClientPhone.trim() : !selectedClient}
            >
              Continue
            </PrimaryBtn>
          )}

          {step === "service" && selectedService && (
            <PrimaryBtn onClick={() => setStep("datetime")}>Continue</PrimaryBtn>
          )}

          {step === "datetime" && (
            <PrimaryBtn onClick={() => setStep("confirm")} disabled={!selectedTime}>Continue</PrimaryBtn>
          )}

          {step === "confirm" && (
            <PrimaryBtn onClick={createBooking} disabled={submitting}>
              {submitting ? "Confirming…" : "Confirm booking"}
            </PrimaryBtn>
          )}
        </div>
        {/* Mobile bottom nav spacer */}
        <div className="md:hidden" style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }} />
      </div>

    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

function SpinnerFull() {
  return (
    <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", background: "var(--color-cream)" }}>
      <Spinner />
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<SpinnerFull />}>
      <NewBookingInner />
    </Suspense>
  );
}
