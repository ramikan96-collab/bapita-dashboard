"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths, getDate } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { InsightsSkeleton } from "@/components/LoadingSkeleton";
import { STATUS_COLOR } from "@/types";

// Rami's WhatsApp line — the ads nudge opens a pre filled chat.
const WA_NUMBER = "972501234567";
const WA_MSG = "Hi, I want to turn on paid ads to bring in more bookings.";

// Supabase types the joined relation as an array; it is to one here.
interface BookingRow {
  status: string;
  appointment_date?: string;
  service: { name?: string; price?: number } | null;
}

interface WeekPoint {
  label: string;
  revenue: number;
}

interface TopService {
  name: string;
  count: number;
  revenue: number;
}

interface Stats {
  revenue: number;
  previousRevenue: number;
  bookings: number;
  completed: number;
  noShow: number;
  avgTicket: number;
  weekly: WeekPoint[];
  topServices: TopService[];
}

// Earnings count only completed bookings — confirmed, pending, cancelled and
// no show have not produced real money.
function isEarned(status: string): boolean {
  return status === "completed";
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
};

export default function InsightsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;

    async function fetchStats() {
      if (!business) return;
      setLoading(true);

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastStart = startOfMonth(subMonths(now, 1));
      const lastEnd = endOfMonth(subMonths(now, 1));

      const fmt = (d: Date) => format(d, "yyyy-MM-dd");

      const { data: current } = await supabase
        .from("bookings")
        .select("status, appointment_date, service:services(name, price)")
        .eq("business_id", business.id)
        .gte("appointment_date", fmt(monthStart))
        .lte("appointment_date", fmt(monthEnd));

      const { data: previous } = await supabase
        .from("bookings")
        .select("status, service:services(price)")
        .eq("business_id", business.id)
        .gte("appointment_date", fmt(lastStart))
        .lte("appointment_date", fmt(lastEnd));

      const cur = (current || []) as unknown as BookingRow[];
      const prev = (previous || []) as unknown as BookingRow[];

      const revenue = cur.reduce(
        (sum, b) => sum + (isEarned(b.status) ? b.service?.price || 0 : 0), 0,
      );
      const previousRevenue = prev.reduce(
        (sum, b) => sum + (isEarned(b.status) ? b.service?.price || 0 : 0), 0,
      );

      const bookings = cur.length;
      const completed = cur.filter((b) => isEarned(b.status)).length;
      const noShow = cur.filter((b) => b.status === "no_show").length;
      const avgTicket = completed > 0 ? Math.round(revenue / completed) : 0;

      // Revenue by week of month. Fixed buckets so empty weeks still render —
      // weeks beyond today are dropped to avoid trailing flat bars.
      const weeksSoFar = Math.ceil(getDate(now) / 7);
      const buckets = Array.from({ length: weeksSoFar }, () => 0);
      cur.forEach((b) => {
        if (!isEarned(b.status) || !b.appointment_date) return;
        const idx = Math.min(Math.ceil(getDate(new Date(b.appointment_date + "T12:00:00")) / 7), weeksSoFar) - 1;
        buckets[idx] += b.service?.price || 0;
      });
      const weekly: WeekPoint[] = buckets.map((rev, i) => ({ label: `Wk ${i + 1}`, revenue: rev }));

      // Top services ranked by completed bookings, with earned revenue.
      const map = new Map<string, TopService>();
      cur.forEach((b) => {
        if (!isEarned(b.status) || !b.service?.name) return;
        const e = map.get(b.service.name);
        if (e) {
          e.count++;
          e.revenue += b.service.price || 0;
        } else {
          map.set(b.service.name, { name: b.service.name, count: 1, revenue: b.service.price || 0 });
        }
      });
      const topServices = Array.from(map.values())
        .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
        .slice(0, 5);

      setStats({ revenue, previousRevenue, bookings, completed, noShow, avgTicket, weekly, topServices });
      setLoading(false);
    }

    fetchStats();
  }, [business, supabase]);

  if (bizLoading || (business && loading)) return <InsightsSkeleton />;

  const empty = !stats || stats.bookings === 0;

  // Delta vs last month. No prior earnings means we cannot show a percentage.
  const hasDelta = !!stats && stats.previousRevenue > 0;
  const deltaPct = hasDelta
    ? ((stats!.revenue - stats!.previousRevenue) / stats!.previousRevenue) * 100
    : 0;
  const deltaUp = deltaPct >= 0;

  const hasRevenue = !!stats && stats.weekly.some((w) => w.revenue > 0);
  const maxServiceRevenue = Math.max(1, ...(stats?.topServices.map((s) => s.revenue) ?? []));

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-cream)" }}>
      <div className="mx-auto w-full max-w-2xl px-4 md:px-6 pt-6 pb-10">

        {/* Header with date range chip */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] md:text-[32px] font-extrabold leading-tight" style={{ color: "var(--color-dark)" }}>
            Insights
          </h1>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium"
            style={{ ...cardStyle, color: "var(--color-dark)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-amber)" }} />
            This month
          </span>
        </div>

        {empty ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">

            {/* Revenue hero */}
            <div className="rounded-2xl p-5 md:p-6" style={cardStyle}>
              <p className="text-[13px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>
                Earnings this month
              </p>
              <p className="text-[40px] md:text-[44px] font-black leading-none" style={{ color: "var(--color-amber)" }}>
                ₪{stats!.revenue.toLocaleString()}
              </p>
              {hasDelta && (
                <p
                  className="inline-flex items-center gap-1 text-[14px] font-semibold mt-3"
                  style={{ color: deltaUp ? "#16A34A" : "#DC2626" }}
                >
                  <span>{deltaUp ? "↑" : "↓"}</span>
                  {Math.abs(deltaPct).toFixed(0)}%
                  <span className="font-medium" style={{ color: "var(--color-muted)" }}>vs last month</span>
                </p>
              )}
            </div>

            {/* 2 by 2 stat grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Bookings" value={stats!.bookings} />
              <StatCard label="Completed" value={stats!.completed} color={STATUS_COLOR.completed} />
              <StatCard
                label="No shows"
                value={stats!.noShow}
                color={stats!.noShow > 0 ? STATUS_COLOR.no_show : undefined}
              />
              <StatCard label="Average ticket" value={`₪${stats!.avgTicket.toLocaleString()}`} />
            </div>

            {/* Revenue trend — hand rolled SVG bars */}
            <div className="rounded-2xl p-5 md:p-6" style={cardStyle}>
              <p className="text-[15px] font-bold mb-5" style={{ color: "var(--color-dark)" }}>
                Revenue trend
              </p>
              {hasRevenue ? (
                <BarChart data={stats!.weekly} />
              ) : (
                <p className="text-[14px] text-center py-6" style={{ color: "var(--color-muted)" }}>
                  No earnings yet this month.
                </p>
              )}
            </div>

            {/* Top services */}
            <div className="rounded-2xl p-5 md:p-6" style={cardStyle}>
              <p className="text-[15px] font-bold mb-4" style={{ color: "var(--color-dark)" }}>
                Top services
              </p>
              {stats!.topServices.length > 0 ? (
                <div className="space-y-4">
                  {stats!.topServices.map((service, idx) => (
                    <div key={service.name} className="flex items-center gap-3">
                      <span
                        className="text-[12px] font-bold w-4 text-center flex-shrink-0"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                          <p className="text-[15px] font-medium truncate" style={{ color: "var(--color-dark)" }}>
                            {service.name}
                          </p>
                          <span className="text-[14px] font-semibold flex-shrink-0" style={{ color: "var(--color-dark)" }}>
                            ₪{service.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-cream-2)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(6, (service.revenue / maxServiceRevenue) * 100)}%`,
                              background: "var(--color-amber)",
                            }}
                          />
                        </div>
                        <p className="text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>
                          {service.count} {service.count === 1 ? "booking" : "bookings"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-center py-6" style={{ color: "var(--color-muted)" }}>
                  No completed bookings yet.
                </p>
              )}
            </div>

            {/* Ads nudge — the only upsell allowed on this page */}
            <div className="rounded-2xl p-4 flex items-center gap-4" style={cardStyle}>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(232,146,10,0.12)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold leading-snug" style={{ color: "var(--color-dark)" }}>
                  Want more bookings?
                </p>
                <p className="text-[13px] leading-snug" style={{ color: "var(--color-muted)" }}>
                  Turn on paid ads.
                </p>
              </div>
              <button
                onClick={() =>
                  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, "_blank")
                }
                className="flex-shrink-0 text-[14px] font-semibold text-white px-4 py-2.5 rounded-xl bg-amber hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
              >
                Turn on
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
// Shown before any booking exists. No fake numbers — the page stays honest.

function EmptyState() {
  return (
    <div className="rounded-2xl px-6 py-12 flex flex-col items-center text-center" style={cardStyle}>
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(232,146,10,0.12)" }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>
      <p className="text-[17px] font-bold mb-1.5" style={{ color: "var(--color-dark)" }}>
        No numbers yet
      </p>
      <p className="text-[14px] leading-relaxed max-w-[260px]" style={{ color: "var(--color-muted)" }}>
        Once bookings start coming in, your earnings, busiest weeks, and top services show up here.
      </p>
    </div>
  );
}

// ─── Bar chart ───────────────────────────────────────────────────────────────
// No chart lib. Flexbox columns so bars stay crisp and fill the card at any
// width. Tap a bar to read its value; the tallest bar is amber, the rest faded.

function BarChart({ data }: { data: WeekPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const peak = data.reduce((hi, d, i) => (d.revenue > data[hi].revenue ? i : hi), 0);

  return (
    <div className="flex items-end gap-3 h-44">
      {data.map((d, i) => {
        const isActive = active === i;
        const highlight = isActive || i === peak;
        const heightPct = Math.max(3, (d.revenue / max) * 100);

        return (
          <button
            key={d.label}
            onClick={() => setActive(isActive ? null : i)}
            className="flex-1 flex flex-col items-center gap-2 h-full"
            aria-label={`${d.label}: ₪${d.revenue.toLocaleString()}`}
          >
            <span
              className="h-4 text-[12px] font-bold leading-none transition-opacity"
              style={{ color: "var(--color-dark)", opacity: isActive ? 1 : 0 }}
            >
              ₪{d.revenue.toLocaleString()}
            </span>
            <div className="flex-1 w-full flex items-end justify-center">
              <div
                className="w-full max-w-[56px] rounded-t-lg transition-all duration-200"
                style={{
                  height: `${heightPct}%`,
                  background: highlight ? "var(--color-amber)" : "rgba(232,146,10,0.26)",
                }}
              />
            </div>
            <span className="text-[12px] leading-none" style={{ color: "var(--color-muted)" }}>
              {d.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  label, value, color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl p-4 md:p-5" style={cardStyle}>
      <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>{label}</p>
      <p className="text-[30px] md:text-[32px] font-black leading-none" style={{ color: color || "var(--color-dark)" }}>
        {value}
      </p>
    </div>
  );
}
