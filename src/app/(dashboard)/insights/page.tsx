"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  format, parseISO, addDays, subDays, subMonths, subWeeks,
  startOfMonth, endOfMonth,
  differenceInDays, eachWeekOfInterval, eachMonthOfInterval,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { InsightsSkeleton } from "@/components/LoadingSkeleton";
import VisitorsTab from "./_components/VisitorsTab";
import { STATUS_COLOR, STATUS_BG, STATUS_LABEL, type BookingStatus } from "@/types";

const WA_NUMBER = "972501234567";
const WA_MSG = "Hi, I want to turn on paid ads to bring in more bookings.";

type Tab = "overview" | "appointments" | "revenue" | "visitors";
type RangeKey = "week" | "month" | "3months" | "custom";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "week",    label: "1 Week"   },
  { key: "month",   label: "1 Month"  },
  { key: "3months", label: "3 Months" },
  { key: "custom",  label: "Custom"   },
];

interface BookingRow {
  id: string;
  status: BookingStatus;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  payment_status: string;
  service: { name?: string; price?: number; duration?: number } | null;
}

interface ChartPoint { label: string; revenue: number }
interface TopService  { name: string; count: number; revenue: number }
interface RevenueService { name: string; count: number; earned: number; receivable: number }

interface Stats {
  revenue: number;
  previousRevenue: number;
  bookings: number;
  completed: number;
  noShow: number;
  avgTicket: number;
  chart: ChartPoint[];
  topServices: TopService[];
}

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
function isEarned(s: string) { return s === "completed"; }

function getRangeDates(key: RangeKey, customStart: string, customEnd: string) {
  const now = new Date();
  let start: Date, end: Date, prevStart: Date, prevEnd: Date;

  if (key === "week") {
    end       = now;
    start     = subWeeks(now, 1);
    prevEnd   = subDays(start, 1);
    prevStart = subWeeks(prevEnd, 1);
  } else if (key === "month") {
    start     = startOfMonth(now);
    end       = endOfMonth(now);
    prevStart = startOfMonth(subMonths(now, 1));
    prevEnd   = endOfMonth(subMonths(now, 1));
  } else if (key === "3months") {
    end       = now;
    start     = subMonths(now, 3);
    prevEnd   = subDays(start, 1);
    prevStart = subMonths(prevEnd, 3);
  } else {
    start     = customStart ? parseISO(customStart) : subMonths(now, 1);
    end       = customEnd   ? parseISO(customEnd)   : now;
    const span = differenceInDays(end, start);
    prevEnd   = subDays(start, 1);
    prevStart = subDays(prevEnd, span);
  }

  return { start, end, prevStart, prevEnd };
}

function buildChart(bookings: BookingRow[], start: Date, end: Date): ChartPoint[] {
  const span = differenceInDays(end, start);

  if (span <= 14) {
    const days: ChartPoint[] = [];
    for (let i = 0; i <= span; i++) {
      const d = addDays(start, i);
      const label = format(d, "d MMM");
      const revenue = bookings
        .filter((b) => isEarned(b.status) && b.appointment_date === fmt(d))
        .reduce((s, b) => s + (b.service?.price || 0), 0);
      days.push({ label, revenue });
    }
    return days;
  } else if (span <= 93) {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    return weeks.map((wStart, i) => {
      const wEnd = addDays(wStart, 6);
      const revenue = bookings
        .filter((b) => isEarned(b.status) && b.appointment_date >= fmt(wStart) && b.appointment_date <= fmt(wEnd))
        .reduce((s, b) => s + (b.service?.price || 0), 0);
      return { label: `Wk ${i + 1}`, revenue };
    });
  } else {
    const months = eachMonthOfInterval({ start, end });
    return months.map((mStart) => {
      const mEnd = endOfMonth(mStart);
      const revenue = bookings
        .filter((b) => isEarned(b.status) && b.appointment_date >= fmt(mStart) && b.appointment_date <= fmt(mEnd))
        .reduce((s, b) => s + (b.service?.price || 0), 0);
      return { label: format(mStart, "MMM"), revenue };
    });
  }
}

function rangeLabel(key: RangeKey, start: Date, end: Date): string {
  if (key === "month")   return format(start, "MMMM yyyy");
  if (key === "week")    return `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
  if (key === "3months") return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();

  const [tab,         setTab]         = useState<Tab>("overview");
  const [rangeKey,    setRangeKey]    = useState<RangeKey>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { start, end, prevStart, prevEnd } = getRangeDates(rangeKey, customStart, customEnd);
  const label = rangeLabel(rangeKey, start, end);

  const fetchData = useCallback(async () => {
    if (!business) return;
    if (rangeKey === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);

    const [{ data: current }, { data: previous }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, status, appointment_date, appointment_time, customer_name, payment_status, service:services(name, price, duration)")
        .eq("business_id", business.id)
        .gte("appointment_date", fmt(start))
        .lte("appointment_date", fmt(end))
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false }),
      supabase
        .from("bookings")
        .select("status, service:services(price)")
        .eq("business_id", business.id)
        .gte("appointment_date", fmt(prevStart))
        .lte("appointment_date", fmt(prevEnd)),
    ]);

    const cur  = (current  || []) as unknown as BookingRow[];
    const prev = (previous || []) as unknown as Array<{ status: string; service: { price?: number } | null }>;

    const revenue         = cur.reduce((s, b) => s + (isEarned(b.status) ? b.service?.price || 0 : 0), 0);
    const previousRevenue = prev.reduce((s, b) => s + (isEarned(b.status) ? b.service?.price || 0 : 0), 0);
    const bookings  = cur.length;
    const completed = cur.filter((b) => isEarned(b.status)).length;
    const noShow    = cur.filter((b) => b.status === "no_show").length;
    const avgTicket = completed > 0 ? Math.round(revenue / completed) : 0;

    const chart = buildChart(cur, start, end);

    const map = new Map<string, TopService>();
    cur.forEach((b) => {
      if (!isEarned(b.status) || !b.service?.name) return;
      const e = map.get(b.service.name);
      if (e) { e.count++; e.revenue += b.service.price || 0; }
      else map.set(b.service.name, { name: b.service.name, count: 1, revenue: b.service.price || 0 });
    });
    const topServices = Array.from(map.values()).sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 5);

    setStats({ revenue, previousRevenue, bookings, completed, noShow, avgTicket, chart, topServices });
    setAllBookings(cur);
    setLoading(false);
  }, [business, supabase, rangeKey, customStart, customEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetches bookings from Supabase; setState runs after the query resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function exportCSV() {
    const header = ["Date", "Time", "Client", "Service", "Duration (min)", "Price (₪)", "Status", "Payment"];
    const rows = allBookings.map((b) => [
      b.appointment_date, b.appointment_time.slice(0, 5), b.customer_name,
      b.service?.name ?? "", b.service?.duration ?? "", b.service?.price ?? "",
      STATUS_LABEL[b.status], b.payment_status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `insights-${label.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  }

  if (bizLoading || (business && loading)) return <InsightsSkeleton />;

  const empty             = !stats || stats.bookings === 0;
  const hasDelta          = !!stats && stats.previousRevenue > 0;
  const deltaPct          = hasDelta ? ((stats!.revenue - stats!.previousRevenue) / stats!.previousRevenue) * 100 : 0;
  const deltaUp           = deltaPct >= 0;
  const hasRevenue        = !!stats && stats.chart.some((p) => p.revenue > 0);
  const maxServiceRevenue = Math.max(1, ...(stats?.topServices.map((s) => s.revenue) ?? []));

  return (
    <>
      <style>{`
        .ins-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .earnings-val { font-size: clamp(34px, 10vw, 52px); letter-spacing: -0.03em; line-height: 1; word-break: break-word; }
        @media (max-width: 600px) {
          .ins-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>

        {/* ── White header ──────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", padding: "22px 24px 0" }}>

            {/* Title + range label + print */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0, lineHeight: 1.1 }}>
                  Insights
                </h1>
                <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{label}</span>
              </div>
              <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  title="Print / Export"
                  style={{ height: 34, width: 34, borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "white", display: "flex", alignItems: "center", justifyContent: "center", color: menuOpen ? "var(--color-amber)" : "var(--color-muted)", borderColor: menuOpen ? "var(--color-amber)" : "var(--color-cream-2)", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-amber)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-amber)"; }}
                  onMouseLeave={(e) => { if (!menuOpen) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-cream-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted)"; } }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    style={{ position: "absolute", top: 40, right: 0, zIndex: 20, minWidth: 180, background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 12, boxShadow: "var(--shadow-md)", overflow: "hidden", padding: 4 }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); window.print(); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-dark)", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-cream)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <IconPrinter /> Print <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(PDF)</span>
                    </button>
                    <button
                      onClick={exportCSV}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-dark)", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-cream)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <IconDownload /> Export as CSV
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Range picker */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "var(--color-cream)", border: "1px solid var(--color-cream-2)" }}>
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setRangeKey(opt.key)}
                    style={{
                      padding: "6px 14px",
                      height: 34,
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s",
                      ...(rangeKey === opt.key
                        ? { background: "var(--color-surface)", color: "var(--color-dark)", boxShadow: "0 1px 4px rgba(30,26,20,0.10)" }
                        : { background: "transparent", color: "var(--color-muted)" }),
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {rangeKey === "custom" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || fmt(new Date())}
                    onChange={(e) => setCustomStart(e.target.value)}
                    style={{ height: 34, padding: "0 10px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 13, color: "var(--color-dark)", outline: "none" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                  />
                  <span style={{ fontSize: 13, color: "var(--color-muted)" }}>to</span>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    max={fmt(new Date())}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    style={{ height: 34, padding: "0 10px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 13, color: "var(--color-dark)", outline: "none" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                  />
                </div>
              )}
            </div>

            {/* Tab bar — amber underline flush with header border */}
            <div style={{ display: "flex", gap: 0, marginBottom: -1 }}>
              {(["overview", "appointments", "revenue", "visitors"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "10px 18px",
                    fontSize: 14,
                    fontWeight: tab === t ? 700 : 500,
                    color: tab === t ? "var(--color-dark)" : "var(--color-muted)",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${tab === t ? "var(--color-amber)" : "transparent"}`,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "color 0.15s, border-color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* ── Scrollable content ────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 64px" }}>

            {tab === "overview" && (
              <OverviewTab
                stats={stats}
                empty={empty}
                hasDelta={hasDelta}
                deltaPct={deltaPct}
                deltaUp={deltaUp}
                hasRevenue={hasRevenue}
                maxServiceRevenue={maxServiceRevenue}
              />
            )}
            {tab === "appointments" && (
              <AppointmentsTab bookings={allBookings} />
            )}
            {tab === "revenue" && (
              <RevenueTab bookings={allBookings} />
            )}
            {tab === "visitors" && business && (
              <VisitorsTab businessId={business.id} start={start} end={end} />
            )}

          </div>
        </div>

      </div>
    </>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, empty, hasDelta, deltaPct, deltaUp, hasRevenue, maxServiceRevenue }: {
  stats: Stats | null; empty: boolean; hasDelta: boolean; deltaPct: number;
  deltaUp: boolean; hasRevenue: boolean; maxServiceRevenue: number;
}) {
  if (empty || !stats) return <OverviewEmpty />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Earnings hero */}
      <div className="rounded-2xl" style={{ padding: "24px 28px", background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.70)", marginBottom: 12 }}>
          Earnings
        </p>
        <p className="earnings-val font-black" style={{ color: "var(--color-surface)" }}>
          ₪{stats.revenue.toLocaleString()}
        </p>
        {hasDelta && (
          <span
            style={{ marginTop: 16, padding: "6px 14px", background: "rgba(255,255,255,0.22)", color: "var(--color-surface)", backdropFilter: "blur(4px)", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 99, fontSize: 13, fontWeight: 600 }}
          >
            {deltaUp ? "↑" : "↓"}{Math.abs(deltaPct).toFixed(0)}%
            <span style={{ opacity: 0.75 }}>vs previous period</span>
          </span>
        )}
      </div>

      {/* 4 stat cards 2×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <StatCard label="Bookings"   value={stats.bookings}                             icon={<IconCal />}   iconBg="rgba(107,96,82,0.10)"      iconColor="var(--color-muted)" />
        <StatCard label="Completed"  value={stats.completed}                            icon={<IconCheck />} iconBg="rgba(34,197,94,0.12)"       iconColor="var(--color-success)"            valueColor="var(--color-success)" />
        <StatCard label="No shows"   value={stats.noShow}                               icon={<IconXCirc />} iconBg={stats.noShow > 0 ? "rgba(239,68,68,0.10)" : "rgba(107,96,82,0.08)"} iconColor={stats.noShow > 0 ? "#DC2626" : "var(--color-muted)"} valueColor={stats.noShow > 0 ? "#DC2626" : undefined} />
        <StatCard label="Avg ticket" value={`₪${stats.avgTicket.toLocaleString()}`}    icon={<IconTag />}   iconBg="rgba(232,146,10,0.12)"      iconColor="var(--color-amber)" />
      </div>

      {/* Charts row — stacks on mobile */}
      <div className="ins-grid-2">

        {/* Revenue trend — line chart */}
        <div className="rounded-2xl" style={{ padding: "20px 20px 14px", background: "var(--color-surface)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", marginBottom: 16, letterSpacing: "-0.01em" }}>Revenue trend</p>
          {hasRevenue ? <LineChart data={stats.chart} /> : <GhostLineChart />}
        </div>

        {/* Top services */}
        <div className="rounded-2xl" style={{ padding: "20px 20px", background: "var(--color-surface)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", marginBottom: 16, letterSpacing: "-0.01em" }}>Top services</p>
          {stats.topServices.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {stats.topServices.map((svc, idx) => (
                <div key={svc.name} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span
                    style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 700, marginTop: 1, ...(idx === 0 ? { background: "var(--color-amber)", color: "var(--color-surface)" } : { background: "var(--amber-soft)", color: "var(--color-amber)" }) }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                        {svc.name}
                      </p>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)", flexShrink: 0 }}>
                        ₪{svc.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: "var(--color-cream-2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.max(8, (svc.revenue / maxServiceRevenue) * 100)}%`, background: "var(--wash-amber)", opacity: idx === 0 ? 1 : 0.55 + idx * 0.05, borderRadius: 99, transition: "width 0.5s" }} />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
                      {svc.count} {svc.count === 1 ? "booking" : "bookings"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptySection icon={<IconTag />} text="No completed services yet." />
          )}
        </div>
      </div>

      {/* Ads CTA */}
      <div className="rounded-2xl" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, background: "var(--wash-sand)", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.40)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>Want more bookings?</p>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2 }}>Turn on paid ads and reach new clients.</p>
        </div>
        <button
          onClick={() => window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, "_blank")}
          style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: "var(--color-surface)", padding: "10px 16px", borderRadius: 12, background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Turn on
        </button>
      </div>
    </div>
  );
}

// ─── Overview empty ───────────────────────────────────────────────────────────

function OverviewEmpty() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Ghost earnings hero */}
      <div className="rounded-2xl" style={{ padding: "24px 28px", background: "rgba(232,146,10,0.08)", border: "1.5px dashed rgba(232,146,10,0.25)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(232,146,10,0.45)", marginBottom: 12 }}>Earnings</p>
        <p className="earnings-val font-black" style={{ color: "rgba(232,146,10,0.18)" }}>₪0</p>
        <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 16 }}>Earnings appear here once you complete bookings.</p>
      </div>

      {/* Ghost stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, opacity: 0.4 }}>
        {[["Bookings", <IconCal key="c" />], ["Completed", <IconCheck key="ch" />], ["No shows", <IconXCirc key="x" />], ["Avg ticket", <IconTag key="t" />]].map(([lbl, icon]) => (
          <div key={lbl as string} className="rounded-2xl" style={{ padding: "16px 20px", background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(107,96,82,0.08)", color: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>{icon}</div>
            <p style={{ fontSize: 30, fontWeight: 900, color: "var(--color-dark)", lineHeight: 1, marginBottom: 6 }}>0</p>
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{lbl as string}</p>
          </div>
        ))}
      </div>

      {/* Ghost chart panels */}
      <div className="ins-grid-2">

        {/* Ghost revenue trend */}
        <div className="rounded-2xl" style={{ padding: "20px 20px 14px", background: "var(--color-surface)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", marginBottom: 16 }}>Revenue trend</p>
          <GhostLineChart />
        </div>

        {/* Ghost top services */}
        <div className="rounded-2xl" style={{ padding: "20px 20px", background: "var(--color-surface)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", marginBottom: 16 }}>Top services</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { nameW: 100, revW: 44, barPct: 100 },
              { nameW: 80,  revW: 36, barPct: 70  },
              { nameW: 90,  revW: 28, barPct: 44  },
            ].map(({ nameW, revW, barPct }, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, opacity: 0.45 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1, background: idx === 0 ? "var(--color-cream-2)" : "var(--amber-soft)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ height: 11, width: nameW, background: "rgba(30,26,20,0.10)", borderRadius: 5 }} />
                    <div style={{ height: 11, width: revW, background: "rgba(30,26,20,0.07)", borderRadius: 5, flexShrink: 0 }} />
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: "rgba(30,26,20,0.06)" }}>
                    <div style={{ height: "100%", width: `${barPct}%`, borderRadius: 99, background: "rgba(232,146,10,0.25)" }} />
                  </div>
                  <div style={{ height: 9, width: 55, background: "rgba(30,26,20,0.06)", borderRadius: 4, marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-muted)", paddingTop: 4 }}>
        Complete your first booking and come back here to see your numbers.
      </p>
    </div>
  );
}

// ─── Appointments tab ─────────────────────────────────────────────────────────

function AppointmentsTab({ bookings }: { bookings: BookingRow[] }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: "var(--color-muted)" }}>
          {bookings.length} appointment{bookings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-2xl" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)", padding: "56px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--amber-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <IconCal size={22} color="var(--color-amber)" />
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, color: "var(--color-dark)", marginBottom: 8 }}>No appointments</p>
          <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 280, margin: "0 auto" }}>
            No bookings found in this period.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
          {bookings.map((b, i) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderTop: i > 0 ? "1px solid var(--color-cream-2)" : "none", flexWrap: "wrap" }}>
              <div style={{ minWidth: 64, flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)" }}>{format(parseISO(b.appointment_date), "d MMM")}</p>
                <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{b.appointment_time.slice(0, 5)}</p>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.customer_name}</p>
                <p style={{ fontSize: 12, color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.service?.name ?? "Service"}</p>
              </div>
              {b.service?.price != null && (
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", flexShrink: 0 }}>₪{b.service.price.toLocaleString()}</p>
              )}
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 600, flexShrink: 0, background: STATUS_BG[b.status], color: STATUS_COLOR[b.status] }}>
                {STATUS_LABEL[b.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Revenue tab ──────────────────────────────────────────────────────────────

function RevenueTab({ bookings }: { bookings: BookingRow[] }) {
  const earned  = bookings.filter((b) => isEarned(b.status));
  const pending = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const totalEarned     = earned.reduce((s, b) => s + (b.service?.price || 0), 0);
  const totalReceivable = pending.reduce((s, b) => s + (b.service?.price || 0), 0);

  const map = new Map<string, RevenueService>();
  bookings.forEach((b) => {
    if (!b.service?.name) return;
    const e = map.get(b.service.name) ?? { name: b.service.name, count: 0, earned: 0, receivable: 0 };
    e.count++;
    if (isEarned(b.status)) e.earned += b.service.price || 0;
    else if (b.status === "pending" || b.status === "confirmed") e.receivable += b.service.price || 0;
    map.set(b.service.name, e);
  });
  const services = Array.from(map.values()).sort((a, b) => b.earned - a.earned || b.receivable - a.receivable);

  if (bookings.length === 0) return (
    <div className="rounded-2xl" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)", padding: "56px 24px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--amber-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <IconTag size={22} color="var(--color-amber)" />
      </div>
      <p style={{ fontSize: 17, fontWeight: 800, color: "var(--color-dark)", marginBottom: 8 }}>No revenue data</p>
      <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 280, margin: "0 auto" }}>Revenue details appear once you have bookings in this period.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* KPI cards — stacks on mobile */}
      <div className="ins-grid-2">
        <div className="rounded-2xl" style={{ padding: "20px 24px", background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.70)", marginBottom: 10 }}>Total earned</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: "var(--color-surface)", letterSpacing: "-0.02em", lineHeight: 1 }}>₪{totalEarned.toLocaleString()}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 8 }}>{earned.length} completed</p>
        </div>
        <div className="rounded-2xl" style={{ padding: "20px 24px", background: "var(--color-surface)", boxShadow: "var(--shadow-md)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 10 }}>Receivable</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: "var(--color-dark)", letterSpacing: "-0.02em", lineHeight: 1 }}>₪{totalReceivable.toLocaleString()}</p>
          <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 8 }}>{pending.length} pending</p>
        </div>
      </div>

      {/* Service breakdown */}
      {services.length > 0 && (
        <div className="rounded-2xl" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-cream-2)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Breakdown by service</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 72px", padding: "10px 20px", borderBottom: "1px solid var(--color-cream-2)" }}>
            {["Service", "Count", "Earned"].map((h) => (
              <p key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: h !== "Service" ? "right" : "left" }}>{h}</p>
            ))}
          </div>
          {services.map((s, i) => (
            <div key={s.name} style={{ display: "grid", gridTemplateColumns: "1fr 56px 72px", padding: "13px 20px", borderTop: i > 0 ? "1px solid var(--color-cream-2)" : "none", alignItems: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
              <p style={{ fontSize: 14, color: "var(--color-muted)", textAlign: "right" }}>{s.count}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: s.earned > 0 ? "var(--color-dark)" : "var(--color-muted)", textAlign: "right" }}>₪{s.earned.toLocaleString()}</p>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 72px", padding: "13px 20px", borderTop: "2px solid var(--color-cream-2)", background: "var(--color-cream)", alignItems: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>Total</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", textAlign: "right" }}>{bookings.length}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-amber)", textAlign: "right" }}>₪{totalEarned.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Line chart ───────────────────────────────────────────────────────────────

function LineChart({ data }: { data: ChartPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const VW = 400;
  const VH = 140;
  const PAD = { top: 20, bottom: 26, left: 4, right: 4 };
  const innerW = VW - PAD.left - PAD.right;
  const innerH = VH - PAD.top - PAD.bottom;

  const max = Math.max(1, ...data.map((d) => d.revenue));

  const pts = data.map((d, i) => ({
    x: PAD.left + (data.length > 1 ? i / (data.length - 1) : 0.5) * innerW,
    y: PAD.top + (1 - d.revenue / max) * innerH,
    ...d,
  }));

  // Smooth cubic bezier
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cp1x = prev.x + (p.x - prev.x) * 0.45;
    const cp2x = p.x - (p.x - prev.x) * 0.45;
    return `${acc} C ${cp1x.toFixed(1)} ${prev.y.toFixed(1)} ${cp2x.toFixed(1)} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");

  const fillPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(VH - PAD.bottom).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(VH - PAD.bottom).toFixed(1)} Z`
    : "";

  // Show at most 6 x-axis labels
  const labelStep = Math.max(1, Math.ceil(pts.length / 6));

  return (
    <div style={{ position: "relative", userSelect: "none" }} onMouseLeave={() => setHovered(null)}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="lc-amber-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(232,146,10,0.18)" />
            <stop offset="100%" stopColor="rgba(232,146,10,0.00)" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0.33, 0.66].map((pct, i) => (
          <line
            key={i}
            x1={PAD.left} y1={PAD.top + pct * innerH}
            x2={VW - PAD.right} y2={PAD.top + pct * innerH}
            stroke="var(--color-cream-2)" strokeWidth="1"
          />
        ))}

        {/* Fill under curve */}
        {fillPath && <path d={fillPath} fill="url(#lc-amber-fill)" />}

        {/* Line */}
        {pts.length > 1 && (
          <path d={linePath} fill="none" stroke="var(--color-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Hover vertical rule */}
        {hovered !== null && (
          <line
            x1={pts[hovered].x} y1={PAD.top}
            x2={pts[hovered].x} y2={VH - PAD.bottom}
            stroke="var(--color-cream-2)" strokeWidth="1.5"
          />
        )}

        {/* Dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y}
              r={hovered === i ? 5 : 3}
              fill={hovered === i ? "var(--color-amber)" : "var(--color-surface)"}
              stroke="var(--color-amber)" strokeWidth="1.8"
              style={{ transition: "r 0.12s, fill 0.12s" }}
            />
            {/* Wide invisible hit rect per column */}
            <rect
              x={p.x - innerW / (data.length * 2)}
              y={PAD.top}
              width={innerW / data.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              style={{ cursor: "crosshair" }}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {pts.map((p, i) => {
          if (i % labelStep !== 0 && i !== pts.length - 1) return null;
          return (
            <text
              key={i}
              x={p.x} y={VH - 4}
              textAnchor="middle"
              style={{ fontSize: 9, fill: "var(--color-muted)", fontFamily: "inherit" }}
            >
              {p.label}
            </text>
          );
        })}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const p = pts[hovered];
          const boxW = 72;
          const boxH = 22;
          const bx = Math.min(VW - PAD.right - boxW, Math.max(PAD.left, p.x - boxW / 2));
          const by = Math.max(0, p.y - boxH - 8);
          return (
            <g>
              <rect x={bx} y={by} width={boxW} height={boxH} rx={5} fill="var(--color-dark)" />
              <text
                x={bx + boxW / 2} y={by + 14}
                textAnchor="middle"
                style={{ fontSize: 11, fill: "white", fontWeight: 700, fontFamily: "inherit" }}
              >
                ₪{p.revenue.toLocaleString()}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ─── Ghost line chart (empty state — looks like real data) ────────────────────

function GhostLineChart() {
  const VW = 400;
  const VH = 140;
  const PAD = { top: 20, bottom: 26, left: 4, right: 4 };
  const innerW = VW - PAD.left - PAD.right;
  const innerH = VH - PAD.top - PAD.bottom;

  const rawHeights = [0.12, 0.28, 0.20, 0.52, 0.38, 0.62, 0.48, 0.75, 0.60, 0.82];
  const pts = rawHeights.map((h, i) => ({
    x: PAD.left + (i / (rawHeights.length - 1)) * innerW,
    y: PAD.top + (1 - h) * innerH,
  }));

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cp1x = prev.x + (p.x - prev.x) * 0.45;
    const cp2x = p.x - (p.x - prev.x) * 0.45;
    return `${acc} C ${cp1x.toFixed(1)} ${prev.y.toFixed(1)} ${cp2x.toFixed(1)} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");

  const fillPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(VH - PAD.bottom).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(VH - PAD.bottom).toFixed(1)} Z`;

  const xLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="lc-ghost-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(30,26,20,0.05)" />
            <stop offset="100%" stopColor="rgba(30,26,20,0.00)" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0.33, 0.66].map((pct, i) => (
          <line
            key={i}
            x1={PAD.left} y1={PAD.top + pct * innerH}
            x2={VW - PAD.right} y2={PAD.top + pct * innerH}
            stroke="var(--color-cream-2)" strokeWidth="1"
          />
        ))}

        {/* Ghost fill */}
        <path d={fillPath} fill="url(#lc-ghost-fill)" />

        {/* Ghost line */}
        <path d={linePath} fill="none" stroke="var(--color-cream-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Ghost dots every other point */}
        {pts.filter((_, i) => i % 2 === 0).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-surface)" stroke="var(--color-cream-2)" strokeWidth="1.5" />
        ))}

        {/* Ghost x-labels */}
        {xLabels.map((m, i) => (
          <text
            key={m}
            x={PAD.left + (i / (xLabels.length - 1)) * innerW}
            y={VH - 4}
            textAnchor="middle"
            style={{ fontSize: 9, fill: "var(--color-cream-2)", fontFamily: "inherit" }}
          >
            {m}
          </text>
        ))}
      </svg>

      {/* "No earnings yet" centered pill */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-muted)", background: "rgba(255,255,255,0.92)", padding: "4px 14px", borderRadius: 8, backdropFilter: "blur(2px)" }}>
          No earnings yet
        </span>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatCard({ label, value, icon, iconBg, iconColor, valueColor }: {
  label: string; value: number | string; icon: React.ReactNode;
  iconBg: string; iconColor: string; valueColor?: string;
}) {
  return (
    <div className="rounded-2xl" style={{ padding: "16px 20px", background: "var(--color-surface)", boxShadow: "var(--shadow-md)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: iconBg, color: iconColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 30, fontWeight: 900, color: valueColor || "var(--color-dark)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{label}</p>
    </div>
  );
}

function EmptySection({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", textAlign: "center" }}>
      <div style={{ color: "rgba(107,96,82,0.28)", marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 13, color: "var(--color-muted)" }}>{text}</p>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCal({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function IconCheck({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconXCirc({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>;
}
function IconTag({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
}
function IconDownload() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}
function IconPrinter() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>;
}
