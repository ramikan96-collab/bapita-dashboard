"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { FinancialsSkeleton } from "@/components/LoadingSkeleton";
import { STATUS_COLOR, type BookingStatus } from "@/types";

// Rami's WhatsApp line — the payments nudge opens a pre filled chat.
const WA_NUMBER = "972501234567";
const WA_MSG = "היי, אני רוצה להפעיל תשלומים אונליין על ההזמנות שלי";

interface Transaction {
  id: string;
  date: string; // yyyy-MM-dd
  client_name: string;
  service_name: string;
  amount: number;
  status: "paid" | "pending" | "refunded";
}

const STATUS_LABEL: Record<Transaction["status"], string> = {
  paid: "שולם",
  pending: "ממתין",
  refunded: "הוחזר",
};

// Reuse the shared STATUS_COLOR palette instead of redefining hex values.
const STATUS_TO_BOOKING: Record<Transaction["status"], BookingStatus> = {
  paid: "completed",
  pending: "pending",
  refunded: "cancelled",
};

function statusColor(status: Transaction["status"]): string {
  return STATUS_COLOR[STATUS_TO_BOOKING[status]];
}

// Booking row as returned by Supabase with the service relation joined.
interface BookingRow {
  id: string;
  customer_name: string;
  appointment_date: string;
  status: BookingStatus;
  payment_status: string;
  service: { name?: string; price?: number } | null;
}

/* ── Payments OFF: premium "get paid online" nudge ───────────────── */

function BenefitRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(232,146,10,0.12)" }}
      >
        {icon}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="text-[15px] font-bold text-dark leading-snug">{title}</div>
        <div className="text-[13px] text-muted leading-snug mt-0.5">{body}</div>
      </div>
    </div>
  );
}

function NotConnectedView() {
  const stroke = "var(--color-amber)";
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "var(--color-cream)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-7"
          style={{ background: "rgba(232,146,10,0.12)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-[28px] font-extrabold leading-tight text-dark mb-3">
          קבל תשלומים אונליין
        </h1>
        <p className="text-[16px] leading-relaxed text-muted max-w-xs mb-9">
          תן ללקוחות לשלם בעת ההזמנה. פחות ביטולים, פחות מעקב, הכסף ישר אליך.
        </p>

        {/* Three benefit rows */}
        <div className="w-full max-w-xs space-y-5 mb-10 text-start">
          <BenefitRow
            title="גביית פיקדון מראש"
            body="הלקוח משלם בעת ההזמנה ומתחייב לתור."
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            }
          />
          <BenefitRow
            title="פחות לקוחות שלא מגיעים"
            body="תור משולם הוא תור שמגיעים אליו."
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            }
          />
          <BenefitRow
            title="הכסף בחשבון הבנק שלך"
            body="העברות אוטומטיות ישר לחשבון, ללא מעקב ידני."
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="21" x2="21" y2="21" />
                <line x1="5" y1="21" x2="5" y2="10" />
                <line x1="19" y1="21" x2="19" y2="10" />
                <line x1="9" y1="21" x2="9" y2="10" />
                <line x1="15" y1="21" x2="15" y2="10" />
                <path d="M3 10 12 3l9 7" />
              </svg>
            }
          />
        </div>

        {/* Amber CTA */}
        <button
          onClick={() =>
            window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, "_blank")
          }
          className="w-full max-w-xs py-4 rounded-xl text-[15px] font-semibold text-white
            bg-amber hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
          style={{ boxShadow: "0 4px 16px rgba(232,146,10,0.35)" }}
        >
          אני רוצה את זה
        </button>

        <p className="text-[12px] text-muted mt-4">₪49 לחודש בתוספת 1.9% לעסקה</p>
      </div>
    </div>
  );
}

/* ── Payments ON: revenue, transactions, payout ──────────────────── */

function ConnectedView({ transactions, monthRevenue }: { transactions: Transaction[]; monthRevenue: number }) {
  const paidCount = transactions.filter((t) => t.status === "paid").length;
  const fees = Math.round(monthRevenue * 0.019);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-[var(--color-cream-2)] bg-white">
        <h1 className="text-[28px] font-extrabold leading-tight text-dark">כספים</h1>
        <p className="text-[15px] mt-1 text-muted">הכנסות ותשלומים</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Revenue hero */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
          <div className="text-[13px] font-medium text-muted mb-1">הכנסה החודש</div>
          <div className="text-[40px] font-extrabold leading-none" style={{ color: "var(--color-amber)" }}>
            ₪{monthRevenue.toLocaleString()}
          </div>
          <div className="text-[13px] text-muted mt-2">{paidCount} עסקאות שולמו</div>
        </div>

        {/* Payout summary */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
          <div className="px-4 py-3 border-b border-[var(--color-cream-2)]">
            <span className="text-[15px] font-bold text-dark">סיכום תשלומים</span>
          </div>
          <div className="px-4 divide-y divide-[var(--color-cream-2)]">
            {[
              { label: "סך הכל שהתקבל", value: `₪${monthRevenue.toLocaleString()}` },
              { label: "עמלות", value: `₪${fees.toLocaleString()}` },
              {
                label: "להעברה לחשבון",
                value: `₪${(monthRevenue - fees).toLocaleString()}`,
                bold: true,
                amber: true,
              },
            ].map(({ label, value, bold, amber }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className={`text-[14px] ${bold ? "font-semibold text-dark" : "text-muted"}`}>{label}</span>
                <span
                  className={`text-[15px] ${bold ? "font-bold" : "font-medium text-dark"}`}
                  style={amber ? { color: "var(--color-amber)" } : {}}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
          <div className="px-4 py-3 border-b border-[var(--color-cream-2)]">
            <span className="text-[15px] font-bold text-dark">עסקאות אחרונות</span>
          </div>
          {transactions.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[14px] text-muted">אין עסקאות עדיין</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-cream-2)]">
              {transactions.map((tx) => {
                const color = statusColor(tx.status);
                return (
                  <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-dark truncate">{tx.client_name}</div>
                      <div className="text-[12px] text-muted mt-0.5 truncate">
                        {tx.service_name} · {format(parseISO(tx.date), "dd/MM")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[14px] font-semibold text-dark">₪{tx.amount.toLocaleString()}</span>
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${color}26`, color }}
                      >
                        {STATUS_LABEL[tx.status]}
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

export default function FinancialsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [stripeActive, setStripeActive] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!business) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Is the Online Payments add-on active?
    const { data: addon } = await supabase
      .from("addons")
      .select("active")
      .eq("business_id", business.id)
      .eq("type", "stripe")
      .single();

    const active = addon?.active ?? false;
    setStripeActive(active);

    if (active) {
      // Online payments live on bookings paid via stripe, this month.
      const now = new Date();
      const { data } = await supabase
        .from("bookings")
        .select("id, customer_name, appointment_date, status, payment_status, service:services(name, price:price_nis)")
        .eq("business_id", business.id)
        .eq("payment_status", "stripe")
        .gte("appointment_date", format(startOfMonth(now), "yyyy-MM-dd"))
        .lte("appointment_date", format(endOfMonth(now), "yyyy-MM-dd"))
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
    }

    setLoading(false);
  }, [business, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (bizLoading || loading || stripeActive === null) {
    return <FinancialsSkeleton />;
  }

  if (!stripeActive) {
    return <NotConnectedView />;
  }

  const monthRevenue = transactions
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + t.amount, 0);

  return <ConnectedView transactions={transactions} monthRevenue={monthRevenue} />;
}
