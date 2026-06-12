"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format, parseISO, addDays, subDays, subMonths, subWeeks,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  differenceInDays, eachWeekOfInterval, eachMonthOfInterval,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { InsightsSkeleton } from "@/components/LoadingSkeleton";
import { STATUS_COLOR, STATUS_BG, STATUS_LABEL, type BookingStatus } from "@/types";

const WA_NUMBER = "972501234567";
const WA_MSG = "Hi, I want to turn on paid ads to bring in more bookings.";

type Tab = "overview" | "appointments" | "revenue";
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
    end   = now;
    start = subWeeks(now, 1);
    prevEnd   = subDays(start, 1);
    prevStart = subWeeks(prevEnd, 1);
  } else if (key === "month") {
    start = startOfMonth(now);
    end   = endOfMonth(now);
    prevStart = startOfMonth(subMonths(now, 1));
    prevEnd   = endOfMonth(subMonths(now, 1));
  } else if (key === "3months") {
    end   = now;
    start = subMonths(now, 3);
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
    // By day
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
    // By week
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    return weeks.map((wStart, i) => {
      const wEnd = addDays(wStart, 6);
      const revenue = bookings
        .filter((b) => isEarned(b.status) && b.appointment_date >= fmt(wStart) && b.appointment_date <= fmt(wEnd))
        .reduce((s, b) => s + (b.service?.price || 0), 0);
      return { label: `Wk ${i + 1}`, revenue };
    });
  } else {
    // By month
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

  const { start, end, prevStart, prevEnd } = getRangeDates(rangeKey, customStart, customEnd);
  const label = rangeLabel(rangeKey, start, end);

  const fetchData = useCallback(async () => {
    if (!business) return;
    if (rangeKey === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);

    const [{ data: current }, { data: previous }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, status, appointment_date, appointment_time, customer_name, payment_status, service:services(name, price, duration_minutes)")
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

  useEffect(() => { fetchData(); }, [fetchData]);

  if (bizLoading || (business && loading)) return <InsightsSkeleton />;

  const empty    = !stats || stats.bookings === 0;
  const hasDelta = !!stats && stats.previousRevenue > 0;
  const deltaPct = hasDelta ? ((stats!.revenue - stats!.previousRevenue) / stats!.previousRevenue) * 100 : 0;
  const deltaUp  = deltaPct >= 0;
  const hasRevenue = !!stats && stats.chart.some((p) => p.revenue > 0);
  const maxServiceRevenue = Math.max(1, ...(stats?.topServices.map((s) => s.revenue) ?? []));

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-cream)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 48px" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-extrabold leading-tight" style={{ fontSize: 28, color: "var(--color-dark)", letterSpacing: "-0.02em" }}>
              Insights
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-muted)" }}>{label}</p>
          </div>
        </div>

        {/* Range picker */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "#fff", boxShadow: "var(--shadow-sm)" }}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRangeKey(opt.key)}
                className="px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all"
                style={
                  rangeKey === opt.key
                    ? { background: "var(--wash-amber)", color: "#fff", boxShadow: "var(--shadow-amber)" }
                    : { color: "var(--color-muted)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {rangeKey === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                max={customEnd || fmt(new Date())}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-[13px] font-medium border-0 outline-none"
                style={{ background: "#fff", boxShadow: "var(--shadow-sm)", color: "var(--color-dark)" }}
              />
              <span style={{ color: "var(--color-muted)", fontSize: 13 }}>to</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={fmt(new Date())}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-[13px] font-medium border-0 outline-none"
                style={{ background: "#fff", boxShadow: "var(--shadow-sm)", color: "var(--color-dark)" }}
              />
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ background: "#fff", boxShadow: "var(--shadow-sm)", display: "inline-flex" }}>
          {(["overview", "appointments", "revenue"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold capitalize transition-all"
              style={
                tab === t
                  ? { background: "var(--color-dark)", color: "#fff" }
                  : { color: "var(--color-muted)" }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <OverviewTab stats={stats} empty={empty} hasDelta={hasDelta} deltaPct={deltaPct} deltaUp={deltaUp} hasRevenue={hasRevenue} maxServiceRevenue={maxServiceRevenue} />
        )}
        {tab === "appointments" && (
          <AppointmentsTab bookings={allBookings} label={label} />
        )}
        {tab === "revenue" && (
          <RevenueTab bookings={allBookings} label={label} />
        )}

      </div>
    </div>
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
      <div className="rounded-2xl p-6" style={{ background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.70)", marginBottom: 12 }}>Earnings</p>
        <p className="font-black leading-none" style={{ fontSize: 52, color: "#fff", letterSpacing: "-0.03em" }}>
          ₪{stats.revenue.toLocaleString()}
        </p>
        {hasDelta && (
          <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-[13px] font-semibold"
            style={{ background: "rgba(255,255,255,0.22)", color: "#fff", backdropFilter: "blur(4px)" }}>
            {deltaUp ? "↑" : "↓"}{Math.abs(deltaPct).toFixed(0)}%
            <span style={{ opacity: 0.75 }}>vs previous period</span>
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <StatCard label="Bookings"   value={stats.bookings}   icon={<IconCal />}   iconBg="rgba(107,96,82,0.10)" iconColor="var(--color-muted)" />
        <StatCard label="Completed"  value={stats.completed}  icon={<IconCheck />} iconBg="rgba(34,197,94,0.12)" iconColor="#16A34A" valueColor="#16A34A" />
        <StatCard label="No shows"   value={stats.noShow}     icon={<IconXCirc />} iconBg={stats.noShow > 0 ? "rgba(239,68,68,0.10)" : "rgba(107,96,82,0.08)"} iconColor={stats.noShow > 0 ? "#DC2626" : "var(--color-muted)"} valueColor={stats.noShow > 0 ? "#DC2626" : undefined} />
        <StatCard label="Avg ticket" value={`₪${stats.avgTicket.toLocaleString()}`} icon={<IconTag />} iconBg="rgba(232,146,10,0.12)" iconColor="var(--color-amber)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          <p className="font-bold mb-5" style={{ fontSize: 15, color: "var(--color-dark)", letterSpacing: "-0.01em" }}>Revenue trend</p>
          {hasRevenue ? <BarChart data={stats.chart} /> : <EmptySection icon={<IconChart />} text="No earnings in this period." />}
        </div>
        <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          <p className="font-bold mb-5" style={{ fontSize: 15, color: "var(--color-dark)", letterSpacing: "-0.01em" }}>Top services</p>
          {stats.topServices.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {stats.topServices.map((svc, idx) => (
                <div key={svc.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="text-[11px] font-bold flex items-center justify-center flex-shrink-0"
                    style={{ width: 24, height: 24, borderRadius: "50%", ...(idx === 0 ? { background: "var(--color-amber)", color: "#fff" } : { background: "var(--amber-soft)", color: "var(--color-amber)" }) }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <p className="truncate font-semibold" style={{ fontSize: 14, color: "var(--color-dark)" }}>{svc.name}</p>
                      <span className="font-bold" style={{ fontSize: 13, color: "var(--color-dark)", marginLeft: 8, flexShrink: 0 }}>₪{svc.revenue.toLocaleString()}</span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--color-cream-2)" }}>
                      <div className="rounded-full" style={{ height: "100%", width: `${Math.max(6, (svc.revenue / maxServiceRevenue) * 100)}%`, background: idx === 0 ? "var(--wash-amber)" : "var(--color-amber)", opacity: idx === 0 ? 1 : 0.5 + idx * 0.08, transition: "width 0.5s" }} />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>{svc.count} {svc.count === 1 ? "booking" : "bookings"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptySection icon={<IconTag />} text="No completed services yet." />}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--wash-sand)", boxShadow: "var(--shadow-sm)" }}>
        <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.40)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p className="font-bold" style={{ fontSize: 15, color: "var(--color-dark)" }}>Want more bookings?</p>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2 }}>Turn on paid ads and reach new clients.</p>
        </div>
        <button onClick={() => window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, "_blank")}
          className="flex-shrink-0 font-bold text-white rounded-xl transition-all active:scale-95"
          style={{ fontSize: 13, padding: "10px 16px", background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)" }}>
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
      <div className="rounded-2xl p-6" style={{ background: "rgba(232,146,10,0.08)", border: "1.5px dashed rgba(232,146,10,0.25)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(232,146,10,0.45)", marginBottom: 12 }}>Earnings</p>
        <p className="font-black leading-none" style={{ fontSize: 52, color: "rgba(232,146,10,0.18)", letterSpacing: "-0.03em" }}>₪0</p>
        <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 16 }}>Earnings appear here once you complete bookings.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {[["Bookings", <IconCal key="c" />], ["Completed", <IconCheck key="ch" />], ["No shows", <IconXCirc key="x" />], ["Avg ticket", <IconTag key="t" />]].map(([label, icon]) => (
          <div key={label as string} className="rounded-2xl" style={{ padding: "16px 20px", background: "#fff", boxShadow: "var(--shadow-sm)", opacity: 0.4 }}>
            <div className="rounded-xl flex items-center justify-center mb-3" style={{ width: 36, height: 36, background: "rgba(107,96,82,0.08)", color: "var(--color-muted)" }}>{icon}</div>
            <p className="font-black leading-none mb-1.5" style={{ fontSize: 30, color: "var(--color-dark)" }}>0</p>
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{label as string}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[["Revenue trend", [40, 65, 30, 80]], ["Top services", [90, 60, 35]]].map(([title, data]) => (
          <div key={title as string} className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-sm)", opacity: 0.45 }}>
            <p className="font-bold mb-4" style={{ fontSize: 15, color: "var(--color-dark)" }}>{title as string}</p>
            {title === "Revenue trend" ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                {(data as number[]).map((h, i) => <div key={i} style={{ flex: 1, background: "rgba(232,146,10,0.15)", borderRadius: "8px 8px 0 0", height: `${h}%` }} />)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(data as number[]).map((w, i) => (
                  <div key={i}>
                    <div style={{ height: 11, width: `${w}px`, background: "rgba(30,26,20,0.08)", borderRadius: 6, marginBottom: 6 }} />
                    <div style={{ height: 6, borderRadius: 99, background: "rgba(30,26,20,0.06)" }}>
                      <div style={{ height: "100%", width: `${w}%`, borderRadius: 99, background: "rgba(232,146,10,0.22)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-center" style={{ fontSize: 13, color: "var(--color-muted)", paddingTop: 4 }}>
        Complete your first booking and come back here to see your numbers.
      </p>
    </div>
  );
}

// ─── Appointments tab ─────────────────────────────────────────────────────────

function AppointmentsTab({ bookings, label }: { bookings: BookingRow[]; label: string }) {
  function exportCSV() {
    const header = ["Date", "Time", "Client", "Service", "Duration (min)", "Price (₪)", "Status", "Payment"];
    const rows = bookings.map((b) => [
      b.appointment_date, b.appointment_time.slice(0, 5), b.customer_name,
      b.service?.name ?? "", b.service?.duration ?? "", b.service?.price ?? "",
      STATUS_LABEL[b.status], b.payment_status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `appointments-${label.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: "var(--color-muted)" }}>
          {bookings.length} appointment{bookings.length !== 1 ? "s" : ""}
        </p>
        {bookings.length > 0 && (
          <button onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all active:scale-95"
            style={{ fontSize: 13, padding: "8px 14px", background: "#fff", boxShadow: "var(--shadow-sm)", color: "var(--color-dark)" }}>
            <IconDownload /> Export CSV
          </button>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-2xl" style={{ background: "#fff", boxShadow: "var(--shadow-md)", padding: "56px 24px", textAlign: "center" }}>
          <div className="rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ width: 52, height: 52, background: "var(--amber-soft)" }}>
            <IconCal size={22} color="var(--color-amber)" />
          </div>
          <p className="font-extrabold" style={{ fontSize: 17, color: "var(--color-dark)", marginBottom: 8 }}>No appointments</p>
          <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 280, margin: "0 auto" }}>
            No bookings found in this period.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          {bookings.map((b, i) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderTop: i > 0 ? "1px solid var(--color-cream-2)" : "none" }}>
              <div style={{ minWidth: 72, flexShrink: 0 }}>
                <p className="font-bold" style={{ fontSize: 13, color: "var(--color-dark)" }}>{format(parseISO(b.appointment_date), "d MMM")}</p>
                <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{b.appointment_time.slice(0, 5)}</p>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-semibold truncate" style={{ fontSize: 14, color: "var(--color-dark)" }}>{b.customer_name}</p>
                <p className="truncate" style={{ fontSize: 12, color: "var(--color-muted)" }}>{b.service?.name ?? "Service"}</p>
              </div>
              {b.service?.price != null && (
                <p className="font-bold flex-shrink-0" style={{ fontSize: 14, color: "var(--color-dark)" }}>₪{b.service.price.toLocaleString()}</p>
              )}
              <span className="flex-shrink-0 rounded-full font-semibold"
                style={{ fontSize: 11, padding: "3px 10px", background: STATUS_BG[b.status], color: STATUS_COLOR[b.status] }}>
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

function RevenueTab({ bookings, label }: { bookings: BookingRow[]; label: string }) {
  const earned   = bookings.filter((b) => isEarned(b.status));
  const pending  = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");
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

  function exportCSV() {
    const header = ["Service", "Bookings", "Earned (₪)", "Receivable (₪)"];
    const rows   = services.map((s) => [s.name, s.count, s.earned, s.receivable]);
    const footer = ["Total", bookings.length, totalEarned, totalReceivable];
    const csv    = [header, ...rows, footer].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob   = new Blob([csv], { type: "text/csv" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href = url; a.download = `revenue-${label.replace(/\s/g, "-")}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (bookings.length === 0) return (
    <div className="rounded-2xl" style={{ background: "#fff", boxShadow: "var(--shadow-md)", padding: "56px 24px", textAlign: "center" }}>
      <div className="rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ width: 52, height: 52, background: "var(--amber-soft)" }}>
        <IconTag size={22} color="var(--color-amber)" />
      </div>
      <p className="font-extrabold" style={{ fontSize: 17, color: "var(--color-dark)", marginBottom: 8 }}>No revenue data</p>
      <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 280, margin: "0 auto" }}>Revenue details appear once you have bookings in this period.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="rounded-2xl p-5" style={{ background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.70)", marginBottom: 10 }}>Total earned</p>
          <p className="font-black" style={{ fontSize: 36, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>₪{totalEarned.toLocaleString()}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 8 }}>{earned.length} completed</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 10 }}>Receivable</p>
          <p className="font-black" style={{ fontSize: 36, color: "var(--color-dark)", letterSpacing: "-0.02em", lineHeight: 1 }}>₪{totalReceivable.toLocaleString()}</p>
          <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 8 }}>{pending.length} pending</p>
        </div>
      </div>

      {services.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--color-cream-2)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Breakdown by service</p>
            <button onClick={exportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all active:scale-95"
              style={{ fontSize: 12, padding: "6px 12px", background: "var(--color-cream)", color: "var(--color-dark)" }}>
              <IconDownload /> Export CSV
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 80px", padding: "10px 20px", borderBottom: "1px solid var(--color-cream-2)" }}>
            {["Service", "Count", "Earned"].map((h) => (
              <p key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: h !== "Service" ? "right" : "left" }}>{h}</p>
            ))}
          </div>
          {services.map((s, i) => (
            <div key={s.name} style={{ display: "grid", gridTemplateColumns: "1fr 64px 80px", padding: "13px 20px", borderTop: i > 0 ? "1px solid var(--color-cream-2)" : "none", alignItems: "center" }}>
              <p className="font-semibold" style={{ fontSize: 14, color: "var(--color-dark)" }}>{s.name}</p>
              <p style={{ fontSize: 14, color: "var(--color-muted)", textAlign: "right" }}>{s.count}</p>
              <p className="font-bold" style={{ fontSize: 14, color: s.earned > 0 ? "var(--color-dark)" : "var(--color-muted)", textAlign: "right" }}>₪{s.earned.toLocaleString()}</p>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 80px", padding: "13px 20px", borderTop: "2px solid var(--color-cream-2)", background: "var(--color-cream)", alignItems: "center" }}>
            <p className="font-bold" style={{ fontSize: 14, color: "var(--color-dark)" }}>Total</p>
            <p className="font-bold" style={{ fontSize: 14, color: "var(--color-dark)", textAlign: "right" }}>{bookings.length}</p>
            <p className="font-bold" style={{ fontSize: 14, color: "var(--color-amber)", textAlign: "right" }}>₪{totalEarned.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: ChartPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max  = Math.max(1, ...data.map((d) => d.revenue));
  const peak = data.reduce((hi, d, i) => (d.revenue > data[hi].revenue ? i : hi), 0);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
      {data.map((d, i) => {
        const isActive = active === i;
        const isPeak   = i === peak;
        const h = Math.max(4, (d.revenue / max) * 100);
        return (
          <button key={d.label} onClick={() => setActive(isActive ? null : i)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}
            aria-label={`${d.label}: ₪${d.revenue.toLocaleString()}`}>
            <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", background: isActive ? "var(--color-amber)" : "transparent", color: isActive ? "#fff" : "transparent", transition: "all 0.15s" }}>
              ₪{d.revenue.toLocaleString()}
            </span>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 52, borderRadius: "10px 10px 0 0", height: `${h}%`, background: (isActive || isPeak) ? "var(--wash-amber)" : "rgba(232,146,10,0.20)", boxShadow: (isActive || isPeak) ? "var(--shadow-amber)" : "none", transition: "all 0.2s" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-muted)" }}>{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatCard({ label, value, icon, iconBg, iconColor, valueColor }: {
  label: string; value: number | string; icon: React.ReactNode;
  iconBg: string; iconColor: string; valueColor?: string;
}) {
  return (
    <div className="rounded-2xl" style={{ padding: "16px 20px", background: "#fff", boxShadow: "var(--shadow-md)" }}>
      <div className="rounded-xl flex items-center justify-center mb-3" style={{ width: 36, height: 36, background: iconBg, color: iconColor }}>{icon}</div>
      <p className="font-black leading-none mb-1.5" style={{ fontSize: 30, color: valueColor || "var(--color-dark)", letterSpacing: "-0.02em" }}>{value}</p>
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
function IconChart() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}
function IconDownload() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}
