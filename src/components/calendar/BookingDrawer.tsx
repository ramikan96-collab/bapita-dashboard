"use client";

import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";
import { STATUS_COLOR, STATUS_BG, STATUS_LABEL } from "@/types";
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
      className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold transition-opacity disabled:opacity-50"
      style={{
        background: primary ? color : `${color}18`,
        color: primary ? "#fff" : color,
        minWidth: 0,
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
    <div className="mb-6">
      <p
        className="text-[11px] font-bold uppercase tracking-widest mb-2.5 px-1"
        style={{ color: "var(--color-muted)" }}
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
        className="relative w-full max-w-md rounded-t-2xl px-5 pt-3 pb-10"
        style={{ background: "var(--color-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-4"
          style={{ background: "var(--color-cream-2)" }}
        />
        <p
          className="text-center text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: "var(--color-muted)" }}
        >
          Change status
        </p>
        <div className="flex flex-col gap-2">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onSelect(s)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity"
              style={{
                background: s === current ? STATUS_BG[s] : "var(--color-cream)",
                border: `1.5px solid ${s === current ? STATUS_COLOR[s] : "transparent"}`,
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
        className="relative w-full max-w-md rounded-t-2xl px-6 pt-6 pb-10 shadow-2xl"
        style={{ background: "var(--color-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: "var(--color-cream-2)" }}
        />
        <p
          className="text-center font-black text-lg mb-1"
          style={{ color: "var(--color-dark)" }}
        >
          How did they pay?
        </p>
        <p
          className="text-center text-xs mb-6"
          style={{ color: "var(--color-muted)" }}
        >
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
}

export default function BookingDrawer({ booking, onClose, onUpdated }: Props) {
  const supabase = createClient();

  const [current, setCurrent] = useState<Booking>(booking);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  const [notes, setNotes] = useState(current.notes ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cleanup saveTimer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

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

  // ── Notes auto-save ────────────────────────────────────────────────────────

  function handleNotesChange(val: string) {
    setNotes(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from("bookings").update({ notes: val }).eq("id", current.id);
    }, 800);
  }

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

  // ── Derived values ─────────────────────────────────────────────────────────

  const duration = current.service?.duration ?? 30;
  const color = STATUS_COLOR[current.status];
  const statusBg = STATUS_BG[current.status];
  const date = parseISO(current.appointment_date);
  const timeStart = formatTime(current.appointment_time);
  const timeEnd = formatEndTime(current.appointment_time, duration);

  // ── Action buttons per status ──────────────────────────────────────────────

  function renderActions() {
    const s = current.status;
    const AMBER = "#E8920A";
    const GREEN = STATUS_COLOR.completed;
    const RED = "#EF4444";
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
        className="flex items-center gap-3 w-full px-5 py-4 rounded-2xl text-start"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-cream-2)",
        }}
      >
        {label ? (
          <>
            <span
              className="w-4 h-4 rounded-full shrink-0"
              style={{
                background: label.color,
                border:
                  label.color === "#FFFFFF"
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

  function renderContact() {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-cream-2)",
        }}
      >
        {current.customer_phone ? (
          <a
            href={`tel:${current.customer_phone}`}
            className="flex items-center gap-4 px-5 py-4"
            style={{
              color: "var(--color-dark)",
              textDecoration: "none",
              borderBottom: current.customer_email
                ? "1px solid var(--color-cream-2)"
                : "none",
            }}
          >
            <span className="text-[18px] shrink-0">📞</span>
            <span className="text-[15px] font-semibold">{current.customer_phone}</span>
          </a>
        ) : (
          <div
            className="flex items-center gap-4 px-5 py-4"
            style={{
              borderBottom: current.customer_email
                ? "1px solid var(--color-cream-2)"
                : "none",
            }}
          >
            <span className="text-[18px] shrink-0 opacity-30">📞</span>
            <span className="text-[15px]" style={{ color: "var(--color-muted)" }}>
              No phone
            </span>
          </div>
        )}
        {current.customer_email ? (
          <a
            href={`mailto:${current.customer_email}`}
            className="flex items-center gap-4 px-5 py-4"
            style={{ color: "var(--color-dark)", textDecoration: "none" }}
          >
            <span className="text-[18px] shrink-0">✉️</span>
            <span className="text-[15px] font-semibold truncate">
              {current.customer_email}
            </span>
          </a>
        ) : (
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="text-[18px] shrink-0 opacity-30">✉️</span>
            <span className="text-[15px]" style={{ color: "var(--color-muted)" }}>
              No email
            </span>
          </div>
        )}
      </div>
    );
  }

  function renderPayment() {
    const price = current.service?.price;
    const ps = current.payment_status;

    const paymentLabel: Record<PaymentStatus, string> = {
      none: "Unpaid",
      cash: "Paid — Cash",
      transfer: "Paid — Bank Transfer",
      stripe: "Paid — Stripe",
    };

    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-cream-2)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--color-cream-2)" }}
          >
            <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>
              Service price
            </span>
            <span
              className="text-[15px] font-bold"
              style={{ color: "var(--color-dark)" }}
            >
              {price != null ? `₪${price}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>
              Payment
            </span>
            <span
              className="text-[15px] font-bold"
              style={{
                color:
                  ps === "none" ? "#EF4444" : STATUS_COLOR.completed,
              }}
            >
              {paymentLabel[ps]}
            </span>
          </div>
        </div>
        {ps === "none" && (
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full py-4 rounded-2xl text-[15px] font-bold"
            style={{ background: "var(--wash-amber)", color: "var(--color-amber)" }}
          >
            Mark as paid →
          </button>
        )}
      </div>
    );
  }

  function renderNotes() {
    return (
      <textarea
        value={notes}
        onChange={(e) => handleNotesChange(e.target.value)}
        rows={4}
        placeholder="Add a note about this appointment…"
        className="w-full rounded-2xl border outline-none resize-none"
        style={{
          fontSize: 15,
          padding: "16px 20px",
          lineHeight: 1.6,
          borderColor: "var(--color-cream-2)",
          background: "var(--color-surface)",
          color: "var(--color-dark)",
          fontFamily: "inherit",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
      />
    );
  }

  function renderHistory() {
    if (!current.customer_id) {
      return (
        <p className="text-[14px] px-1" style={{ color: "var(--color-muted)" }}>
          No client profile linked.
        </p>
      );
    }
    if (prevBooking === "loading") {
      return (
        <p className="text-[14px] px-1" style={{ color: "var(--color-muted)" }}>
          Loading…
        </p>
      );
    }
    if (prevBooking === null) {
      return (
        <p className="text-[14px] px-1" style={{ color: "var(--color-muted)" }}>
          No previous bookings.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-2xl px-5 py-4 flex flex-col gap-1"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-cream-2)",
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
          className="flex items-center justify-center py-4 rounded-2xl text-[14px] font-bold"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-cream-2)",
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
        className="fixed bottom-0 inset-x-0 z-50 rounded-t-[24px] max-h-[90vh] flex flex-col md:inset-y-0 md:left-auto md:end-0 md:w-[400px] md:rounded-none md:max-h-none"
        style={{
          background: "var(--color-cream)",
          boxShadow: "0 -8px 40px rgba(30,26,20,0.16)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {/* Drag handle — mobile only */}
          <div
            className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 md:hidden"
            style={{ background: "var(--color-cream-2)" }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 end-4 w-8 h-8 flex items-center justify-center rounded-full"
            style={{
              background: "var(--color-cream-2)",
              color: "var(--color-muted)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ✕
          </button>

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div className="pt-8 pb-5 md:pt-6">
            {/* Avatar + name + status */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-black shrink-0"
                style={{ background: "var(--color-amber)", color: "#fff" }}
              >
                {initials(current.customer_name)}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p
                  className="font-black leading-tight truncate"
                  style={{ fontSize: 22, color: "var(--color-dark)" }}
                >
                  {current.customer_name}
                </p>
                <button
                  onClick={() => setShowStatusSheet(true)}
                  className="mt-2 px-3 py-1 rounded-full text-[12px] font-bold"
                  style={{ background: statusBg, color }}
                  title="Tap to change status"
                >
                  {STATUS_LABEL[current.status]} ▾
                </button>
              </div>
            </div>

            {/* Date + time card */}
            <div
              className="rounded-2xl px-5 py-4"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-cream-2)",
              }}
            >
              <p
                className="text-[13px] font-medium mb-1"
                style={{ color: "var(--color-muted)" }}
              >
                {format(date, "EEEE, d MMM yyyy")}
              </p>
              <p
                className="text-[18px] font-black"
                style={{ color: "var(--color-dark)" }}
              >
                {timeStart}–{timeEnd}
                <span
                  className="text-[14px] font-normal"
                  style={{ color: "var(--color-muted)" }}
                >
                  {" "}
                  · {duration} min
                </span>
              </p>
              {current.service?.name && (
                <p
                  className="mt-1 text-[14px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  {current.service.name}
                </p>
              )}
            </div>
          </div>

          {/* ── ACTIONS ────────────────────────────────────────────────── */}
          <div className="mb-7">{renderActions()}</div>

          {/* ── LABEL ──────────────────────────────────────────────────── */}
          <Section label="Label">{renderLabel()}</Section>

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
          className="shrink-0 px-5 py-4 flex gap-3 border-t"
          style={{
            borderColor: "var(--color-cream-2)",
            background: "var(--color-surface)",
          }}
        >
          <button
            onClick={() => setShowEdit(true)}
            className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold"
            style={{ background: "var(--wash-amber)", color: "var(--color-amber)" }}
          >
            Edit appointment
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold"
            style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}
          >
            Print
          </button>
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
