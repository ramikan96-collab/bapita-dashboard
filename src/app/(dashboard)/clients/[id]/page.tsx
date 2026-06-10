"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import {
  STATUS_BG,
  STATUS_COLOR,
  STATUS_LABEL,
  type Customer,
  type Booking,
  type Service,
  type BookingStatus,
} from "@/types";

interface BookingWithService extends Booking {
  service: Service | null;
}

const CARD_SHADOW = "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatPhone(phone: string): string {
  if (!phone) return "No phone";
  if (phone.length === 10 && phone.startsWith("05")) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return phone;
}

// appointment_date is "yyyy-MM-dd", appointment_time is "HH:MM[:SS]".
// Combine them — parsing the date alone always renders 12:00 AM.
function bookingDate(booking: BookingWithService): Date | null {
  if (!booking.appointment_date) return null;
  const time = booking.appointment_time || "00:00";
  try {
    return parseISO(`${booking.appointment_date}T${time}`);
  } catch {
    return null;
  }
}

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { business } = useBusiness();
  const { showToast } = useToast();
  const supabase = createClient();
  const clientId = params.id as string;

  const [client, setClient] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!business || !clientId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: clientData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", clientId)
        .eq("business_id", business.id)
        .single();

      setClient(clientData);
      setNotes(clientData?.notes || "");
      setSavedNotes(clientData?.notes || "");

      // Alias price:price_nis + duration:duration_minutes — the real column
      // names. Without the alias the embed returns null and prices render blank.
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, service:services(name, duration:duration_minutes, price:price_nis)")
        .eq("customer_id", clientId)
        .eq("business_id", business.id)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      setBookings((bookingsData as BookingWithService[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [business, clientId, supabase]);

  async function saveNotes() {
    if (!client) return;
    setSavingNotes(true);

    const { error } = await supabase
      .from("customers")
      .update({ notes })
      .eq("id", client.id)
      .eq("business_id", client.business_id);

    setSavingNotes(false);

    if (error) {
      showToast("Couldn't save notes", "error");
      return;
    }

    setSavedNotes(notes);
    setClient({ ...client, notes });
    showToast("Notes saved", "success");
  }

  function newBooking() {
    if (!client) return;
    router.push(`/new-booking?clientId=${client.id}`);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!client) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center p-6 text-center"
        style={{ background: "var(--color-cream)" }}
      >
        <span style={{ fontSize: 48 }}>👤</span>
        <p className="mt-3 text-[17px] font-bold text-dark">Client not found</p>
        <button
          onClick={() => router.push("/clients")}
          className="mt-4 bg-amber text-white font-semibold text-[15px] px-5 py-3 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
        >
          Back to clients
        </button>
      </div>
    );
  }

  // "Spent" = money actually earned: completed bookings only.
  const totalSpent = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.service?.price || 0), 0);

  const notesDirty = notes !== savedNotes;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "var(--color-cream)" }}>
      {/* Back row */}
      <div className="shrink-0 px-4 pt-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[14px] font-medium -ms-1 py-1"
          style={{ color: "var(--color-muted)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Clients
        </button>
      </div>

      <div className="px-4 pt-3 pb-6 space-y-3">
        {/* Identity + stats card */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-[20px] shrink-0"
              style={{ background: "var(--color-amber)", color: "#fff" }}
            >
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold leading-snug text-dark truncate">{client.name}</h1>
              <a
                href={`tel:${client.phone}`}
                className="text-[15px]"
                style={{ color: "var(--color-muted)" }}
              >
                {formatPhone(client.phone)}
              </a>
            </div>
          </div>

          <div
            className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t"
            style={{ borderColor: "var(--color-cream-2)" }}
          >
            <div className="text-center">
              <div className="text-[20px] font-extrabold text-dark">{client.total_visits || 0}</div>
              <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                Visits
              </div>
            </div>
            <div className="text-center">
              <div className="text-[20px] font-extrabold text-dark">₪{totalSpent}</div>
              <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                Total spent
              </div>
            </div>
            <div className="text-center">
              <div className="text-[20px] font-extrabold text-dark">
                {client.last_visit_at ? format(parseISO(client.last_visit_at), "MMM d") : "—"}
              </div>
              <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                Last visit
              </div>
            </div>
          </div>

          <button
            onClick={newBooking}
            className="w-full mt-4 bg-amber text-white font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
          >
            New booking for {client.name.split(/\s+/)[0]}
          </button>
        </div>

        {/* Internal notes */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[13px] font-medium text-dark">Internal notes</label>
            {notesDirty && (
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="text-[13px] font-semibold px-3 py-1 rounded-lg text-white disabled:opacity-50"
                style={{ background: "var(--color-amber)" }}
              >
                {savingNotes ? "Saving…" : "Save"}
              </button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-[10px] border bg-white text-[15px] text-dark placeholder:text-muted transition-colors focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30"
            style={{ borderColor: "var(--color-cream-2)" }}
            placeholder="Preferences, allergies, usual style…"
          />
        </div>

        {/* Booking history */}
        <div>
          <h2 className="text-[16px] font-semibold text-dark px-1 mb-2">Booking history</h2>
          {bookings.length === 0 ? (
            <div
              className="bg-white rounded-2xl p-8 text-center"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <span style={{ fontSize: 32 }}>📅</span>
              <p className="text-[15px] mt-2" style={{ color: "var(--color-muted)" }}>
                No bookings yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => {
                const dt = bookingDate(booking);
                const status = booking.status as BookingStatus;
                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-2xl p-4 flex justify-between items-start gap-3"
                    style={{ boxShadow: CARD_SHADOW }}
                  >
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-dark truncate">
                        {booking.service?.name || "Service"}
                      </div>
                      <div className="text-[13px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                        {dt ? format(dt, "EEE, MMM d, yyyy · h:mm a") : "Date unavailable"}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-[15px] font-bold text-dark">
                        ₪{booking.service?.price ?? 0}
                      </div>
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium mt-1"
                        style={{ background: STATUS_BG[status], color: STATUS_COLOR[status] }}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
