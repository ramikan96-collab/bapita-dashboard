"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import type { Service, Customer, BusinessHours, DayKey } from "@/types";

const DAY_NAMES: DayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getAvailableSlots(
  date: Date,
  durationMinutes: number,
  businessHours: BusinessHours | undefined | null,
  existingBookings: { appointment_time: string; service?: { duration: number } | null }[]
): string[] {
  const dayKey = DAY_NAMES[date.getDay()];
  const dayHours = businessHours?.[dayKey];

  const start = dayHours?.open ? dayHours.start : dayHours ? null : "09:00";
  const end   = dayHours?.open ? dayHours.end   : dayHours ? null : "19:00";
  if (!start || !end) return [];

  const [startH, startM] = start.split(":").map(Number);
  const [endH,   endM]   = end.split(":").map(Number);
  const openMinutes  = startH * 60 + startM;
  const closeMinutes = endH   * 60 + endM;

  const bookedRanges = existingBookings.map(b => {
    const [h, m] = b.appointment_time.split(":").map(Number);
    const s = h * 60 + m;
    return { start: s, end: s + (b.service?.duration ?? 30) };
  });

  const slots: string[] = [];
  for (let t = openMinutes; t + durationMinutes <= closeMinutes; t += durationMinutes) {
    const overlaps = bookedRanges.some(r => t < r.end && t + durationMinutes > r.start);
    if (!overlaps) {
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

type Step = "client" | "service" | "datetime" | "confirm";

interface AvailableSlot {
  time: Date;
  available: boolean;
}

export default function NewBookingPage() {
  const router = useRouter();
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("client");
  const [submitting, setSubmitting] = useState(false);
  
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<Customer[]>([]);
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!business || clientSearch.length < 2) {
      setClients([]);
      return;
    }
    
    const delay = setTimeout(async () => {
      if (!business) return;
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business.id)
        .ilike("name", `%${clientSearch}%`)
        .limit(10);
      
      setClients(data || []);
    }, 300);
    
    return () => clearTimeout(delay);
  }, [clientSearch, business, supabase]);

  useEffect(() => {
    if (!business) return;
    
    async function fetchServices() {
      if (!business) return;
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", business.id)
        .eq("active", true)
        .order("display_order");
      
      setServices(data || []);
    }
    
    fetchServices();
  }, [business, supabase]);

  useEffect(() => {
    if (!selectedDate || !selectedService || !business || step !== "datetime") return;
    
    async function fetchSlots() {
      if (!business || !selectedService) return;
      setLoadingSlots(true);

      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("appointment_time, service:services(duration)")
        .eq("business_id", business.id)
        .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
        .not("status", "eq", "cancelled");

      const slotStrings = getAvailableSlots(
        selectedDate,
        selectedService.duration,
        business.business_hours,
        existingBookings || []
      );

      const slots: AvailableSlot[] = slotStrings.map(timeStr => ({
        time: parseISO(`${format(selectedDate, "yyyy-MM-dd")}T${timeStr}`),
        available: true,
      }));

      setAvailableSlots(slots);
      setLoadingSlots(false);
    }
    
    fetchSlots();
  }, [selectedDate, selectedService, business, step, supabase]);

  async function createNewClient(): Promise<Customer | null> {
    if (!business) return null;
    
    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_id: business.id,
        name: newClientName,
        phone: newClientPhone,
        email: newClientEmail || null,
        total_visits: 0
      })
      .select()
      .single();
    
    if (error) {
      alert("Error creating client");
      return null;
    }
    
    return data;
  }

  async function createBooking() {
    if (!business || !selectedClient || !selectedService || !selectedTime) return;
    
    setSubmitting(true);
    
    const appointmentDateTime = parseISO(
      `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`
    );
    
    const { error } = await supabase
      .from("bookings")
      .insert({
        business_id: business.id,
        customer_id: selectedClient.id,
        service_id: selectedService.id,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        appointment_time: selectedTime,
        appointment_datetime: appointmentDateTime.toISOString(),
        status: "confirmed",
        payment_status: "none",
        notes: notes || null
      });
    
    if (error) {
      alert("Error creating booking");
      setSubmitting(false);
      return;
    }

    if (selectedClient?.email || newClientEmail) {
      fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: selectedClient?.name || newClientName,
          customerEmail: selectedClient?.email || newClientEmail || "",
          businessName: business?.name || "",
          serviceName: selectedService?.name || "",
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
        }),
      }).catch(console.error);
    }

    router.push("/calendar");
  }

  async function handleClientNext() {
    if (showNewClient) {
      const newClient = await createNewClient();
      if (newClient) {
        setSelectedClient(newClient);
        setStep("service");
      }
    } else if (selectedClient) {
      setStep("service");
    }
  }

  if (bizLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" 
             style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--color-dark)" }}>New Booking</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
          Step {step === "client" ? "1" : step === "service" ? "2" : step === "datetime" ? "3" : "4"} of 4
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {step === "client" && (
          <div className="space-y-4">
            {!showNewClient ? (
              <>
                <div>
                  <label className="text-sm font-bold mb-1 block">Search existing client</label>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Type name or phone..."
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{ borderColor: "var(--color-cream-2)" }}
                  />
                </div>
                
                {clients.length > 0 && (
                  <div className="space-y-2">
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`w-full text-left p-3 rounded-xl border transition ${
                          selectedClient?.id === client.id ? "border-amber-500 bg-amber-50" : "border-gray-200"
                        }`}
                      >
                        <div className="font-bold">{client.name}</div>
                        <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                          {client.phone} {client.email && `· ${client.email}`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => setShowNewClient(true)}
                  className="w-full py-3 rounded-xl text-sm font-bold"
                  style={{ background: "var(--color-cream-2)", color: "var(--color-dark)" }}
                >
                  + New client
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-bold mb-1 block">Full name *</label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold mb-1 block">Phone *</label>
                  <input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold mb-1 block">Email (optional)</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200"
                  />
                </div>
                <button
                  onClick={() => setShowNewClient(false)}
                  className="w-full py-3 rounded-xl text-sm"
                  style={{ color: "var(--color-muted)" }}
                >
                  ← Back to search
                </button>
              </>
            )}
          </div>
        )}

        {step === "service" && (
          <div className="space-y-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  setStep("datetime");
                }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-amber-300 transition"
              >
                <div className="font-bold">{service.name}</div>
                <div className="text-sm flex gap-3 mt-1" style={{ color: "var(--color-muted)" }}>
                  <span>{service.duration} min</span>
                  <span>₪{service.price}</span>
                </div>
              </button>
            ))}
            
            {services.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>No services found. Add services in Settings first.</p>
                <a href="/settings" className="inline-block mt-4 px-5 py-2 rounded-xl text-sm font-bold" style={{ background: "var(--color-amber)", color: "#fff" }}>Go to Settings</a>
              </div>
            )}
          </div>
        )}

        {step === "datetime" && selectedService && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold mb-2 block">Date</label>
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
              />
            </div>
            
            <div>
              <label className="text-sm font-bold mb-2 block">Available times ({selectedService.duration} min)</label>
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTime(format(slot.time, "HH:mm"))}
                      disabled={!slot.available}
                      className={`py-2 rounded-lg text-sm font-medium transition ${
                        selectedTime === format(slot.time, "HH:mm")
                          ? "bg-amber-500 text-white"
                          : slot.available ? "bg-gray-100 text-gray-800" : "bg-gray-100 text-gray-400 line-through cursor-not-allowed"
                      }`}
                    >
                      {format(slot.time, "h:mm a")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "confirm" && selectedClient && selectedService && selectedTime && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-2)" }}>
              <div className="font-bold mb-2">Booking summary</div>
              <div className="text-sm space-y-2">
                <div><span className="opacity-60">Client:</span> {selectedClient.name}</div>
                <div><span className="opacity-60">Service:</span> {selectedService.name}</div>
                <div><span className="opacity-60">When:</span> {format(selectedDate, "EEEE, MMM d")} at {selectedTime}</div>
                <div><span className="opacity-60">Duration:</span> {selectedService.duration} min</div>
                <div><span className="opacity-60">Price:</span> ₪{selectedService.price}</div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-bold mb-1 block">Internal notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
                placeholder="Any special requests or notes for this booking..."
              />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 border-t flex gap-3" style={{ borderColor: "var(--color-cream-2)" }}>
        {step !== "client" && (
          <button
            onClick={() => {
              if (step === "service") setStep("client");
              else if (step === "datetime") setStep("service");
              else if (step === "confirm") setStep("datetime");
            }}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: "var(--color-cream-2)", color: "var(--color-dark)" }}
          >
            Back
          </button>
        )}
        
        {step === "datetime" && selectedTime && (
          <button onClick={() => setStep("confirm")} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "var(--color-amber)" }}>Continue</button>
        )}
        
        {step === "confirm" && (
          <button onClick={createBooking} disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: "var(--color-amber)" }}>
            {submitting ? "Creating..." : "Confirm Booking"}
          </button>
        )}
        
        {(step === "client" && (selectedClient || showNewClient)) && (
          <button onClick={handleClientNext} disabled={showNewClient ? !newClientName : !selectedClient} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: "var(--color-amber)" }}>Continue</button>
        )}
        
        {step === "service" && selectedService && (
          <button onClick={() => setStep("datetime")} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "var(--color-amber)" }}>Continue</button>
        )}
      </div>
    </div>
  );
}
