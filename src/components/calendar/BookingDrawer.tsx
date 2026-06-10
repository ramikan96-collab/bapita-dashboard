"use client";

import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatTime(t: string) {
  return t.substring(0, 5);
}

function formatEndTime(time: string, duration: number) {
  const [h, m] = time.split(":").map(Number);
  const endMins = h * 60 + m + duration;
  return `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;
}

// ─── Checkout modal ────────────────────────────────────────────────────────

interface CheckoutProps {
  booking: Booking;
  onDone: (updated: Partial<Booking>) => void;
  onClose: () => void;
}

function CheckoutModal({ booking, onDone, onClose }: CheckoutProps) {
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handlePay(method: PaymentStatus) {
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed", payment_status: method, checkout_at: new Date().toISOString() })
      .eq("id", booking.id);

    if (!error) {
      onDone({ status: "completed", payment_status: method });
    }
    setSaving(false);
  }

  const methods: { key: PaymentStatus; label: string; emoji: string }[] = [
    { key: "cash",     label: "Cash",          emoji: "💵" },
    { key: "transfer", label: "Bank Transfer",  emoji: "🏦" },
    { key: "none",     label: "Unpaid",         emoji: "⏳" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md rounded-t-2xl px-6 pt-6 pb-10 shadow-2xl"
        style={{ background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--color-cream-2)" }} />
        <p className="text-center font-black text-lg mb-1" style={{ color: "var(--color-dark)" }}>
          How did they pay?
        </p>
        <p className="text-center text-xs mb-6" style={{ color: "var(--color-muted)" }}>
          {booking.customer_name} · {booking.service?.name}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {methods.map(({ key, label, emoji }) => (
            <button
              key={key}
              disabled={saving}
              onClick={() => handlePay(key)}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all disabled:opacity-50"
              style={{
                borderColor: "var(--color-cream-2)",
                background: "var(--color-cream)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-amber)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-cream-2)";
              }}
            >
              <span style={{ fontSize: 24 }}>{emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-dark)" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main drawer ───────────────────────────────────────────────────────────

interface Props {
  booking: Booking;
  onClose: () => void;
  onUpdated: (updated: Partial<Booking>) => void;
}

export default function BookingDrawer({ booking, onClose, onUpdated }: Props) {
  const [current, setCurrent] = useState<Booking>(booking);
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [showCheckout, setShowCheckout] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleNotesChange(val: string) {
    setNotes(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from("bookings").update({ notes: val }).eq("id", current.id);
    }, 800);
  }

  async function updateStatus(status: BookingStatus) {
    setActionLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", current.id);
    if (!error) {
      const updated = { ...current, status };
      setCurrent(updated);
      onUpdated({ status });
    }
    setActionLoading(false);
  }

  function handleCheckoutDone(patch: Partial<Booking>) {
    const updated = { ...current, ...patch };
    setCurrent(updated);
    onUpdated(patch);
    setShowCheckout(false);
    // Let user see "Completed" state briefly before closing
    setTimeout(onClose, 800);
  }

  const duration = current.service?.duration ?? 30;
  const color    = STATUS_COLOR[current.status];
  const date     = parseISO(current.appointment_date);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[20px] flex flex-col"
        style={{ background: "#fff", maxHeight: "85vh", boxShadow: "0 -4px 24px rgba(30,26,20,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2 shrink-0" style={{ background: "var(--color-cream-2)" }} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full"
          style={{ background: "var(--color-cream-2)", color: "var(--color-muted)", fontSize: 16 }}
        >
          ✕
        </button>

        <div className="overflow-y-auto px-5 pb-8">
          {/* Avatar + name */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0"
              style={{ background: "var(--color-amber)", color: "#fff" }}
            >
              {initials(current.customer_name)}
            </div>
            <div>
              <p className="font-black text-base" style={{ color: "var(--color-dark)" }}>{current.customer_name}</p>
              {current.customer_phone && (
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>{current.customer_phone}</p>
              )}
            </div>
            {/* Status badge */}
            <div
              className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: `${color}20`, color }}
            >
              {STATUS_LABEL[current.status]}
            </div>
          </div>

          {/* Details */}
          <div className="rounded-xl p-4 mb-4 grid grid-cols-2 gap-3" style={{ background: "var(--color-cream)" }}>
            <Detail label="Date"     value={format(date, "d MMM yyyy")} />
            <Detail label="Time"     value={`${formatTime(current.appointment_time)} – ${formatEndTime(current.appointment_time, duration)}`} />
            <Detail label="Service"  value={current.service?.name ?? "—"} />
            <Detail label="Duration" value={`${duration} min`} />
            <Detail label="Price"    value={current.service?.price != null ? `₪${current.service.price}` : "—"} />
            <Detail label="Payment"  value={current.payment_status === "none" ? "—" : current.payment_status} />
          </div>

          {/* Notes */}
          <div className="mb-5">
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-muted)" }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={2}
              placeholder="Add a note…"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none resize-none"
              style={{
                borderColor: "var(--color-cream-2)",
                background: "var(--color-cream)",
                color: "var(--color-dark)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
            />
          </div>

          {/* Actions */}
          <ActionRow
            status={current.status}
            loading={actionLoading}
            onConfirm={() => updateStatus("confirmed")}
            onComplete={() => setShowCheckout(true)}
            onNoShow={() => updateStatus("no_show")}
            onCancel={() => updateStatus("cancelled")}
          />

          {/* View client */}
          {current.customer_id && (
            <a
              href={`/clients/${current.customer_id}`}
              className="block text-center text-sm font-bold mt-4"
              style={{ color: "var(--color-amber)" }}
            >
              View client profile →
            </a>
          )}
        </div>
      </div>

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal
          booking={current}
          onDone={handleCheckoutDone}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-muted)" }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: "var(--color-dark)" }}>{value}</p>
    </div>
  );
}

interface ActionRowProps {
  status: BookingStatus;
  loading: boolean;
  onConfirm: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onCancel: () => void;
}

function ActionRow({ status, loading, onConfirm, onComplete, onNoShow, onCancel }: ActionRowProps) {
  if (status === "completed" || status === "cancelled" || status === "no_show") {
    return null;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {status === "pending" && (
        <ActionBtn label="Confirm" color="var(--color-amber)" onClick={onConfirm} loading={loading} primary />
      )}
      {status === "confirmed" && (
        <>
          <ActionBtn label="Complete" color="var(--color-completed)" onClick={onComplete} loading={loading} primary />
          <ActionBtn label="No-show"  color="var(--color-muted)"     onClick={onNoShow}  loading={loading} />
          <ActionBtn label="Cancel"   color="var(--color-cancelled)"  onClick={onCancel}  loading={loading} />
        </>
      )}
    </div>
  );
}

function ActionBtn({
  label, color, onClick, loading, primary = false,
}: {
  label: string; color: string; onClick: () => void; loading: boolean; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
      style={{
        background: primary ? color : `${color}18`,
        color: primary ? "#fff" : color,
        minWidth: 80,
      }}
    >
      {label}
    </button>
  );
}
