"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

const WA_NUMBER = "972501234567";
const WA_MSG = "היי, אני מעוניין להפעיל תשלומים אונליין דרך Stripe";

interface Transaction {
  id: string;
  date: string;
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

const STATUS_STYLE: Record<Transaction["status"], { bg: string; color: string }> = {
  paid:     { bg: "rgba(34,197,94,0.12)",  color: "#16A34A" },
  pending:  { bg: "rgba(148,163,184,0.15)", color: "#64748B" },
  refunded: { bg: "rgba(239,68,68,0.12)",  color: "#DC2626" },
};

function NotConnectedView() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-6"
          style={{ background: "rgba(232,146,10,0.12)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
        </div>

        {/* Copy */}
        <h1 className="text-[28px] font-extrabold leading-tight text-dark mb-3">
          קבל תשלומים על הזמנות
        </h1>
        <p className="text-[16px] leading-relaxed text-muted max-w-xs mb-8">
          הפעל תשלומים אונליין עם Stripe ותן ללקוחות לשלם ישירות בעת ההזמנה.
        </p>

        {/* Feature bullets */}
        <div className="w-full max-w-xs space-y-3 mb-10 text-start">
          {[
            "לקוחות משלמים בעת ההזמנה",
            "מדיניות ביטול ופיקדון",
            "הוצאת חשבוניות אוטומטית",
            "העברות לחשבון הבנק שלך",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(232,146,10,0.15)" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="text-[15px] text-dark">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() =>
            window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, "_blank")
          }
          className="w-full max-w-xs py-4 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2
            bg-[#25D366] hover:bg-[#1da851] active:bg-[#18a349] transition-colors"
          style={{ boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
          </svg>
          צור קשר להפעלה
        </button>

        <p className="text-[12px] text-muted mt-4">₪49/חודש + 1.9% לעסקה</p>
      </div>
    </div>
  );
}

function ConnectedView({ transactions, monthRevenue }: { transactions: Transaction[]; monthRevenue: number }) {
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
          <div className="text-[13px] text-muted mt-2">
            {transactions.filter((t) => t.status === "paid").length} עסקאות הושלמו
          </div>
        </div>

        {/* Payout summary */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
          <div className="px-4 py-3 border-b border-[var(--color-cream-2)]">
            <span className="text-[15px] font-bold text-dark">סיכום תשלומים</span>
          </div>
          <div className="px-4 divide-y divide-[var(--color-cream-2)]">
            {[
              { label: "סה\"כ שהתקבל", value: `₪${monthRevenue.toLocaleString()}` },
              { label: "עמלות", value: `₪${Math.round(monthRevenue * 0.019).toLocaleString()}` },
              {
                label: "להעברה לחשבון",
                value: `₪${Math.round(monthRevenue * 0.981).toLocaleString()}`,
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
              {transactions.map((tx) => (
                <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-dark truncate">{tx.client_name}</div>
                    <div className="text-[12px] text-muted mt-0.5 truncate">
                      {tx.service_name} · {tx.date}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[14px] font-semibold text-dark">₪{tx.amount}</span>
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={STATUS_STYLE[tx.status]}
                    >
                      {STATUS_LABEL[tx.status]}
                    </span>
                  </div>
                </div>
              ))}
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
  const [transactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!business) { setLoading(false); return; }
      const { data } = await supabase
        .from("addons")
        .select("active")
        .eq("business_id", business.id)
        .eq("type", "stripe")
        .single();
      setStripeActive(data?.active ?? false);
      setLoading(false);
    }
    load();
  }, [business, supabase]);

  if (bizLoading || loading || stripeActive === null) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!stripeActive) {
    return <NotConnectedView />;
  }

  const monthRevenue = transactions
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + t.amount, 0);

  return <ConnectedView transactions={transactions} monthRevenue={monthRevenue} />;
}
