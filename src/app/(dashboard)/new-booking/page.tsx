"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import { getAvailableSlots, type TimeSlot } from "@/lib/availability";
import type { Service, Customer } from "@/types";

const CARD_SHADOW = "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)";

type Step = "client" | "service" | "datetime" | "confirm";
const STEP_ORDER: Step[] = ["client", "service", "datetime", "confirm"];
const STEP_LABEL: Record<Step, string> = {
  client: "Client",
  service: "Service",
  datetime: "Time",
  confirm: "Confirm",
};

function Spinner() {
  return (
    <div
      className="w-6 h-6 rounded-full border-2 animate-spin"
      style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
    />
  );
}

function NewBookingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date"); // yyyy-MM-dd, from tap-to-book
  const timeParam = searchParams.get("time"); // HH:MM, from tap-to-book
  const clientIdParam = searchParams.get("clientId"); // from client profile
  const { business, loading: bizLoading } = useBusiness();
  const { showToast } = useToast();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("client");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<Customer[]>([]);
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [preselecting, setPreselecting] = useState(!!clientIdParam);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(dateParam ? parseISO(dateParam) : new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(timeParam ?? null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [notes, setNotes] = useState("");
  const [markAsPaid, setMarkAsPaid] = useState(false);

  // ─── Preselect client from ?clientId= → jump to Service step ───────────
  useEffect(() => {
    if (!business || !clientIdParam) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business.id)
        .eq("id", clientIdParam)
        .single();
      if (cancelled) return;
      if (data) {
        setSelectedClient(data);
        setStep("service");
      }
      setPreselecting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [business, clientIdParam, supabase]);

  // ─── Client search (name OR phone) ─────────────────────────────────────
  useEffect(() => {
    if (!business || clientSearch.trim().length < 2) {
      setClients([]);
      return;
    }
    const q = clientSearch.trim();
    const delay = setTimeout(async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business.id)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10);
      setClients(data || []);
    }, 300);
    return () => clearTimeout(delay);
  }, [clientSearch, business, supabase]);

  // ─── Services ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!business) return;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, duration:duration_minutes, price:price_nis, active, display_order, business_id")
        .eq("business_id", business.id)
        .eq("active", true)
        .order("display_order");
      setServices(data || []);
    })();
  }, [business, supabase]);

  // ─── Available slots ───────────────────────────────────────────────────
  useEffect(() => {
    if (!business || !selectedService || step !== "datetime") return;
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      const { data: existing } = await supabase
        .from("bookings")
        .select("appointment_time, service:services(duration:duration_minutes)")
        .eq("business_id", business.id)
        .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
        .not("status", "eq", "cancelled");

      if (cancelled) return;

      const next = getAvailableSlots(
        selectedDate,
        selectedService.duration,
        business.business_hours,
        (existing || []) as unknown as { appointment_time: string; service?: { duration: number } | null }[]
      );

      // Keep a prefilled time only if it's still bookable.
      if (selectedTime && !next.some((s) => s.time === selectedTime && s.available)) {
        setSelectedTime(null);
      }
      setSlots(next);
      setLoadingSlots(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedService, business, step, supabase]);

  async function createNewClient(): Promise<Customer | null> {
    if (!business) return null;
    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_id: business.id,
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim() || null,
        total_visits: 0,
      })
      .select()
      .single();
    if (error) {
      showToast("Couldn't save the client. Please try again.", "error");
      return null;
    }
    return data;
  }

  async function handleClientNext() {
    if (showNewClient) {
      if (!newClientName.trim() || !newClientPhone.trim()) {
        showToast("Name and phone are required.", "error");
        return;
      }
      const created = await createNewClient();
      if (created) {
        setSelectedClient(created);
        setShowNewClient(false);
        setStep("service");
      }
    } else if (selectedClient) {
      setStep("service");
    }
  }

  async function createBooking() {
    if (!business || !selectedClient || !selectedService || !selectedTime) {
      showToast("Something's missing. Check the booking details.", "error");
      return;
    }
    setSubmitting(true);

    const appointmentDateTime = parseISO(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`);

    const { error } = await supabase.from("bookings").insert({
      business_id: business.id,
      customer_id: selectedClient.id,
      service_id: selectedService.id,
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
      appointment_time: selectedTime,
      appointment_datetime: appointmentDateTime.toISOString(),
      status: "confirmed",
      payment_status: markAsPaid ? "cash" : "none",
      notes: notes.trim() || null,
    });

    if (error) {
      showToast("Couldn't create the booking. Please try again.", "error");
      setSubmitting(false);
      return;
    }

    if (selectedClient.email) {
      fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: selectedClient.name,
          customerEmail: selectedClient.email,
          businessName: business.name || "",
          serviceName: selectedService.name || "",
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
        }),
      }).catch(console.error);
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
    setSlots([]);
    if (selectedClient && clientIdParam) {
      // Keep the pinned client, go straight to picking another service.
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

  // ─── Render states ─────────────────────────────────────────────────────

  if (bizLoading || preselecting) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <Spinner />
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center px-8 text-center"
        style={{ background: "var(--color-cream)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ background: "var(--color-amber)", color: "#fff" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-[22px] font-extrabold text-dark">Booking confirmed</h1>
        <p className="text-[15px] mt-1 max-w-[280px]" style={{ color: "var(--color-muted)" }}>
          {selectedClient?.name} · {selectedService?.name}
          <br />
          {format(selectedDate, "EEEE, MMM d")} at {selectedTime}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[280px] mt-8">
          <button
            onClick={() => router.push("/calendar")}
            className="w-full bg-amber text-white font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
          >
            Go to calendar
          </button>
          <button
            onClick={resetWizard}
            className="w-full font-medium text-[15px] py-3.5 rounded-xl border bg-transparent text-dark hover:bg-cream transition-colors"
            style={{ borderColor: "var(--color-cream-2)" }}
          >
            Add another booking
          </button>
        </div>
      </div>
    );
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header + step indicator */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-white border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-[22px] font-extrabold text-dark">New booking</h1>
          <span className="text-[13px] font-medium" style={{ color: "var(--color-muted)" }}>
            Step {stepIndex + 1} of 4 · {STEP_LABEL[step]}
          </span>
        </div>
        <div className="flex gap-1.5 mt-3">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: i <= stepIndex ? "var(--color-amber)" : "var(--color-cream-2)" }}
            />
          ))}
        </div>
      </div>

      {/* Step body */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ─── Step 1: Client ─────────────────────────────────────────── */}
        {step === "client" && (
          <div className="space-y-4">
            {!showNewClient ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-dark">Search existing client</label>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search by name or phone"
                    className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                    style={{ borderColor: "var(--color-cream-2)" }}
                  />
                </div>

                {clients.length > 0 && (
                  <div className="space-y-2">
                    {clients.map((client) => {
                      const active = selectedClient?.id === client.id;
                      return (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="w-full text-start p-3 rounded-xl border bg-white transition-colors"
                          style={{
                            borderColor: active ? "var(--color-amber)" : "var(--color-cream-2)",
                            boxShadow: active ? "0 0 0 1px var(--color-amber)" : "none",
                          }}
                        >
                          <div className="text-[15px] font-bold text-dark">{client.name}</div>
                          <div className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                            {client.phone}
                            {client.email && ` · ${client.email}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {clientSearch.trim().length >= 2 && clients.length === 0 && (
                  <p className="text-[14px] text-center py-2" style={{ color: "var(--color-muted)" }}>
                    No client matches &quot;{clientSearch.trim()}&quot;.
                  </p>
                )}

                <button
                  onClick={() => setShowNewClient(true)}
                  className="w-full py-3.5 rounded-xl text-[15px] font-semibold border bg-transparent text-dark hover:bg-cream transition-colors"
                  style={{ borderColor: "var(--color-cream-2)" }}
                >
                  + New client
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-dark">Full name *</label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="e.g. Avi Cohen"
                    className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                    style={{ borderColor: "var(--color-cream-2)" }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-dark">Phone *</label>
                  <input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="05X-XXX-XXXX"
                    className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                    style={{ borderColor: "var(--color-cream-2)" }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-dark">Email (optional)</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                    style={{ borderColor: "var(--color-cream-2)" }}
                  />
                </div>
                <button
                  onClick={() => setShowNewClient(false)}
                  className="w-full py-3 rounded-xl text-[14px] font-medium"
                  style={{ color: "var(--color-muted)" }}
                >
                  ← Back to search
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── Step 2: Service ────────────────────────────────────────── */}
        {step === "service" && (
          <div className="space-y-2.5">
            {selectedClient && (
              <p className="text-[13px] mb-1" style={{ color: "var(--color-muted)" }}>
                Booking for <span className="font-semibold text-dark">{selectedClient.name}</span>
              </p>
            )}
            {services.map((service) => {
              const active = selectedService?.id === service.id;
              return (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setStep("datetime");
                  }}
                  className="w-full text-start bg-white rounded-2xl p-4 border transition-colors active:scale-[0.98]"
                  style={{
                    borderColor: active ? "var(--color-amber)" : "transparent",
                    boxShadow: CARD_SHADOW,
                  }}
                >
                  <div className="text-[16px] font-bold text-dark">{service.name}</div>
                  <div className="text-[14px] flex gap-3 mt-1" style={{ color: "var(--color-muted)" }}>
                    <span>{service.duration} min</span>
                    <span>₪{service.price}</span>
                  </div>
                </button>
              );
            })}

            {services.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[15px] font-bold text-dark">No services yet</p>
                <p className="text-[14px] mt-1" style={{ color: "var(--color-muted)" }}>
                  Add a service in Settings before you can book.
                </p>
                <button
                  onClick={() => router.push("/settings")}
                  className="inline-block mt-5 bg-amber text-white font-semibold text-[15px] px-5 py-3 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
                >
                  Go to Settings
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Date + time ────────────────────────────────────── */}
        {step === "datetime" && selectedService && (
          <div className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-dark">Date</label>
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(parseISO(e.target.value));
                    setSelectedTime(null);
                  }
                }}
                className="h-12 px-4 rounded-[10px] border bg-white text-[15px] text-dark focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                style={{ borderColor: "var(--color-cream-2)" }}
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-dark mb-2 block">
                Available times · {selectedService.duration} min
              </label>
              {loadingSlots ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-10 px-6 bg-white rounded-2xl" style={{ boxShadow: CARD_SHADOW }}>
                  <p className="text-[15px] font-bold text-dark">No times available</p>
                  <p className="text-[14px] mt-1" style={{ color: "var(--color-muted)" }}>
                    The day is full or closed. Try another date.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => {
                    const active = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && setSelectedTime(slot.time)}
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
          </div>
        )}

        {/* ─── Step 4: Confirm ────────────────────────────────────────── */}
        {step === "confirm" && selectedClient && selectedService && selectedTime && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: CARD_SHADOW }}>
              <div className="text-[16px] font-bold text-dark mb-3">Booking summary</div>
              <div className="space-y-2.5 text-[15px]">
                <Row label="Client" value={selectedClient.name} />
                <Row label="Service" value={selectedService.name} />
                <Row label="When" value={`${format(selectedDate, "EEEE, MMM d")} at ${selectedTime}`} />
                <Row label="Duration" value={`${selectedService.duration} min`} />
                <Row label="Price" value={`₪${selectedService.price}`} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-dark">Internal notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Special requests or notes for this booking…"
                className="px-4 py-3 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors resize-none"
                style={{ borderColor: "var(--color-cream-2)" }}
              />
            </div>

            {/* Mark as paid toggle */}
            <div
              className="flex items-center justify-between bg-white rounded-2xl p-4"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div>
                <p className="text-[15px] font-bold text-dark">Mark as paid</p>
                <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                  Record cash payment now
                </p>
              </div>
              <button
                onClick={() => setMarkAsPaid((v) => !v)}
                className="relative shrink-0 rounded-full transition-colors"
                style={{
                  width: 44,
                  height: 26,
                  background: markAsPaid ? "var(--color-amber)" : "var(--color-cream-2)",
                }}
                aria-label="Mark as paid"
              >
                <span
                  className="absolute top-1 rounded-full bg-white"
                  style={{
                    width: 18,
                    height: 18,
                    left: 4,
                    boxShadow: "0 1px 3px rgba(30,26,20,0.2)",
                    transition: "transform 0.15s",
                    transform: markAsPaid ? "translateX(18px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 p-4 bg-white border-t flex gap-3" style={{ borderColor: "var(--color-cream-2)" }}>
        {step !== "client" && (
          <button
            onClick={goBack}
            className="flex-1 py-3.5 rounded-xl text-[15px] font-semibold border bg-transparent text-dark hover:bg-cream transition-colors"
            style={{ borderColor: "var(--color-cream-2)" }}
          >
            Back
          </button>
        )}

        {step === "client" && (selectedClient || showNewClient) && (
          <button
            onClick={handleClientNext}
            disabled={showNewClient ? !newClientName.trim() || !newClientPhone.trim() : !selectedClient}
            className="flex-1 bg-amber text-white font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors disabled:opacity-50"
          >
            Continue
          </button>
        )}

        {step === "service" && selectedService && (
          <button
            onClick={() => setStep("datetime")}
            className="flex-1 bg-amber text-white font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
          >
            Continue
          </button>
        )}

        {step === "datetime" && (
          <button
            onClick={() => setStep("confirm")}
            disabled={!selectedTime}
            className="flex-1 bg-amber text-white font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors disabled:opacity-50"
          >
            Continue
          </button>
        )}

        {step === "confirm" && (
          <button
            onClick={createBooking}
            disabled={submitting}
            className="flex-1 bg-amber text-white font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors disabled:opacity-50"
          >
            {submitting ? "Confirming…" : "Confirm booking"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: "var(--color-muted)" }}>{label}</span>
      <span className="font-medium text-dark text-end">{value}</span>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
          <Spinner />
        </div>
      }
    >
      <NewBookingInner />
    </Suspense>
  );
}
