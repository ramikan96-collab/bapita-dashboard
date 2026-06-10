"use client";

import { useState } from "react";
import type { Service, Business } from "@/types";

type Step = "service" | "date" | "time" | "info" | "done";

interface Props {
  business: Business;
  services: Service[];
}

export default function BookingFlow({ business, services }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  async function fetchSlots(date: string, service: Service) {
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime("");
    try {
      const res = await fetch(
        `/api/public/slots?businessId=${business.id}&date=${date}&duration=${service.duration}`
      );
      const data = await res.json();
      setSlots(data.slots || []);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedTime || !name || !phone) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          businessName: business.name,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceDuration: selectedService.duration,
          servicePrice: selectedService.price,
          date: selectedDate,
          time: selectedTime,
          customerName: name,
          customerPhone: phone,
          customerEmail: email || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setStep("done");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const formattedDate = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("he-IL", {
        weekday: "long", day: "numeric", month: "long",
      })
    : "";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-6 text-center">
        <div className="text-2xl font-black tracking-tight mb-1" style={{ color: "var(--color-dark)" }}>
          {business.name}
        </div>
        {business.address && (
          <div className="text-sm" style={{ color: "var(--color-muted)" }}>{business.address}</div>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 pb-24 max-w-md mx-auto w-full">

        {/* Step: service */}
        {step === "service" && (
          <div>
            <div className="text-base font-bold mb-4" style={{ color: "var(--color-dark)" }}>
              Choose a service
            </div>
            <div className="space-y-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep("date"); }}
                  className="w-full text-left p-4 rounded-2xl border-2 transition-all"
                  style={{
                    borderColor: "var(--color-cream-2)",
                    background: "#fff",
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm" style={{ color: "var(--color-dark)" }}>{s.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{s.duration} min</div>
                    </div>
                    <div className="font-black text-base" style={{ color: "var(--color-amber)" }}>₪{s.price}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: date */}
        {step === "date" && selectedService && (
          <div>
            <button onClick={() => setStep("service")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
              ← {selectedService.name}
            </button>
            <div className="text-base font-bold mb-4" style={{ color: "var(--color-dark)" }}>Choose a date</div>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                if (e.target.value) {
                  fetchSlots(e.target.value, selectedService);
                  setStep("time");
                }
              }}
              className="w-full px-4 py-3.5 rounded-2xl border text-sm outline-none"
              style={{ borderColor: "var(--color-cream-2)", background: "#fff", color: "var(--color-dark)" }}
            />
          </div>
        )}

        {/* Step: time */}
        {step === "time" && selectedService && (
          <div>
            <button onClick={() => setStep("date")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
              ← {formattedDate}
            </button>
            <div className="text-base font-bold mb-4" style={{ color: "var(--color-dark)" }}>Choose a time</div>
            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                     style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm font-medium mb-1" style={{ color: "var(--color-dark)" }}>No available slots</div>
                <div className="text-sm" style={{ color: "var(--color-muted)" }}>Try a different date</div>
                <button onClick={() => setStep("date")} className="mt-4 text-sm font-bold" style={{ color: "var(--color-amber)" }}>
                  Pick another date
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => { setSelectedTime(slot); setStep("info"); }}
                    className="py-3 rounded-xl text-sm font-bold transition-all border-2"
                    style={{
                      borderColor: selectedTime === slot ? "var(--color-amber)" : "var(--color-cream-2)",
                      background: selectedTime === slot ? "var(--color-amber)" : "#fff",
                      color: selectedTime === slot ? "#fff" : "var(--color-dark)",
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: info */}
        {step === "info" && (
          <div>
            <button onClick={() => setStep("time")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
              ← {selectedTime}
            </button>
            <div className="text-base font-bold mb-4" style={{ color: "var(--color-dark)" }}>Your details</div>

            {/* Summary card */}
            <div className="p-4 rounded-2xl mb-5" style={{ background: "#fff", border: "1px solid var(--color-cream-2)" }}>
              <div className="text-sm font-bold mb-2" style={{ color: "var(--color-dark)" }}>{selectedService?.name}</div>
              <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                {formattedDate} · {selectedTime} · {selectedService?.duration} min · ₪{selectedService?.price}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-muted)" }}>Full name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--color-cream-2)", background: "#fff", color: "var(--color-dark)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-muted)" }}>Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05X-XXX-XXXX"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--color-cream-2)", background: "#fff", color: "var(--color-dark)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-muted)" }}>Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "var(--color-cream-2)", background: "#fff", color: "var(--color-dark)" }}
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!name || !phone || submitting}
                className="w-full py-4 rounded-2xl text-sm font-black text-white mt-2 disabled:opacity-50 transition-opacity"
                style={{ background: "var(--color-amber)" }}
              >
                {submitting ? "Booking…" : "Confirm booking"}
              </button>
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-2xl"
                 style={{ background: "var(--color-amber)" }}>
              ✓
            </div>
            <div className="text-2xl font-black mb-2" style={{ color: "var(--color-dark)" }}>Booking confirmed!</div>
            <div className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>See you soon, {name}.</div>
            <div className="p-4 rounded-2xl w-full text-left" style={{ background: "#fff", border: "1px solid var(--color-cream-2)" }}>
              <div className="text-sm font-bold mb-2" style={{ color: "var(--color-dark)" }}>{selectedService?.name}</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-muted)" }}>
                <div>{formattedDate}</div>
                <div>{selectedTime}</div>
                <div>{business.name}</div>
                {business.phone && <div>{business.phone}</div>}
                {business.address && <div>{business.address}</div>}
              </div>
            </div>
            {email && (
              <p className="text-xs mt-4" style={{ color: "var(--color-muted)" }}>
                Confirmation sent to {email}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Powered by footer */}
      <div className="fixed bottom-0 inset-x-0 py-3 text-center text-xs" style={{ color: "var(--color-muted)", background: "var(--color-cream)" }}>
        Powered by{" "}
        <a href="https://bapita.com" className="font-bold" style={{ color: "var(--color-amber)" }}>
          Bapita
        </a>
      </div>
    </div>
  );
}
