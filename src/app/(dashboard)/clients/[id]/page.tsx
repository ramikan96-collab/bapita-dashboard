"use client";

import { useState, useEffect, useMemo } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  if (!phone) return "—";
  if (phone.length === 10 && phone.startsWith("05")) {
    return `${phone.slice(0, 3)}.${phone.slice(3, 6)}.${phone.slice(6)}`;
  }
  return phone;
}

// Israeli local numbers (05X...) map to the 972 country code for wa.me.
function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
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

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

// Same palette/logic as the clients list page so a client's color
// stays consistent between the table and this profile.
const AVATAR_COLORS = [
  { bg: "#FEF3C7", text: "#D97706" },
  { bg: "#DBEAFE", text: "#1D4ED8" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#EDE9FE", text: "#6D28D9" },
  { bg: "#FCE7F3", text: "#BE185D" },
  { bg: "#FEE2E2", text: "#B91C1C" },
];

function Avatar({
  name,
  size = 34,
  radius = 10,
  fontSize = 12,
}: {
  name: string;
  size?: number;
  radius?: number;
  fontSize?: number;
}) {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: color.bg,
        color: color.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.29 6.29l1.27-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" />
    </svg>
  );
}

function IconWA() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function IconNote() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconUpcoming() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M12 14v3M12 14h2" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ height: 168, borderRadius: 16, background: "white", boxShadow: "0 1px 3px rgba(30,26,20,0.06)" }} />
      <div style={{ height: 92, borderRadius: 16, background: "white", boxShadow: "0 1px 3px rgba(30,26,20,0.06)" }} />
      <div style={{ height: 64, borderRadius: 13, background: "white", boxShadow: "0 1px 3px rgba(30,26,20,0.06)" }} />
      <div style={{ height: 64, borderRadius: 13, background: "white", boxShadow: "0 1px 3px rgba(30,26,20,0.06)" }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { business } = useBusiness();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>
        <div style={{ flexShrink: 0, background: "white", borderBottom: "1px solid var(--color-cream-2)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "16px 24px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)" }}>Clients</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "20px 24px 64px" }}>
            <ProfileSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!client) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", background: "var(--color-cream)", padding: 24, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--amber-soft)", color: "var(--color-amber)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 26 }}>
          👤
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>Client not found</p>
        <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 20 }}>This client may have been removed</p>
        <button
          onClick={() => router.push("/clients")}
          style={{ height: 34, padding: "0 18px", borderRadius: 9, background: "var(--color-amber)", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(232,146,10,0.28)" }}
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

  const now = new Date();

  const upcomingBookings = bookings
    .filter((b) => {
      const dt = bookingDate(b);
      return dt && dt > now && b.status !== "cancelled";
    })
    .sort((a, b) => bookingDate(a)!.getTime() - bookingDate(b)!.getTime());

  const pastBookings = bookings.filter((b) => {
    const dt = bookingDate(b);
    return !dt || dt <= now || b.status === "cancelled";
  });

  const notesDirty = notes !== savedNotes;
  const isNew = !client.total_visits || client.total_visits === 0;
  const email = (client as any).email as string | undefined;

  return (
    <>
      <style>{`
        .back-link {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 2px;
          transition: color 0.15s;
        }
        .back-link:hover { color: var(--color-amber); }

        .profile-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 38px;
          border-radius: 10px;
          border: 1.5px solid var(--color-cream-2);
          background: white;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-dark);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          text-decoration: none;
        }
        .profile-action-btn:hover {
          background: var(--color-cream);
          border-color: var(--color-amber);
          transform: translateY(-1px);
        }

        .booking-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 13px;
          background: white;
          box-shadow: 0 1px 3px rgba(30,26,20,0.06);
          border: 1.5px solid transparent;
          transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
        }
        .booking-row:hover {
          box-shadow: 0 4px 16px rgba(30,26,20,0.09), 0 1px 2px rgba(30,26,20,0.04);
          transform: translateY(-1px);
          border-color: var(--color-cream-2);
        }
        .booking-row.upcoming { border-color: var(--color-amber); }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, background: "white", borderBottom: "1px solid var(--color-cream-2)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => router.back()} className="back-link">
              <IconBack />
              Clients
            </button>

            <button
              onClick={() => router.push(`/new-booking?clientId=${client.id}`)}
              style={{ height: 34, padding: "0 14px", borderRadius: 9, background: "var(--color-amber)", color: "white", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(232,146,10,0.28)", transition: "all 0.15s ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(232,146,10,0.36)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(232,146,10,0.28)"; }}
            >
              <IconPlus />
              New booking
            </button>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "20px 24px 64px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Identity + stats + quick actions */}
            <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 3px rgba(30,26,20,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "flex-start", gap: 16 }}>
                <Avatar name={client.name} size={52} radius={14} fontSize={18} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-dark)", margin: 0, letterSpacing: "-0.01em" }}>
                      {client.name}
                    </h1>
                    {isNew && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#E8F0FE", color: "#1A73E8" }}>
                        New
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--color-muted)", display: "flex" }}><IconPhone /></span>
                      <span style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500 }}>{formatPhone(client.phone)}</span>
                    </div>
                    {email && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--color-muted)", display: "flex" }}><IconMail /></span>
                        <span style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid var(--color-cream-2)", borderBottom: client.phone ? "1px solid var(--color-cream-2)" : "none" }}>
                {[
                  { value: String(client.total_visits || 0), label: "Visits" },
                  { value: `₪${totalSpent}`, label: "Total spent" },
                  { value: client.last_visit_at ? format(parseISO(client.last_visit_at), "MMM d") : "—", label: "Last visit" },
                ].map((stat, i) => (
                  <div key={stat.label} style={{ padding: "14px 8px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--color-cream-2)" : "none" }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--color-dark)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              {client.phone && (
                <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <a href={whatsappLink(client.phone)} target="_blank" rel="noopener noreferrer" className="profile-action-btn" style={{ color: "#25D366" }}>
                    <IconWA />
                    WhatsApp
                  </a>
                  <a href={`tel:${client.phone}`} className="profile-action-btn">
                    <IconPhone />
                    Call
                  </a>
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 3px rgba(30,26,20,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: "var(--color-muted)", display: "flex" }}><IconNote /></span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes</span>
                </div>
                {notesDirty && (
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    style={{ height: 28, padding: "0 12px", borderRadius: 7, background: "var(--color-amber)", color: "white", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", opacity: savingNotes ? 0.6 : 1, transition: "opacity 0.15s" }}
                  >
                    {savingNotes ? "Saving…" : "Save"}
                  </button>
                )}
              </div>
              <div style={{ padding: "10px 16px 16px" }}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Preferences, allergies, usual style…"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1.5px solid var(--color-cream-2)",
                    background: "var(--color-cream)",
                    fontSize: 13,
                    color: "var(--color-dark)",
                    resize: "none",
                    outline: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                />
              </div>
            </div>

            {/* Booking history */}
            {bookings.length === 0 ? (
              <div style={{ background: "white", borderRadius: 16, padding: "40px 20px", textAlign: "center", boxShadow: "0 1px 3px rgba(30,26,20,0.06)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--amber-soft)", color: "var(--color-amber)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <IconUpcoming />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", margin: 0 }}>No bookings yet</p>
                <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>This client hasn't booked an appointment</p>
              </div>
            ) : (
              <>
                {/* Upcoming */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 4px 8px" }}>
                    <span style={{ color: "var(--color-muted)", display: "flex" }}><IconUpcoming /></span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Upcoming</span>
                    {upcomingBookings.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "var(--color-cream-2)", color: "var(--color-muted)", padding: "1px 7px", borderRadius: 20 }}>
                        {upcomingBookings.length}
                      </span>
                    )}
                  </div>
                  {upcomingBookings.length === 0 ? (
                    <div style={{ background: "white", borderRadius: 13, padding: "16px", textAlign: "center", boxShadow: "0 1px 3px rgba(30,26,20,0.06)" }}>
                      <span style={{ fontSize: 12, color: "var(--color-muted)" }}>No upcoming appointments</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {upcomingBookings.map((booking) => (
                        <BookingRow key={booking.id} booking={booking} upcoming />
                      ))}
                    </div>
                  )}
                </div>

                {/* Past */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 4px 8px" }}>
                    <span style={{ color: "var(--color-muted)", display: "flex" }}><IconHistory /></span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Past appointments</span>
                    {pastBookings.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "var(--color-cream-2)", color: "var(--color-muted)", padding: "1px 7px", borderRadius: 20 }}>
                        {pastBookings.length}
                      </span>
                    )}
                  </div>
                  {pastBookings.length === 0 ? (
                    <div style={{ background: "white", borderRadius: 13, padding: "16px", textAlign: "center", boxShadow: "0 1px 3px rgba(30,26,20,0.06)" }}>
                      <span style={{ fontSize: 12, color: "var(--color-muted)" }}>No past appointments</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pastBookings.map((booking) => (
                        <BookingRow key={booking.id} booking={booking} upcoming={false} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Booking Row ──────────────────────────────────────────────────────────────

function BookingRow({ booking, upcoming }: { booking: BookingWithService; upcoming: boolean }) {
  const dt = bookingDate(booking);
  const status = booking.status as BookingStatus;

  return (
    <div className={`booking-row${upcoming ? " upcoming" : ""}`}>
      {/* Date block */}
      <div style={{ flexShrink: 0, width: 42, textAlign: "center" }}>
        {dt ? (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: upcoming ? "var(--color-amber)" : "var(--color-muted)" }}>
              {format(dt, "MMM")}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-dark)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              {format(dt, "d")}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-muted)" }}>
              {format(dt, "EEE")}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--color-muted)" }}>—</div>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-cream-2)", flexShrink: 0 }} />

      {/* Service + time */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {booking.service?.name || "Service"}
        </p>
        {dt && (
          <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2, fontWeight: 500 }}>
            {format(dt, "h:mm a")}
            {booking.service?.duration && <span style={{ marginLeft: 6 }}>· {booking.service.duration} min</span>}
          </p>
        )}
      </div>

      {/* Price + status */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-dark)", letterSpacing: "-0.01em" }}>
          ₪{booking.service?.price ?? 0}
        </div>
        <span
          style={{
            display: "inline-flex",
            marginTop: 4,
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.02em",
            background: STATUS_BG[status],
            color: STATUS_COLOR[status],
          }}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>
    </div>
  );
}
