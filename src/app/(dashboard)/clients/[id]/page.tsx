"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import type { Customer, Booking, Service } from "@/types";

interface BookingWithService extends Booking {
  service: Service;
}

function initials(name: string): string {
  return name
    .split(" ")
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

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { business } = useBusiness();
  const supabase = createClient();
  const clientId = params.id as string;

  const [client, setClient] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch client and booking history
  useEffect(() => {
    if (!business || !clientId) return;

    async function fetchData() {
      setLoading(true);
      
      // Fetch client
      const { data: clientData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", clientId)
        .eq("business_id", business.id)
        .single();
      
      setClient(clientData);
      setNotes(clientData?.notes || "");
      
      // Fetch booking history
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, service:services(name, duration, price)")
        .eq("customer_id", clientId)
        .eq("business_id", business.id)
        .order("appointment_datetime", { ascending: false });
      
      setBookings(bookingsData as BookingWithService[] || []);
      setLoading(false);
    }
    
    fetchData();
  }, [business, clientId, supabase]);

  // Save notes
  async function saveNotes() {
    if (!client) return;
    setSavingNotes(true);
    
    await supabase
      .from("customers")
      .update({ notes })
      .eq("id", client.id);
    
    setSavingNotes(false);
  }

  // Book again
  function bookAgain() {
    if (!client) return;
    router.push(`/new-booking?clientId=${client.id}`);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
             style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <span style={{ fontSize: 48 }}>👤</span>
        <p className="mt-3 font-bold" style={{ color: "var(--color-dark)" }}>Client not found</p>
        <button
          onClick={() => router.push("/clients")}
          className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "var(--color-amber)" }}
        >
          Back to clients
        </button>
      </div>
    );
  }

  const totalSpent = bookings.reduce((sum, b) => sum + (b.service?.price || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--color-cream-2)" }}>
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-black" style={{ color: "var(--color-dark)" }}>{client.name}</h1>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>{formatPhone(client.phone)}</p>
        </div>
        <button
          onClick={bookAgain}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "var(--color-amber)" }}
        >
          Book again
        </button>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="text-center">
          <div className="text-2xl font-black" style={{ color: "var(--color-dark)" }}>{client.total_visits || 0}</div>
          <div className="text-xs" style={{ color: "var(--color-muted)" }}>Visits</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black" style={{ color: "var(--color-dark)" }}>₪{totalSpent}</div>
          <div className="text-xs" style={{ color: "var(--color-muted)" }}>Total spent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black" style={{ color: "var(--color-dark)" }}>
            {client.last_visit_at ? format(parseISO(client.last_visit_at), "MMM d") : "—"}
          </div>
          <div className="text-xs" style={{ color: "var(--color-muted)" }}>Last visit</div>
        </div>
      </div>
      
      {/* Notes Section */}
      <div className="p-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-bold" style={{ color: "var(--color-dark)" }}>Internal notes</label>
          {notes !== (client.notes || "") && (
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="text-xs px-3 py-1 rounded-lg font-bold text-white disabled:opacity-50"
              style={{ background: "var(--color-amber)" }}
            >
              {savingNotes ? "Saving..." : "Save"}
            </button>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "var(--color-cream-2)" }}
          placeholder="Add notes about this client (preferences, allergies, special requests...)"
        />
      </div>
      
      {/* Booking History */}
      <div className="flex-1 p-4">
        <h2 className="font-bold mb-3" style={{ color: "var(--color-dark)" }}>Booking history</h2>
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <span style={{ fontSize: 32 }}>📅</span>
            <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>No past bookings</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="p-3 rounded-xl border"
                style={{ borderColor: "var(--color-cream-2)" }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm">{booking.service?.name || "Unknown service"}</div>
                    <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                      {format(parseISO(booking.appointment_datetime), "EEE, MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">₪{booking.service?.price || 0}</div>
                    <div className="text-xs px-2 py-0.5 rounded-full mt-1" style={{
                      background: booking.status === "completed" ? "#22c55e20" : booking.status === "cancelled" ? "#ef444420" : "var(--color-cream-2)",
                      color: booking.status === "completed" ? "#166534" : booking.status === "cancelled" ? "#b91c1c" : "var(--color-muted)",
                    }}>
                      {booking.status === "completed" ? "Completed" : booking.status === "cancelled" ? "Cancelled" : booking.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
