"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths, getDate } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { InsightsSkeleton } from "@/components/LoadingSkeleton";

const WA_NUMBER = "972501234567";
const WA_MSG = "Hi, I want to turn on paid ads to bring in more bookings.";

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

function isEarned(status: string): boolean {
  return status === "completed";
}

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  boxShadow: "var(--shadow-md)",
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

      const weeksSoFar = Math.ceil(getDate(now) / 7);
      const buckets = Array.from({ length: weeksSoFar }, () => 0);
      cur.forEach((b) => {
        if (!isEarned(b.status) || !b.appointment_date) return;
        const idx = Math.min(Math.ceil(getDate(new Date(b.appointment_date + "T12:00:00")) / 7), weeksSoFar) - 1;
        buckets[idx] += b.service?.price || 0;
      });
      const weekly: WeekPoint[] = buckets.map((rev, i) => ({ label: `Wk ${i + 1}`, revenue: rev }));

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
  const hasDelta = !!stats && stats.previousRevenue > 0;
  const deltaPct = hasDelta
    ? ((stats!.revenue - stats!.previousRevenue) / stats!.previousRevenue) * 100
    : 0;
  const deltaUp = deltaPct >= 0;
  const hasRevenue = !!stats && stats.weekly.some((w) => w.revenue > 0);
  const maxServiceRevenue = Math.max(1, ...(stats?.topServices.map((s) => s.revenue) ?? []));

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-cream)" }}>
      <div className="mx-auto w-full px-4 md:px-6 pt-6 pb-12" style={{ maxWidth: 672 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-[28px] md:text-[32px] font-extrabold leading-tight"
            style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}
          >
            Insights
          </h1>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
            style={{ background: "#fff", boxShadow: "var(--shadow-sm)", color: "var(--color-dark)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-amber)" }} />
            This month
          </span>
        </div>

        {empty ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">

            {/* Revenue hero — amber gradient */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "var(--wash-amber)",
                boxShadow: "var(--shadow-amber)",
              }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: "rgba(255,255,255,0.70)" }}
              >
                Earnings this month
              </p>
              <p
                className="text-[48px] md:text-[52px] font-black leading-none"
                style={{ color: "#fff", letterSpacing: "-0.03em" }}
              >
                ₪{stats!.revenue.toLocaleString()}
              </p>
              {hasDelta && (
                <span
                  className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.22)",
                    color: "#fff",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {deltaUp ? "↑" : "↓"}
                  {Math.abs(deltaPct).toFixed(0)}%
                  <span style={{ opacity: 0.75 }}>vs last month</span>
                </span>
              )}
            </div>

            {/* 2×2 stat grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Bookings"
                value={stats!.bookings}
                icon={<IconCalendarStat />}
                iconBg="rgba(107,96,82,0.10)"
                iconColor="var(--color-muted)"
              />
              <StatCard
                label="Completed"
                value={stats!.completed}
                icon={<IconCheck />}
                iconBg="rgba(34,197,94,0.12)"
                iconColor="#16A34A"
                valueColor="#16A34A"
              />
              <StatCard
                label="No shows"
                value={stats!.noShow}
                icon={<IconNoShow />}
                iconBg={stats!.noShow > 0 ? "rgba(239,68,68,0.10)" : "rgba(107,96,82,0.08)"}
                iconColor={stats!.noShow > 0 ? "#DC2626" : "var(--color-muted)"}
                valueColor={stats!.noShow > 0 ? "#DC2626" : undefined}
              />
              <StatCard
                label="Avg ticket"
                value={`₪${stats!.avgTicket.toLocaleString()}`}
                icon={<IconTag />}
                iconBg="rgba(232,146,10,0.12)"
                iconColor="var(--color-amber)"
              />
            </div>

            {/* Revenue trend */}
            <div className="rounded-2xl p-5 md:p-6" style={cardStyle}>
              <p
                className="text-[15px] font-bold mb-5"
                style={{ color: "var(--color-dark)", letterSpacing: "-0.01em" }}
              >
                Revenue trend
              </p>
              {hasRevenue ? (
                <BarChart data={stats!.weekly} />
              ) : (
                <p className="text-[14px] text-center py-8" style={{ color: "var(--color-muted)" }}>
                  No earnings yet this month.
                </p>
              )}
            </div>

            {/* Top services */}
            <div className="rounded-2xl p-5 md:p-6" style={cardStyle}>
              <p
                className="text-[15px] font-bold mb-5"
                style={{ color: "var(--color-dark)", letterSpacing: "-0.01em" }}
              >
                Top services
              </p>
              {stats!.topServices.length > 0 ? (
                <div className="space-y-5">
                  {stats!.topServices.map((service, idx) => (
                    <div key={service.name} className="flex items-center gap-3">
                      <span
                        className="text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={
                          idx === 0
                            ? { background: "var(--color-amber)", color: "#fff" }
                            : { background: "var(--amber-soft)", color: "var(--color-amber)" }
                        }
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1.5">
                          <p
                            className="text-[15px] font-semibold truncate"
                            style={{ color: "var(--color-dark)" }}
                          >
                            {service.name}
                          </p>
                          <span
                            className="text-[14px] font-bold flex-shrink-0"
                            style={{ color: "var(--color-dark)" }}
                          >
                            ₪{service.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ background: "var(--color-cream-2)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(6, (service.revenue / maxServiceRevenue) * 100)}%`,
                              background: idx === 0 ? "var(--wash-amber)" : "var(--color-amber)",
                              opacity: idx === 0 ? 1 : 0.55 + idx * 0.05,
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
                <p className="text-[14px] text-center py-8" style={{ color: "var(--color-muted)" }}>
                  No completed bookings yet.
                </p>
              )}
            </div>

            {/* Ads nudge */}
            <div
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: "var(--wash-sand)", boxShadow: "var(--shadow-sm)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.40)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold leading-snug" style={{ color: "var(--color-dark)" }}>
                  Want more bookings?
                </p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                  Turn on paid ads and reach new clients.
                </p>
              </div>
              <button
                onClick={() =>
                  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, "_blank")
                }
                className="flex-shrink-0 text-[13px] font-bold text-white px-4 py-2.5 rounded-xl transition-all active:scale-95"
                style={{
                  background: "var(--wash-amber)",
                  boxShadow: "var(--shadow-amber)",
                }}
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

// ─── Empty state ──────────────────────────────────────────────────────────────
// Skeleton layout — shows the real page structure in gray so the user
// understands what will appear once bookings exist.

const SKEL = "rounded-xl" as const;
const skelBg: React.CSSProperties = { background: "rgba(30,26,20,0.07)" };
const skelBgLight: React.CSSProperties = { background: "rgba(30,26,20,0.05)" };

function Bone({ w, h, className = "" }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={`${SKEL} ${className}`}
      style={{ width: w ?? "100%", height: h ?? 14, ...skelBg }}
    />
  );
}

function EmptyState() {
  return (
    <div className="space-y-5">

      {/* Banner */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center gap-3"
        style={{ background: "#fff", boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--amber-soft)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <p className="text-[14px] font-medium" style={{ color: "var(--color-muted)" }}>
          Your numbers appear here once bookings start coming in.
        </p>
      </div>

      {/* Hero skeleton */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "rgba(232,146,10,0.10)", boxShadow: "var(--shadow-sm)" }}
      >
        <Bone w="110px" h="11px" className="mb-4" />
        <Bone w="160px" h="44px" className="mb-4 rounded-2xl" />
        <Bone w="130px" h="28px" className="rounded-full" />
      </div>

      {/* 2×2 stat skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-4 md:p-5" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
            <div className="w-9 h-9 rounded-xl mb-3" style={skelBg} />
            <Bone w="60px" h="32px" className="mb-2 rounded-xl" />
            <Bone w="80px" h="11px" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-2xl p-5 md:p-6" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
        <Bone w="120px" h="14px" className="mb-6" />
        <div className="flex items-end gap-2 h-40">
          {[55, 80, 40, 100].map((pct, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 justify-end">
              <div
                className="w-full rounded-xl"
                style={{ height: `${pct}%`, ...skelBgLight }}
              />
              <div className="w-6 h-2.5 rounded" style={skelBg} />
            </div>
          ))}
        </div>
      </div>

      {/* Top services skeleton */}
      <div className="rounded-2xl p-5 md:p-6" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
        <Bone w="110px" h="14px" className="mb-5" />
        <div className="space-y-5">
          {[100, 75, 50].map((pct, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex-shrink-0" style={skelBg} />
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <Bone w="100px" h="13px" />
                  <Bone w="40px" h="13px" />
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={skelBgLight}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, ...skelBg }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: WeekPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const peak = data.reduce((hi, d, i) => (d.revenue > data[hi].revenue ? i : hi), 0);

  return (
    <div className="flex items-end gap-2 h-52">
      {data.map((d, i) => {
        const isActive = active === i;
        const isPeak = i === peak;
        const heightPct = Math.max(4, (d.revenue / max) * 100);

        return (
          <button
            key={d.label}
            onClick={() => setActive(isActive ? null : i)}
            className="flex-1 flex flex-col items-center gap-2 h-full"
            aria-label={`${d.label}: ₪${d.revenue.toLocaleString()}`}
          >
            {/* value tooltip */}
            <span
              className="px-2 py-1 rounded-full text-[11px] font-bold transition-all duration-150"
              style={{
                background: isActive ? "var(--color-amber)" : "transparent",
                color: isActive ? "#fff" : "transparent",
                whiteSpace: "nowrap",
              }}
            >
              ₪{d.revenue.toLocaleString()}
            </span>
            {/* bar */}
            <div className="flex-1 w-full flex items-end justify-center">
              <div
                className="w-full max-w-[52px] rounded-xl transition-all duration-200"
                style={{
                  height: `${heightPct}%`,
                  background:
                    isActive || isPeak
                      ? "var(--wash-amber)"
                      : "rgba(232,146,10,0.20)",
                  boxShadow: (isActive || isPeak) ? "var(--shadow-amber)" : "none",
                }}
              />
            </div>
            <span className="text-[12px] font-medium leading-none" style={{ color: "var(--color-muted)" }}>
              {d.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl p-4 md:p-5" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <p
        className="text-[30px] md:text-[32px] font-black leading-none mb-1.5"
        style={{ color: valueColor || "var(--color-dark)", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      <p className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCalendarStat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconNoShow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
