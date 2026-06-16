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

// ActionBtn
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
      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
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

// AccordionSection
function AccordionSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: "var(--color-cream-2)" }}
    >
      <button
        className="w-full flex items-center justify-between py-3 text-left"
        onClick={() => onToggle(id)}
      >
        <span className="text-sm font-bold" style={{ color: "var(--color-dark)" }}>
          {title}
        </span>
        <span
          className="text-lg leading-none transition-transform"
          style={{
            color: "var(--color-muted)",
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ›
        </span>
      </button>
      {open && <div className="pb-4">{children}</div>}
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

  // Core state
  const [current, setCurrent] = useState<Booking>(booking);
  const [openSections, setOpenSections] = useState<string[]>(["notes"]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  const [notes, setNotes] = useState(current.notes ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazy accordion data
  const [clientNotes, setClientNotes] = useState<string | null>(null);
  const [prevBooking, setPrevBooking] = useState<PrevBooking | null | "loading">(
    null
  );

  // Track which sections have been lazily loaded
  const lazyLoadedRef = useRef<Set<string>>(new Set());

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

  // Load client notes on mount (notes section defaults open)
  useEffect(() => {
    if (!current.customer_id) return;
    lazyLoadedRef.current.add("notes");
    supabase
      .from("customers")
      .select("notes")
      .eq("id", current.customer_id)
      .single()
      .then(({ data }) => setClientNotes(data?.notes ?? ""));
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

  // ── Accordion toggle + lazy loading ───────────────────────────────────────

  function toggleSection(id: string) {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

    // Lazy load notes section
    if (
      id === "notes" &&
      !lazyLoadedRef.current.has("notes") &&
      current.customer_id
    ) {
      lazyLoadedRef.current.add("notes");
      supabase
        .from("customers")
        .select("notes")
        .eq("id", current.customer_id)
        .single()
        .then(({ data }) => {
          setClientNotes(data?.notes ?? null);
        });
    }

    // Lazy load history section
    if (
      id === "history" &&
      !lazyLoadedRef.current.has("history") &&
      current.customer_id
    ) {
      lazyLoadedRef.current.add("history");
      setPrevBooking("loading");
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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <ActionBtn
              label="Confirm"
              color={AMBER}
              onClick={() => updateStatus("confirmed")}
              loading={false}
              primary
            />
            <ActionBtn
              label="Complete"
              color={GREEN}
              onClick={() => setShowCheckout(true)}
              loading={false}
            />
          </div>
          <div className="flex gap-2">
            <ActionBtn
              label="No-show"
              color={RED}
              onClick={() => updateStatus("no_show")}
              loading={false}
            />
            <ActionBtn
              label="Cancel"
              color={RED}
              onClick={() => updateStatus("cancelled")}
              loading={false}
            />
          </div>
        </div>
      );
    }
    if (s === "confirmed") {
      return (
        <div className="flex flex-col gap-2">
          <ActionBtn
            label="Complete"
            color={GREEN}
            onClick={() => setShowCheckout(true)}
            loading={false}
            primary
          />
          <div className="flex gap-2">
            <ActionBtn
              label="No-show"
              color={RED}
              onClick={() => updateStatus("no_show")}
              loading={false}
            />
            <ActionBtn
              label="Reschedule"
              color={SLATE}
              onClick={() => setShowReschedule(true)}
              loading={false}
            />
            <ActionBtn
              label="Cancel"
              color={RED}
              onClick={() => updateStatus("cancelled")}
              loading={false}
            />
          </div>
        </div>
      );
    }
    if (s === "completed") {
      return (
        <div className="flex gap-2">
          <ActionBtn
            label="Reschedule"
            color={SLATE}
            onClick={() => setShowReschedule(true)}
            loading={false}
          />
          <ActionBtn
            label="Reopen"
            color={AMBER}
            onClick={() => updateStatus("confirmed")}
            loading={false}
          />
        </div>
      );
    }
    if (s === "cancelled" || s === "no_show") {
      return (
        <div className="flex gap-2">
          <ActionBtn
            label="Reschedule"
            color={SLATE}
            onClick={() => setShowReschedule(true)}
            loading={false}
          />
          <ActionBtn
            label="Reopen"
            color={AMBER}
            onClick={() => updateStatus("confirmed")}
            loading={false}
          />
        </div>
      );
    }
    return null;
  }

  // ── Accordion section bodies ───────────────────────────────────────────────

  function renderLabel() {
    const label = current.label;
    return (
      <button
        onClick={() => setShowLabelPicker(true)}
        className="flex items-center gap-2 w-full text-start"
      >
        {label ? (
          <>
            <span
              className="w-4 h-4 rounded-full shrink-0"
              style={{
                background: label.color,
                border: label.color === "#FFFFFF" ? "1px solid var(--color-cream-2)" : "none",
              }}
            />
            <span className="flex-1 text-sm font-semibold" style={{ color: "var(--color-dark)" }}>
              {label.name}
            </span>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Change</span>
          </>
        ) : (
          <span className="text-sm font-semibold" style={{ color: "var(--color-amber)" }}>
            + Add label
          </span>
        )}
      </button>
    );
  }

  function renderContact() {
    return (
      <div className="flex flex-col gap-2">
        {current.customer_phone ? (
          <a
            href={`tel:${current.customer_phone}`}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--color-amber)" }}
          >
            <span style={{ color: "var(--color-muted)" }}>📞</span>
            {current.customer_phone}
          </a>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>No phone</p>
        )}
        {current.customer_email ? (
          <a
            href={`mailto:${current.customer_email}`}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--color-amber)" }}
          >
            <span style={{ color: "var(--color-muted)" }}>✉️</span>
            {current.customer_email}
          </a>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>No email</p>
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
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--color-muted)" }}>
            Service price
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--color-dark)" }}>
            {price != null ? `₪${price}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--color-muted)" }}>
            Payment
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: ps === "none" ? "#EF4444" : STATUS_COLOR.completed }}
          >
            {paymentLabel[ps]}
          </span>
        </div>
        {ps === "none" && (
          <button
            onClick={() => setShowCheckout(true)}
            className="text-sm font-bold text-start"
            style={{ color: "var(--color-amber)" }}
          >
            Mark as paid →
          </button>
        )}
      </div>
    );
  }

  function renderNotes() {
    return (
      <div className="flex flex-col gap-3">
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          placeholder="Add a note…"
          className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none resize-none"
          style={{
            borderColor: "var(--color-cream-2)",
            background: "var(--color-cream)",
            color: "var(--color-dark)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) =>
            (e.target.style.borderColor = "var(--color-cream-2)")
          }
        />
        {current.customer_id && clientNotes !== null && (
          <div
            className="rounded-xl p-3"
            style={{ background: "var(--color-cream)" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wide mb-1"
              style={{ color: "var(--color-muted)" }}
            >
              Client notes
            </p>
            <p className="text-sm" style={{ color: "var(--color-dark)" }}>
              {clientNotes || "No client notes"}
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderHistory() {
    if (!current.customer_id) {
      return (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No client profile linked.
        </p>
      );
    }
    if (prevBooking === "loading") {
      return (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Loading…
        </p>
      );
    }
    if (prevBooking === null) {
      return (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No previous bookings.
        </p>
      );
    }

    return (
      <div
        className="rounded-xl p-3 flex flex-col gap-1"
        style={{ background: "var(--color-cream)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--color-dark)" }}>
          {format(parseISO(prevBooking.appointment_date), "d MMM yyyy")}
          {prevBooking.service?.name && ` · ${prevBooking.service.name}`}
        </p>
        <p
          className="text-xs font-semibold"
          style={{ color: STATUS_COLOR[prevBooking.status] }}
        >
          {STATUS_LABEL[prevBooking.status]}
        </p>
        <a
          href={`/clients/${current.customer_id}`}
          className="text-xs font-bold mt-1"
          style={{ color: "var(--color-amber)" }}
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
        className="fixed bottom-0 inset-x-0 z-50 rounded-t-[20px] max-h-[85vh] flex flex-col md:inset-y-0 md:left-auto md:end-0 md:w-96 md:rounded-none md:max-h-none"
        style={{
          background: "var(--color-cream)",
          boxShadow: "0 -4px 24px rgba(30,26,20,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable area */}
        <div className="overflow-y-auto flex-1 px-5 pb-2">
          {/* Drag handle — mobile only */}
          <div
            className="w-10 h-1 rounded-full mx-auto mt-3 mb-2 shrink-0 md:hidden"
            style={{ background: "var(--color-cream-2)" }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 end-4 w-7 h-7 flex items-center justify-center rounded-full"
            style={{
              background: "var(--color-cream-2)",
              color: "var(--color-muted)",
              fontSize: 16,
            }}
          >
            ✕
          </button>

          {/* Header card */}
          <div
            className="mt-4 mb-3 rounded-2xl p-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              {/* Avatar */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black shrink-0"
                style={{ background: "var(--color-amber)", color: "#fff" }}
              >
                {initials(current.customer_name)}
              </div>
              <div className="flex-1 min-w-0">
                {/* Name */}
                <p className="font-black truncate" style={{ fontSize: 17, color: "var(--color-dark)" }}>
                  {current.customer_name}
                </p>
                {/* Status badge — tappable */}
                <button
                  onClick={() => setShowStatusSheet(true)}
                  className="mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: statusBg, color }}
                  title="Tap to change status"
                >
                  {STATUS_LABEL[current.status]} ▾
                </button>
              </div>
            </div>
            {/* Date · time · service */}
            <div
              className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
              style={{ background: "var(--color-cream)" }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
                {format(date, "EEEE, d MMM yyyy")}
              </p>
              <p className="text-sm font-bold" style={{ color: "var(--color-dark)" }}>
                {timeStart}–{timeEnd} · {duration} min
                {current.service?.name && <span style={{ color: "var(--color-muted)", fontWeight: 500 }}> · {current.service.name}</span>}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mb-3">{renderActions()}</div>

          {/* Accordion sections */}
          <div
            className="rounded-2xl border mb-4 px-1 overflow-hidden"
            style={{ borderColor: "var(--color-cream-2)", background: "var(--color-surface)" }}
          >
            <AccordionSection
              id="label"
              title="Label"
              open={openSections.includes("label")}
              onToggle={toggleSection}
            >
              {renderLabel()}
            </AccordionSection>
            <AccordionSection
              id="contact"
              title="Contact"
              open={openSections.includes("contact")}
              onToggle={toggleSection}
            >
              {renderContact()}
            </AccordionSection>
            <AccordionSection
              id="payment"
              title="Payment"
              open={openSections.includes("payment")}
              onToggle={toggleSection}
            >
              {renderPayment()}
            </AccordionSection>
            <AccordionSection
              id="notes"
              title="Notes"
              open={openSections.includes("notes")}
              onToggle={toggleSection}
            >
              {renderNotes()}
            </AccordionSection>
            <AccordionSection
              id="history"
              title="History"
              open={openSections.includes("history")}
              onToggle={toggleSection}
            >
              {renderHistory()}
            </AccordionSection>
          </div>
        </div>

        {/* Sticky footer — outside scroll */}
        <div
          className="shrink-0 px-5 py-4 flex gap-3 border-t"
          style={{ borderColor: "var(--color-cream-2)", background: "var(--color-surface)" }}
        >
          <button
            onClick={() => setShowEdit(true)}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{
              background: "var(--wash-amber)",
              color: "var(--color-amber)",
            }}
          >
            Edit appointment
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{
              background: "var(--color-cream-2)",
              color: "var(--color-muted)",
            }}
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
