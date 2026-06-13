"use client";

import { useState, useEffect } from "react";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { FinancialsSkeleton } from "@/components/LoadingSkeleton";
import { STATUS_COLOR, type BookingStatus } from "@/types";

const WA_NUMBER = "972501234567";

interface Transaction {
  id: string;
  date: string;
  client_name: string;
  service_name: string;
  amount: number;
  status: "paid" | "pending" | "refunded";
}

const TX_STATUS_LABEL: Record<Transaction["status"], string> = {
  paid: "Paid",
  pending: "Pending",
  refunded: "Refunded",
};

const STATUS_TO_BOOKING: Record<Transaction["status"], BookingStatus> = {
  paid: "completed",
  pending: "pending",
  refunded: "cancelled",
};

function txStatusColor(s: Transaction["status"]): string {
  return STATUS_COLOR[STATUS_TO_BOOKING[s]];
}

interface BookingRow {
  id: string;
  customer_name: string;
  appointment_date: string;
  status: BookingStatus;
  payment_status: string;
  service: { name?: string; price?: number } | null;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconStripe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  );
}

function IconPayPal() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082h-2.19c-.98 0-1.808.71-1.96 1.679l-1.12 7.107-.314 2.003a.64.64 0 0 0 .634.74h4.438c.524 0 .968-.382 1.05-.9l.72-4.564c.08-.52.524-.9 1.05-.9h1.327c4.298 0 7.664-1.749 8.647-6.797.41-2.1.158-3.85-.876-5.163z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// ── Processor Card ────────────────────────────────────────────────────────────

function ProcessorCard({
  name,
  icon,
  description,
  color,
  waMsg,
}: {
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  waMsg: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}18`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>{name}</div>
        <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2, lineHeight: 1.45 }}>{description}</div>
      </div>
      <button
        onClick={() =>
          window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`, "_blank")
        }
        style={{
          height: 34,
          padding: "0 16px",
          borderRadius: 9,
          background: "var(--color-amber)",
          color: "white",
          fontSize: 13,
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-amber-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-amber)")}
      >
        Connect
      </button>
    </div>
  );
}

// ── Locked Invoices Preview ───────────────────────────────────────────────────

function LockedInvoicesPreview() {
  const rows = [
    { status: "Paid", color: "#22C55E", date: "Jun 10", id: "#001", client: "Alex K.", amount: "₪250" },
    { status: "Pending", color: "#94A3B8", date: "Jun 8", id: "#002", client: "David M.", amount: "₪180" },
    { status: "Refunded", color: "#EF4444", date: "Jun 5", id: "#003", client: "Yoni T.", amount: "₪120" },
  ];

  const cols = "90px 70px 50px 1fr 80px";

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
      {/* Table (dimmed) */}
      <div
        style={{
          background: "var(--color-surface)",
          boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
          opacity: 0.35,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: "0 12px",
            padding: "10px 16px",
            borderBottom: "1px solid var(--color-cream-2)",
          }}
        >
          {["STATUS", "DATE", "ID", "CLIENT", "AMOUNT"].map((col) => (
            <span
              key={col}
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.07em",
                color: "var(--color-muted)",
              }}
            >
              {col}
            </span>
          ))}
        </div>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: "0 12px",
              padding: "12px 16px",
              borderBottom: i < rows.length - 1 ? "1px solid var(--color-cream-2)" : undefined,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 9px",
                borderRadius: 999,
                background: `${row.color}20`,
                color: row.color,
                display: "inline-block",
              }}
            >
              {row.status}
            </span>
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{row.date}</span>
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{row.id}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-dark)" }}>{row.client}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)" }}>{row.amount}</span>
          </div>
        ))}
      </div>

      {/* Lock overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(250,245,236,0.82)",
          backdropFilter: "blur(3px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--color-cream-2)",
            color: "var(--color-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconLock />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-dark)", textAlign: "center" }}>
          Connect a processor to unlock invoices
        </div>
      </div>
    </div>
  );
}

// ── Not Connected View ────────────────────────────────────────────────────────

function NotConnectedView() {
  const processors = [
    {
      name: "Stripe",
      icon: <IconStripe />,
      description: "Card payments, Apple Pay, Google Pay — collect deposits at booking.",
      color: "#635BFF",
      waMsg: "Hi, I want to set up Stripe payments on Bapita",
    },
    {
      name: "PayPal",
      icon: <IconPayPal />,
      description: "Accept PayPal and major card payments from clients worldwide.",
      color: "#003087",
      waMsg: "Hi, I want to set up PayPal payments on Bapita",
    },
  ];

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "var(--color-muted)",
    marginBottom: 10,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>
      <div
        style={{
          flexShrink: 0,
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-cream-2)",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "26px 24px 18px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0 }}>
            Financials
          </h1>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "24px 24px 64px" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={sectionLabel}>Payment Processors</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {processors.map((p) => (
                <ProcessorCard key={p.name} {...p} />
              ))}
            </div>
          </div>

          <div>
            <div style={sectionLabel}>Invoices</div>
            <LockedInvoicesPreview />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Connected View ────────────────────────────────────────────────────────────

type TxStatusFilter = "all" | "paid" | "pending" | "refunded";
type TxSortOrder = "date-desc" | "date-asc" | "amount-desc";

const TX_FILTERS: { value: TxStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "refunded", label: "Refunded" },
];

const TX_SORTS: { value: TxSortOrder; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Highest amount" },
];

function downloadCSV(rows: Transaction[], month: Date) {
  const header = "Date,Client,Service,Amount,Status\n";
  const body = rows
    .map((r) => `${r.date},"${r.client_name}","${r.service_name}",${r.amount},${r.status}`)
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `financials-${format(month, "yyyy-MM")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ConnectedView({
  transactions,
  currentMonth,
  onPrevMonth,
  onNextMonth,
}: {
  transactions: Transaction[];
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "invoices">("overview");
  const [txFilter, setTxFilter] = useState<TxStatusFilter>("all");
  const [txSort, setTxSort] = useState<TxSortOrder>("date-desc");
  const [showSortDd, setShowSortDd] = useState(false);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest(".dd-fin-sort")) setShowSortDd(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  const paid = transactions.filter((t) => t.status === "paid");
  const revenue = paid.reduce((s, t) => s + t.amount, 0);
  const fees = Math.round(revenue * 0.019);
  const net = revenue - fees;

  const kpis = [
    { label: "Revenue", value: `₪${revenue.toLocaleString()}`, amber: true, big: true },
    { label: "Transactions", value: String(paid.length), amber: false, big: false },
    { label: "Fees (1.9%)", value: `₪${fees.toLocaleString()}`, amber: false, big: false },
    { label: "Net payout", value: `₪${net.toLocaleString()}`, amber: true, big: false },
  ];

  const filtered = transactions
    .filter((t) => txFilter === "all" || t.status === txFilter)
    .sort((a, b) => {
      if (txSort === "date-asc") return a.date.localeCompare(b.date);
      if (txSort === "amount-desc") return b.amount - a.amount;
      return b.date.localeCompare(a.date);
    });

  const currentSortLabel = TX_SORTS.find((s) => s.value === txSort)?.label ?? "Newest first";

  const navBtnStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: "1.5px solid var(--color-cream-2)",
    background: "var(--color-surface)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--color-muted)",
    transition: "border-color 0.15s",
  };

  const TABLE_COLS = "100px 70px 1fr 80px";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-cream-2)",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "26px 24px 14px" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0 }}>
              Financials
            </h1>
            {activeTab === "overview" && (
              <button
                onClick={() => downloadCSV(filtered, currentMonth)}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 9,
                  border: "1.5px solid var(--color-cream-2)",
                  background: "var(--color-surface)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-dark)",
                  cursor: "pointer",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-amber)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--color-amber)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-cream-2)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--color-dark)";
                }}
              >
                <IconDownload />
                Export CSV
              </button>
            )}
          </div>

          {/* Tabs + month picker */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["overview", "invoices"] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      height: 30,
                      padding: "0 14px",
                      borderRadius: 999,
                      border: "none",
                      background: active ? "var(--color-dark)" : "var(--color-cream-2)",
                      color: active ? "white" : "var(--color-muted)",
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {tab === "overview" ? "Overview" : "Invoices"}
                  </button>
                );
              })}
            </div>

            {activeTab === "overview" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={onPrevMonth}
                  style={navBtnStyle}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-amber)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-cream-2)")}
                >
                  <IconChevronLeft />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-dark)", minWidth: 92, textAlign: "center" }}>
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <button
                  onClick={onNextMonth}
                  style={navBtnStyle}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-amber)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-cream-2)")}
                >
                  <IconChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "overview" ? (
          <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "20px 24px 64px" }}>
            {/* KPI cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {kpis.map(({ label, value, amber, big }) => (
                <div
                  key={label}
                  style={{
                    background: "var(--color-surface)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      color: "var(--color-muted)",
                      marginBottom: 6,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: big ? 28 : 22,
                      fontWeight: 800,
                      color: amber ? "var(--color-amber)" : "var(--color-dark)",
                      lineHeight: 1.1,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Filter + sort bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap" as const,
              }}
            >
              <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" as const }}>
                {TX_FILTERS.map(({ value, label }) => {
                  const active = txFilter === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setTxFilter(value)}
                      style={{
                        height: 30,
                        padding: "0 12px",
                        borderRadius: 999,
                        border: `1.5px solid ${active ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                        background: active ? "var(--amber-soft)" : "var(--color-surface)",
                        color: active ? "var(--color-amber)" : "var(--color-muted)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="dd-fin-sort" style={{ position: "relative" }}>
                <button
                  onClick={() => setShowSortDd(!showSortDd)}
                  style={{
                    height: 30,
                    padding: "0 11px",
                    borderRadius: 9,
                    border: "1.5px solid var(--color-cream-2)",
                    background: "var(--color-surface)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-dark)",
                    cursor: "pointer",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  <span
                    style={{
                      color: "var(--color-muted)",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Sort
                  </span>
                  <span>{currentSortLabel}</span>
                  <span style={{ opacity: 0.6, display: "flex" }}>
                    <IconChevronDown />
                  </span>
                </button>

                {showSortDd && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 6px)",
                      width: 160,
                      background: "var(--color-surface)",
                      borderRadius: 12,
                      boxShadow: "0 8px 32px rgba(30,26,20,0.12), 0 1px 2px rgba(30,26,20,0.06)",
                      border: "1px solid var(--color-cream-2)",
                      overflow: "hidden",
                      zIndex: 30,
                    }}
                  >
                    {TX_SORTS.map((opt) => {
                      const sel = txSort === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => { setTxSort(opt.value); setShowSortDd(false); }}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            display: "flex",
                            alignItems: "center",
                            fontSize: 13,
                            fontWeight: sel ? 700 : 500,
                            color: sel ? "var(--color-amber)" : "var(--color-dark)",
                            background: sel ? "var(--amber-soft)" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left" as const,
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-cream)"; }}
                          onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Transaction table */}
            {filtered.length === 0 ? (
              <div
                style={{
                  background: "var(--color-surface)",
                  borderRadius: 16,
                  padding: "48px 16px",
                  textAlign: "center",
                  boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "var(--color-cream-2)",
                    color: "var(--color-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  <IconReceipt />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", marginBottom: 4 }}>
                  No transactions
                </div>
                <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
                  {txFilter === "all"
                    ? `No payments recorded for ${format(currentMonth, "MMMM yyyy")}`
                    : `No ${txFilter} transactions this month`}
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--color-surface)",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
                }}
              >
                {/* Column headers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: TABLE_COLS,
                    gap: "0 12px",
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--color-cream-2)",
                  }}
                >
                  {["STATUS", "DATE", "CLIENT / SERVICE", "AMOUNT"].map((col) => (
                    <span
                      key={col}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.07em",
                        color: "var(--color-muted)",
                      }}
                    >
                      {col}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                {filtered.map((tx, i) => {
                  const color = txStatusColor(tx.status);
                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: TABLE_COLS,
                        gap: "0 12px",
                        padding: "12px 16px",
                        borderBottom: i < filtered.length - 1 ? "1px solid var(--color-cream-2)" : undefined,
                        alignItems: "center",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-cream)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 999,
                          background: `${color}20`,
                          color,
                          display: "inline-block",
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        {TX_STATUS_LABEL[tx.status]}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
                        {format(parseISO(tx.date), "MMM d")}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--color-dark)",
                            whiteSpace: "nowrap" as const,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {tx.client_name}
                        </div>
                        {tx.service_name && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-muted)",
                              marginTop: 1,
                              whiteSpace: "nowrap" as const,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {tx.service_name}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>
                        ₪{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Invoices tab — backend wiring pending */
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              width: "100%",
              padding: "64px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--color-cream-2)",
                color: "var(--color-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <IconReceipt />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>
              No invoices yet
            </div>
            <div style={{ fontSize: 13, color: "var(--color-muted)" }}>Invoice creation coming soon</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancialsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [stripeActive, setStripeActive] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // One-time: check stripe add-on status
  useEffect(() => {
    if (bizLoading) return;
    if (!business) { setLoading(false); return; }
    (async () => {
      const { data: addon } = await supabase
        .from("addons")
        .select("active")
        .eq("business_id", business.id)
        .eq("type", "stripe")
        .single();
      setStripeActive(addon?.active ?? false);
      setLoading(false);
    })();
  }, [business?.id, bizLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch transactions whenever stripe is active or month changes
  useEffect(() => {
    if (!business || !stripeActive) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, customer_name, appointment_date, status, payment_status, service:services(name, price:price_nis)")
        .eq("business_id", business.id)
        .eq("payment_status", "stripe")
        .gte("appointment_date", format(startOfMonth(currentMonth), "yyyy-MM-dd"))
        .lte("appointment_date", format(endOfMonth(currentMonth), "yyyy-MM-dd"))
        .order("appointment_date", { ascending: false });

      const rows = (data as BookingRow[] | null) ?? [];
      setTransactions(
        rows.map((b) => ({
          id: b.id,
          date: b.appointment_date,
          client_name: b.customer_name,
          service_name: b.service?.name ?? "",
          amount: b.service?.price ?? 0,
          status: b.status === "cancelled" || b.status === "no_show" ? "refunded" : "paid",
        }))
      );
    })();
  }, [business?.id, stripeActive, currentMonth.getFullYear(), currentMonth.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (bizLoading || loading) return <FinancialsSkeleton />;
  if (!stripeActive) return <NotConnectedView />;

  return (
    <ConnectedView
      transactions={transactions}
      currentMonth={currentMonth}
      onPrevMonth={() => setCurrentMonth((m) => subMonths(m, 1))}
      onNextMonth={() => setCurrentMonth((m) => addMonths(m, 1))}
    />
  );
}
