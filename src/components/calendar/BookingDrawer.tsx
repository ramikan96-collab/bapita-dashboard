"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Phone, Mail, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";
import { STATUS_COLOR, STATUS_BG, STATUS_LABEL } from "@/types";
import { isStayBooking, nightsBetween, stayTotal } from "@/lib/stay";
import RescheduleSheet from "./RescheduleSheet";
import EditBookingSheet from "./EditBookingSheet";
import LabelPickerSheet from "./LabelPickerSheet";
import type { Label } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatTime(t: string) {
  return t.substring(0, 5);
}

function formatEndTime(time: string, duration: number) {
  const [h, m] = time.split(":").map(Number);
  const endMins = h * 60 + m + duration;
  return `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrevBooking {
  appointment_date: string;
  service: { name: string } | null;
  status: BookingStatus;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ActionBtn({
  label,
  color,
  onClick,
  loading,
  primary = false,
}: {
  label: string;
  color: string;
  onClick: () => void;
  loading: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex-1 rounded-2xl text-[14px] font-bold transition-opacity disabled:opacity-50"
      style={{
        background: primary ? color : `${color}22`,
        border: primary ? "none" : `1.5px solid ${color}40`,
        color: primary ? "var(--color-surface)" : color,
        minWidth: 0,
        padding: "13px 8px",
      }}
    >
      {label}
    </button>
  );
}

// Flat section with all-caps label — no accordion, always visible
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      <p
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: "var(--color-muted)", marginBottom: 10, paddingInlineStart: 4 }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

// StatusSheet — bottom sheet for picking a new status
function StatusSheet({
  current,
  onSelect,
  onClose,
}: {
  current: BookingStatus;
  onSelect: (s: BookingStatus) => void;
  onClose: () => void;
}) {
  const ALL_STATUSES: BookingStatus[] = [
    "pending",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md rounded-t-2xl"
        style={{
          background: "var(--color-surface)",
          padding: "12px 20px calc(28px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto"
          style={{ background: "var(--color-cream-2)", marginBottom: 16 }}
        />
        <p
          className="text-center text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--color-muted)", marginBottom: 16 }}
        >
          Change status
        </p>
        <div className="flex flex-col gap-2">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onSelect(s)}
              className="flex items-center gap-3 rounded-xl transition-opacity"
              style={{
                background: s === current ? STATUS_BG[s] : "var(--color-cream)",
                border: `1.5px solid ${s === current ? STATUS_COLOR[s] : "transparent"}`,
                padding: "12px 16px",
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: STATUS_COLOR[s] }}
              />
              <span
                className="text-sm font-bold"
                style={{ color: STATUS_COLOR[s] }}
              >
                {STATUS_LABEL[s]}
              </span>
              {s === current && (
                <span
                  className="ms-auto text-xs font-bold"
                  style={{ color: STATUS_COLOR[s] }}
                >
                  Current
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// CheckoutModal — payment method picker
interface CheckoutProps {
  booking: Booking;
  onDone: (patch: Partial<Booking>) => void;
  onClose: () => void;
}

function CheckoutModal({ booking, onDone, onClose }: CheckoutProps) {
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handlePay(method: PaymentStatus) {
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        payment_status: method,
        checkout_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (!error) {
      onDone({ status: "completed", payment_status: method });
    }
    setSaving(false);
  }

  const methods: { key: PaymentStatus; label: string; emoji: string }[] = [
    { key: "cash", label: "Cash", emoji: "💵" },
    { key: "transfer", label: "Bank Transfer", emoji: "🏦" },
    { key: "none", label: "Unpaid", emoji: "⏳" },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md rounded-t-2xl shadow-2xl"
        style={{
          background: "var(--color-surface)",
          padding: "20px 24px calc(28px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto"
          style={{ background: "var(--color-cream-2)", marginBottom: 20 }}
        />
        <p
          className="text-center font-black text-lg"
          style={{ color: "var(--color-dark)", marginBottom: 4 }}
        >
          How did they pay?
        </p>
        <p
          className="text-center text-xs"
          style={{ color: "var(--color-muted)", marginBottom: 22 }}
        >
          {booking.customer_name} · {booking.service?.name}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {methods.map(({ key, label, emoji }) => (
            <button
              key={key}
              disabled={saving}
              onClick={() => handlePay(key)}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 transition-all disabled:opacity-50"
              style={{
                borderColor: "var(--color-cream-2)",
                background: "var(--color-cream)",
                padding: "16px 8px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--color-amber)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--color-cream-2)";
              }}
            >
              <span style={{ fontSize: 24 }}>{emoji}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-dark)",
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main DrawerComponent ─────────────────────────────────────────────────────

interface Props {
  booking: Booking;
  onClose: () => void;
  onUpdated: (patch: Partial<Booking>) => void;
  onDeleted?: (id: string) => void;
}

export default function BookingDrawer({ booking, onClose, onUpdated, onDeleted }: Props) {
  const supabase = createClient();

  const [current, setCurrent] = useState<Booking>(booking);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Money already collected online for this booking (Green Invoice deposit or
  // full prepay). Staff MUST see this or they will charge the customer twice.
  const [onlinePayment, setOnlinePayment] = useState<{ amount: number; invoice_url: string | null } | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const settled = current.payment_status === "deposit_paid";
    (async () => {
      if (!settled) { if (!cancelled) setOnlinePayment(null); return; }
      const { data } = await supabase
        .from("transactions")
        .select("amount, invoice_url")
        .eq("booking_id", current.id)
        .eq("status", "paid")
        .maybeSingle();
      if (!cancelled && data) {
        setOnlinePayment({ amount: Number(data.amount) || 0, invoice_url: (data.invoice_url as string | null) ?? null });
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, current.id, current.payment_status]);


  const [prevBooking, setPrevBooking] = useState<PrevBooking | null | "loading">(
    current.customer_id ? "loading" : null
  );

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load previous booking on mount
  useEffect(() => {
    if (!current.customer_id) return;
    supabase
      .from("bookings")
      .select("appointment_date, service:services(name), status")
      .eq("customer_id", current.customer_id)
      .neq("id", current.id)
      .order("appointment_date", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const row = data?.[0];
        if (row) {
          setPrevBooking({
            appointment_date: row.appointment_date as string,
            service: row.service as unknown as { name: string } | null,
            status: row.status as BookingStatus,
          });
        } else {
          setPrevBooking(null);
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Status update ──────────────────────────────────────────────────────────

  async function updateStatus(status: BookingStatus) {
    const prev = current;
    setCurrent({ ...current, status });
    onUpdated({ status });
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", current.id);
    if (error) {
      setCurrent(prev);
      onUpdated({ status: prev.status });
    }
  }

  // ── Checkout done ──────────────────────────────────────────────────────────

  function handleCheckoutDone(patch: Partial<Booking>) {
    const updated = { ...current, ...patch };
    setCurrent(updated);
    onUpdated(patch);
    setShowCheckout(false);
    setTimeout(onClose, 800);
  }

  // ── Status sheet ───────────────────────────────────────────────────────────

  function handleStatusSelect(newStatus: BookingStatus) {
    setShowStatusSheet(false);
    if (newStatus === "completed") {
      setShowCheckout(true);
    } else {
      updateStatus(newStatus);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("bookings").delete().eq("id", current.id);
    if (error) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }
    onDeleted?.(current.id);
    onClose();
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const duration = current.service?.duration ?? 30;
  const color = STATUS_COLOR[current.status];
  const statusBg = STATUS_BG[current.status];
  const date = parseISO(current.appointment_date);
  const timeStart = formatTime(current.appointment_time);
  const timeEnd = formatEndTime(current.appointment_time, duration);

  // Stay bookings: the headline is the date range and the night count, and the
  // price is nightly rate x nights rather than a flat service price.
  const stay = isStayBooking(current);
  const nights = stay ? nightsBetween(current.appointment_date, current.check_out!) : 0;
  const stayCheckOut = stay ? parseISO(current.check_out!) : null;

  // ── Action buttons per status ──────────────────────────────────────────────

  function renderActions() {
    const s = current.status;
    const AMBER = "#E8920A";
    const GREEN = STATUS_COLOR.completed;
    const RED = "var(--color-danger)";
    const SLATE = STATUS_COLOR.pending;

    if (s === "pending") {
      return (
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <ActionBtn label="Confirm" color={AMBER} onClick={() => updateStatus("confirmed")} loading={false} primary />
            <ActionBtn label="Complete" color={GREEN} onClick={() => setShowCheckout(true)} loading={false} />
          </div>
          <div className="flex gap-2.5">
            <ActionBtn label="No-show" color={RED} onClick={() => updateStatus("no_show")} loading={false} />
            <ActionBtn label="Cancel" color={RED} onClick={() => updateStatus("cancelled")} loading={false} />
          </div>
        </div>
      );
    }
    if (s === "confirmed") {
      return (
        <div className="flex flex-col gap-2.5">
          <ActionBtn label="Complete" color={GREEN} onClick={() => setShowCheckout(true)} loading={false} primary />
          <div className="flex gap-2.5">
            <ActionBtn label="No-show" color={RED} onClick={() => updateStatus("no_show")} loading={false} />
            <ActionBtn label="Reschedule" color={SLATE} onClick={() => setShowReschedule(true)} loading={false} />
            <ActionBtn label="Cancel" color={RED} onClick={() => updateStatus("cancelled")} loading={false} />
          </div>
        </div>
      );
    }
    if (s === "completed") {
      return (
        <div className="flex gap-2.5">
          <ActionBtn label="Reschedule" color={SLATE} onClick={() => setShowReschedule(true)} loading={false} />
          <ActionBtn label="Reopen" color={AMBER} onClick={() => updateStatus("confirmed")} loading={false} />
        </div>
      );
    }
    if (s === "cancelled" || s === "no_show") {
      return (
        <div className="flex gap-2.5">
          <ActionBtn label="Reschedule" color={SLATE} onClick={() => setShowReschedule(true)} loading={false} />
          <ActionBtn label="Reopen" color={AMBER} onClick={() => updateStatus("confirmed")} loading={false} />
        </div>
      );
    }
    return null;
  }

  // ── Section bodies ─────────────────────────────────────────────────────────

  function renderLabel() {
    const label = current.label;
    return (
      <button
        onClick={() => setShowLabelPicker(true)}
        className="flex items-center gap-3 w-full rounded-2xl text-start"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-cream-2)",
          boxShadow: "0 1px 3px rgba(30,26,20,0.05)",
          padding: "15px 18px",
        }}
      >
        {label ? (
          <>
            <span
              className="w-4 h-4 rounded-full shrink-0"
              style={{
                background: label.color,
                border:
                  label.color === "var(--color-surface)"
                    ? "1px solid var(--color-cream-2)"
                    : "none",
              }}
            />
            <span
              className="flex-1 text-[15px] font-semibold"
              style={{ color: "var(--color-dark)" }}
            >
              {label.name}
            </span>
            <span className="text-[13px]" style={{ color: "var(--color-muted)" }}>
              Change
            </span>
          </>
        ) : (
          <>
            <span
              className="w-4 h-4 rounded-full border-2 border-dashed shrink-0"
              style={{ borderColor: "var(--color-amber)" }}
            />
            <span
              className="text-[15px] font-semibold"
              style={{ color: "var(--color-amber)" }}
            >
              + Add label
            </span>
          </>
        )}
      </button>
    );
  }

  function copyText(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function renderContact() {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-cream-2)",
          boxShadow: "0 1px 3px rgba(30,26,20,0.05)",
        }}
      >
        {current.customer_phone ? (
          <button
            onClick={() => copyText(current.customer_phone!, setCopiedPhone)}
            className="flex items-center gap-4 w-full text-start"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "14px 18px",
              borderBottom: current.customer_email
                ? "1px solid var(--color-cream-2)"
                : "none",
            }}
          >
            <Phone size={16} strokeWidth={2} className="shrink-0" style={{ color: "var(--color-dark)" }} />
            <span className="text-[15px] font-semibold flex-1" style={{ color: "var(--color-dark)" }}>
              {current.customer_phone}
            </span>
            <span
              className="text-[12px] font-semibold shrink-0"
              style={{ color: copiedPhone ? "#22c55e" : "var(--color-muted)" }}
            >
              {copiedPhone ? "Copied ✓" : "Copy"}
            </span>
          </button>
        ) : (
          <div
            className="flex items-center gap-4"
            style={{
              padding: "14px 18px",
              borderBottom: current.customer_email
                ? "1px solid var(--color-cream-2)"
                : "none",
            }}
          >
            <Phone size={16} strokeWidth={2} className="shrink-0 opacity-30" style={{ color: "var(--color-muted)" }} />
            <span className="text-[15px]" style={{ color: "var(--color-muted)" }}>
              No phone
            </span>
          </div>
        )}
        {current.customer_email ? (
          <button
            onClick={() => copyText(current.customer_email!, setCopiedEmail)}
            className="flex items-center gap-4 w-full text-start"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "14px 18px" }}
          >
            <Mail size={16} strokeWidth={2} className="shrink-0" style={{ color: "var(--color-dark)" }} />
            <span className="text-[15px] font-semibold flex-1 truncate" style={{ color: "var(--color-dark)" }}>
              {current.customer_email}
            </span>
            <span
              className="text-[12px] font-semibold shrink-0"
              style={{ color: copiedEmail ? "#22c55e" : "var(--color-muted)" }}
            >
              {copiedEmail ? "Copied ✓" : "Copy"}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-4" style={{ padding: "14px 18px" }}>
            <Mail size={16} strokeWidth={2} className="shrink-0 opacity-30" style={{ color: "var(--color-muted)" }} />
            <span className="text-[15px]" style={{ color: "var(--color-muted)" }}>
              No email
            </span>
          </div>
        )}
      </div>
    );
  }

  function renderPayment() {
    // Nightly rate x nights for a stay; the flat service price otherwise.
    const price = stay && current.service?.price != null
      ? stayTotal(Number(current.service.price), nights)
      : current.service?.price;
    const ps = current.payment_status;

    const paidOnline = onlinePayment?.amount ?? 0;
    const balance = price != null ? Math.max(0, Math.round((Number(price) - paidOnline) * 100) / 100) : 0;
    const fullyPaidOnline = ps === "deposit_paid" && balance <= 0;

    const paymentLabel: Record<PaymentStatus, string> = {
      none: "Unpaid",
      cash: "Paid — Cash",
      transfer: "Paid — Bank Transfer",
      stripe: "Paid — Stripe",
      pending_payment: "Awaiting payment",
      deposit_paid: fullyPaidOnline ? "Paid online — in full" : "Paid online — deposit",
      expired: "Payment expired",
    };

    // pending/expired are not "settled": showing them in the paid-green would
    // tell staff money arrived when it did not.
    const labelColor =
      ps === "none" || ps === "expired" ? "var(--color-danger)"
        : ps === "pending_payment" ? "var(--color-amber)"
        : STATUS_COLOR.completed;

    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-cream-2)",
            boxShadow: "0 1px 3px rgba(30,26,20,0.05)",
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-cream-2)" }}
          >
            <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>
              {stay ? "Stay total" : "Service price"}
            </span>
            <span
              className="text-[15px] font-bold"
              style={{ color: "var(--color-dark)" }}
            >
              {price != null ? `₪${price}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between" style={{ padding: "14px 18px" }}>
            <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>
              Payment
            </span>
            <span className="text-[15px] font-bold" style={{ color: labelColor }}>
              {paymentLabel[ps]}
            </span>
          </div>
          {ps === "deposit_paid" && onlinePayment && (
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--color-cream-2)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>Paid online</span>
                <span className="text-[15px] font-bold" style={{ color: STATUS_COLOR.completed }}>₪{paidOnline}</span>
              </div>
              <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
                <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>
                  {balance > 0 ? "Collect at the salon" : "Nothing left to collect"}
                </span>
                <span className="text-[15px] font-bold" style={{ color: balance > 0 ? "var(--color-dark)" : STATUS_COLOR.completed }}>
                  {balance > 0 ? `₪${balance}` : "—"}
                </span>
              </div>
              {onlinePayment.invoice_url && (
                <a href={onlinePayment.invoice_url} target="_blank" rel="noopener noreferrer"
                  className="text-[13px] font-semibold" style={{ color: "var(--color-amber)", display: "inline-block", marginTop: 10 }}>
                  View invoice →
                </a>
              )}
            </div>
          )}
        </div>
        {(ps === "none" || (ps === "deposit_paid" && balance > 0)) && (
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full rounded-2xl text-[15px] font-bold"
            style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)", padding: "15px 0" }}
          >
            {ps === "deposit_paid" ? `Collect ₪${balance} →` : "Mark as paid →"}
          </button>
        )}
      </div>
    );
  }

  function renderNotes() {
    return (
      <div
        className="w-full rounded-2xl"
        style={{
          fontSize: 15,
          padding: "16px 20px",
          lineHeight: 1.6,
          border: "1px solid var(--color-cream-2)",
          background: "var(--color-surface)",
          color: current.notes ? "var(--color-dark)" : "var(--color-muted)",
          minHeight: 80,
        }}
      >
        {current.notes || "No notes — tap Edit to add."}
      </div>
    );
  }

  function renderHistory() {
    if (!current.customer_id) {
      return (
        <div className="rounded-2xl" style={{ padding: "14px 18px", background: "var(--color-surface)", border: "1px solid var(--color-cream-2)" }}>
          <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>No client profile linked.</p>
        </div>
      );
    }
    if (prevBooking === "loading") {
      return (
        <div
          className="animate-pulse rounded-2xl"
          style={{
            height: 72,
            background: "var(--color-cream-2)",
            border: "1px solid var(--color-cream-2)",
          }}
        />
      );
    }
    if (prevBooking === null) {
      return (
        <div className="rounded-2xl" style={{ padding: "14px 18px", background: "var(--color-surface)", border: "1px solid var(--color-cream-2)" }}>
          <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>No previous bookings.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-2xl flex flex-col gap-1"
          style={{
            padding: "15px 18px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-cream-2)",
            boxShadow: "0 1px 3px rgba(30,26,20,0.05)",
          }}
        >
          <p className="text-[15px] font-bold" style={{ color: "var(--color-dark)" }}>
            {format(parseISO(prevBooking.appointment_date), "d MMM yyyy")}
            {prevBooking.service?.name && (
              <span
                className="font-normal"
                style={{ color: "var(--color-muted)" }}
              >
                {" "}
                · {prevBooking.service.name}
              </span>
            )}
          </p>
          <p
            className="text-[13px] font-semibold"
            style={{ color: STATUS_COLOR[prevBooking.status] }}
          >
            {STATUS_LABEL[prevBooking.status]}
          </p>
        </div>
        <a
          href={`/clients/${current.customer_id}`}
          className="flex items-center justify-center rounded-2xl text-[14px] font-bold"
          style={{
            padding: "15px 0",
            background: "var(--color-surface)",
            border: "1px solid var(--color-cream-2)",
            boxShadow: "0 1px 3px rgba(30,26,20,0.05)",
            color: "var(--color-amber)",
          }}
        >
          View client profile →
        </a>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer — mobile bottom sheet, desktop right panel */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 rounded-t-[24px] max-h-[90vh] flex flex-col md:inset-y-0 md:left-auto md:end-0 md:w-[440px] md:rounded-none md:max-h-none"
        style={{
          background: "var(--color-cream)",
          boxShadow: "0 -8px 40px rgba(30,26,20,0.16)",
          animation: "drawerSlideIn 200ms cubic-bezier(0.16,1,0.3,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable body */}
        <div
          className="overflow-y-auto flex-1"
          style={{ padding: "0 20px 20px" }}
        >
          {/* Drag handle — mobile only */}
          <div
            className="w-10 h-1 rounded-full mx-auto md:hidden"
            style={{ background: "var(--color-cream-2)", marginTop: 10, marginBottom: 2 }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute w-8 h-8 flex items-center justify-center rounded-full z-10"
            style={{
              top: 14,
              insetInlineEnd: 14,
              background: "var(--color-cream-2)",
              color: "var(--color-muted)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ✕
          </button>

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div style={{ paddingTop: 28, paddingBottom: 24 }}>
            {/* Avatar + name + status */}
            <div className="flex items-start gap-4" style={{ marginBottom: 18 }}>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-black shrink-0"
                style={{ background: "var(--color-amber)", color: "var(--color-surface)" }}
              >
                {initials(current.customer_name)}
              </div>
              <div className="flex-1 min-w-0" style={{ paddingTop: 2 }}>
                <p
                  className="font-black leading-tight truncate"
                  style={{ fontSize: 22, color: "var(--color-dark)" }}
                >
                  {current.customer_name}
                </p>
                <button
                  onClick={() => setShowStatusSheet(true)}
                  className="rounded-full text-[12px] font-bold inline-flex items-center gap-1"
                  style={{ background: statusBg, color, marginTop: 8, padding: "4px 12px" }}
                  title="Tap to change status"
                >
                  {STATUS_LABEL[current.status]}
                  <ChevronDown size={10} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Date + time card */}
            <div
              className="rounded-2xl"
              style={{
                padding: "16px 18px",
                background: "var(--color-surface)",
                border: "1px solid var(--color-cream-2)",
                boxShadow: "0 1px 3px rgba(30,26,20,0.05)",
              }}
            >
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--color-muted)", marginBottom: 4 }}
              >
                {format(date, "EEEE, d MMM yyyy")}
              </p>
              <p
                className="text-[18px] font-black"
                style={{ color: "var(--color-dark)" }}
              >
                {stay && stayCheckOut
                  ? `${format(date, "d MMM")} → ${format(stayCheckOut, "d MMM")}`
                  : `${timeStart}–${timeEnd}`}
                <span
                  className="text-[14px] font-normal"
                  style={{ color: "var(--color-muted)" }}
                >
                  {" "}
                  · {stay
                    ? `${nights === 1 ? "1 night" : `${nights} nights`}${current.guests ? ` · ${current.guests} guests` : ""}`
                    : `${duration} min`}
                </span>
              </p>
              {current.service?.name && (
                <p
                  className="text-[14px]"
                  style={{ color: "var(--color-muted)", marginTop: 4 }}
                >
                  {current.service.name}
                </p>
              )}
            </div>
          </div>

          {/* ── ACTIONS ────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>{renderActions()}</div>

          {/* ── LABEL ──────────────────────────────────────────────────── */}
          <Section label="Label">{renderLabel()}</Section>

          {/* ── STAFF ──────────────────────────────────────────────────────── */}
          <Section label="Staff">
            {current.staff_id && current.staff ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-dark)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: current.staff.color || "var(--color-amber)" }} />
                {current.staff.name}
              </span>
            ) : (
              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "var(--color-cream-2)", color: "var(--color-muted)" }}>
                Unassigned
              </span>
            )}
          </Section>

          {/* ── CONTACT ────────────────────────────────────────────────── */}
          <Section label="Contact">{renderContact()}</Section>

          {/* ── PAYMENT ────────────────────────────────────────────────── */}
          <Section label="Payment">{renderPayment()}</Section>

          {/* ── NOTES ──────────────────────────────────────────────────── */}
          <Section label="Notes">{renderNotes()}</Section>

          {/* ── HISTORY ────────────────────────────────────────────────── */}
          <Section label="History">{renderHistory()}</Section>
        </div>

        {/* Sticky footer */}
        <div
          className="shrink-0 border-t"
          style={{
            borderColor: "var(--color-cream-2)",
            background: "var(--color-surface)",
            padding: "14px 20px calc(14px + env(safe-area-inset-bottom))",
          }}
        >
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-2">
              <p className="text-center text-[13px] font-semibold" style={{ color: "var(--color-muted)" }}>
                Delete this booking? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 rounded-2xl text-[14px] font-bold"
                  style={{ background: "var(--color-cream-2)", color: "var(--color-dark)", padding: "13px 0" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-2xl text-[14px] font-bold disabled:opacity-50"
                  style={{ background: "var(--color-danger)", color: "var(--color-surface)", padding: "13px 0" }}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowEdit(true)}
                className="flex-1 rounded-2xl text-[14px] font-bold"
                style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)", padding: "13px 0" }}
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 rounded-2xl text-[14px] font-bold"
                style={{ background: "#FEE2E2", color: "var(--color-danger)", padding: "13px 0" }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-sheet overlays */}
      {showStatusSheet && (
        <StatusSheet
          current={current.status}
          onSelect={handleStatusSelect}
          onClose={() => setShowStatusSheet(false)}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          booking={current}
          onDone={handleCheckoutDone}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {showReschedule && (
        <RescheduleSheet
          booking={current}
          onRescheduled={(patch) => {
            const updated = { ...current, ...patch };
            setCurrent(updated);
            onUpdated(patch);
            setShowReschedule(false);
          }}
          onClose={() => setShowReschedule(false)}
        />
      )}

      {showEdit && (
        <EditBookingSheet
          booking={current}
          onSaved={(patch) => {
            const updated = { ...current, ...patch };
            setCurrent(updated);
            onUpdated(patch);
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showLabelPicker && (
        <LabelPickerSheet
          bookingId={current.id}
          businessId={current.business_id}
          currentLabelId={current.label_id}
          onSelect={(label: Label | null) => {
            const patch = { label_id: label?.id ?? null, label: label ?? null };
            setCurrent((prev) => ({ ...prev, ...patch }));
            onUpdated(patch);
          }}
          onClose={() => setShowLabelPicker(false)}
        />
      )}
    </>
  );
}
