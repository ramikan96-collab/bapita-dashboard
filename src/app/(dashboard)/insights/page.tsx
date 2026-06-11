"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths, getDate } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { InsightsSkeleton } from "@/components/LoadingSkeleton";
import { STATUS_COLOR } from "@/types";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

// Rami's WhatsApp line — the ads nudge opens a pre filled chat.
const WA_NUMBER = "972501234567";
const WA_MSG = "היי, אני מעוניין להפעיל מודעות ממומנות כדי להביא יותר הזמנות";

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
        if (!isEarned(b.status)) return;
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

  if (!stats) {
    return (
      <div className="flex justify-center py-16" style={{ background: "var(--color-cream)" }}>
        <p className="text-[15px]" style={{ color: "var(--color-muted)" }}>No data available</p>
      </div>
    );
  }

  // Delta vs last month. No prior earnings means we cannot show a percentage.
  const hasDelta = stats.previousRevenue > 0;
  const deltaPct = hasDelta
    ? ((stats.revenue - stats.previousRevenue) / stats.previousRevenue) * 100
    : 0;
  const deltaUp = deltaPct >= 0;

  const cardStyle = {
    background: "var(--color-surface)",
    boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
  };

  const maxServiceRevenue = Math.max(1, ...stats.topServices.map((s) => s.revenue));

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header with date range chip */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-4">
        <h1 className="text-[28px] font-extrabold leading-tight" style={{ color: "var(--color-dark)" }}>
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

      <div className="flex-1 px-4 pb-8 space-y-3">

        {/* Revenue hero */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <p className="text-[13px] font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>
            Earnings this month
          </p>
          <p className="text-[44px] font-black leading-none" style={{ color: "var(--color-amber)" }}>
            ₪{stats.revenue.toLocaleString()}
          </p>
          {hasDelta && (
            <p
              className="inline-flex items-center gap-1 text-[14px] font-semibold mt-2.5"
              style={{ color: deltaUp ? "#16A34A" : "#DC2626" }}
            >
              <span>{deltaUp ? "↑" : "↓"}</span>
              {Math.abs(deltaPct).toFixed(0)}%
              <span className="font-medium" style={{ color: "var(--color-muted)" }}>vs last month</span>
            </p>
          )}
        </div>

        {/* 2 by 2 stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Bookings" value={stats.bookings} cardStyle={cardStyle} />
          <StatCard label="Completed" value={stats.completed} color={STATUS_COLOR.completed} cardStyle={cardStyle} />
          <StatCard label="No shows" value={stats.noShow} color={stats.noShow > 0 ? STATUS_COLOR.no_show : undefined} cardStyle={cardStyle} />
          <StatCard label="Average ticket" value={`₪${stats.avgTicket.toLocaleString()}`} cardStyle={cardStyle} />
        </div>

        {/* Revenue by week */}
        {stats.weekly.length > 0 && (
          <div className="rounded-2xl p-4" style={cardStyle}>
            <p className="text-[15px] font-bold mb-4" style={{ color: "var(--color-dark)" }}>
              Revenue by week
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={stats.weekly} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "var(--color-muted)", fontFamily: "Heebo" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "none",
                    background: "var(--color-dark)",
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "Heebo",
                    padding: "8px 12px",
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ color: "rgba(255,255,255,0.65)", marginBottom: 2 }}
                  formatter={(value) => [`₪${Number(value).toLocaleString()}`, "Revenue"]}
                  cursor={{ fill: "rgba(30,26,20,0.04)" }}
                />
                <Bar dataKey="revenue" fill="var(--color-amber)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top services */}
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[15px] font-bold mb-3" style={{ color: "var(--color-dark)" }}>
            Top services
          </p>
          {stats.topServices.length > 0 ? (
            <div className="space-y-3.5">
              {stats.topServices.map((service, idx) => (
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
                    {/* Mini revenue bar */}
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
            <p className="text-[15px] text-center py-4" style={{ color: "var(--color-muted)" }}>
              No completed bookings yet
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
    </div>
  );
}

function StatCard({
  label, value, color, cardStyle,
}: {
  label: string;
  value: number | string;
  color?: string;
  cardStyle: React.CSSProperties;
}) {
  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>{label}</p>
      <p className="text-[32px] font-black leading-none" style={{ color: color || "var(--color-dark)" }}>
        {value}
      </p>
    </div>
  );
}
