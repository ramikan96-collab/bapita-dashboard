"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, subMonths, getDate, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { InsightsSkeleton } from "@/components/LoadingSkeleton";
import { STATUS_COLOR, STATUS_BG, STATUS_LABEL, type BookingStatus } from "@/types";

const WA_NUMBER = "972501234567";
const WA_MSG = "Hi, I want to turn on paid ads to bring in more bookings.";

type Tab = "overview" | "appointments" | "revenue";

interface BookingRow {
  id: string;
  status: BookingStatus;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  payment_status: string;
  service: { name?: string; price?: number; duration?: number } | null;
}

interface WeekPoint { label: string; revenue: number }
interface TopService { name: string; count: number; revenue: number }
interface RevenueService { name: string; count: number; earned: number; receivable: number }

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

function isEarned(status: string) { return status === "completed"; }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const monthLabel = format(new Date(), "MMMM yyyy");

  const fetchData = useCallback(async () => {
    if (!business) return;
    setLoading(true);

    const now = new Date();
    const fmt = (d: Date) => format(d, "yyyy-MM-dd");
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastStart = startOfMonth(subMonths(now, 1));
    const lastEnd = endOfMonth(subMonths(now, 1));

    const [{ data: current }, { data: previous }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, status, appointment_date, appointment_time, customer_name, payment_status, service:services(name, price, duration_minutes)")
        .eq("business_id", business.id)
        .gte("appointment_date", fmt(monthStart))
        .lte("appointment_date", fmt(monthEnd))
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false }),
      supabase
        .from("bookings")
        .select("status, service:services(price)")
        .eq("business_id", business.id)
        .gte("appointment_date", fmt(lastStart))
        .lte("appointment_date", fmt(lastEnd)),
    ]);

    const cur = (current || []) as unknown as BookingRow[];
    const prev = (previous || []) as unknown as Array<{ status: string; service: { price?: number } | null }>;

    const revenue = cur.reduce((s, b) => s + (isEarned(b.status) ? b.service?.price || 0 : 0), 0);
    const previousRevenue = prev.reduce((s, b) => s + (isEarned(b.status) ? b.service?.price || 0 : 0), 0);
    const bookings = cur.length;
    const completed = cur.filter((b) => isEarned(b.status)).length;
    const noShow = cur.filter((b) => b.status === "no_show").length;
    const avgTicket = completed > 0 ? Math.round(revenue / completed) : 0;

    const weeksSoFar = Math.ceil(getDate(now) / 7);
    const buckets = Array.from({ length: weeksSoFar }, () => 0);
    cur.forEach((b) => {
      if (!isEarned(b.status)) return;
      const idx = Math.min(Math.ceil(getDate(new Date(b.appointment_date + "T12:00:00")) / 7), weeksSoFar) - 1;
      buckets[idx] += b.service?.price || 0;
    });
    const weekly = buckets.map((rev, i) => ({ label: `Wk ${i + 1}`, revenue: rev }));

    const map = new Map<string, TopService>();
    cur.forEach((b) => {
      if (!isEarned(b.status) || !b.service?.name) return;
      const e = map.get(b.service.name);
      if (e) { e.count++; e.revenue += b.service.price || 0; }
      else map.set(b.service.name, { name: b.service.name, count: 1, revenue: b.service.price || 0 });
    });
    const topServices = Array.from(map.values()).sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 5);

    setStats({ revenue, previousRevenue, bookings, completed, noShow, avgTicket, weekly, topServices });
    setAllBookings(cur);
    setLoading(false);
  }, [business, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (bizLoading || (business && loading)) return <InsightsSkeleton />;

  const empty = !stats || stats.bookings === 0;
  const hasDelta = !!stats && stats.previousRevenue > 0;
  const deltaPct = hasDelta ? ((stats!.revenue - stats!.previousRevenue) / stats!.previousRevenue) * 100 : 0;
  const deltaUp = deltaPct >= 0;
  const hasRevenue = !!stats && stats.weekly.some((w) => w.revenue > 0);
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
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-muted)" }}>{monthLabel}</p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
            style={{ background: "#fff", boxShadow: "var(--shadow-sm)", color: "var(--color-dark)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-amber)" }} />
            This month
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ background: "#fff", boxShadow: "var(--shadow-sm)", display: "inline-flex" }}>
          {(["overview", "appointments", "revenue"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold capitalize transition-all"
              style={
                tab === t
                  ? { background: "var(--wash-amber)", color: "#fff", boxShadow: "var(--shadow-amber)" }
                  : { color: "var(--color-muted)" }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
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
          <AppointmentsTab bookings={allBookings} monthLabel={monthLabel} />
        )}
        {tab === "revenue" && (
          <RevenueTab bookings={allBookings} monthLabel={monthLabel} />
        )}

      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  stats, empty, hasDelta, deltaPct, deltaUp, hasRevenue, maxServiceRevenue,
}: {
  stats: Stats | null;
  empty: boolean;
  hasDelta: boolean;
  deltaPct: number;
  deltaUp: boolean;
  hasRevenue: boolean;
  maxServiceRevenue: number;
}) {
  if (empty || !stats) return <OverviewEmpty />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Hero */}
      <div className="rounded-2xl p-6" style={{ background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.70)" }}>
          Earnings this month
        </p>
        <p className="font-black leading-none" style={{ fontSize: 52, color: "#fff", letterSpacing: "-0.03em" }}>
          ₪{stats.revenue.toLocaleString()}
        </p>
        {hasDelta && (
          <span
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-[13px] font-semibold"
            style={{ background: "rgba(255,255,255,0.22)", color: "#fff", backdropFilter: "blur(4px)" }}
          >
            {deltaUp ? "↑" : "↓"}{Math.abs(deltaPct).toFixed(0)}%
            <span style={{ opacity: 0.75 }}>vs last month</span>
          </span>
        )}
      </div>

      {/* Stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <StatCard label="Bookings" value={stats.bookings} icon={<IconCal />} iconBg="rgba(107,96,82,0.10)" iconColor="var(--color-muted)" />
        <StatCard label="Completed" value={stats.completed} icon={<IconCheck />} iconBg="rgba(34,197,94,0.12)" iconColor="#16A34A" valueColor="#16A34A" />
        <StatCard label="No shows" value={stats.noShow} icon={<IconX />} iconBg={stats.noShow > 0 ? "rgba(239,68,68,0.10)" : "rgba(107,96,82,0.08)"} iconColor={stats.noShow > 0 ? "#DC2626" : "var(--color-muted)"} valueColor={stats.noShow > 0 ? "#DC2626" : undefined} />
        <StatCard label="Avg ticket" value={`₪${stats.avgTicket.toLocaleString()}`} icon={<IconTag />} iconBg="rgba(232,146,10,0.12)" iconColor="var(--color-amber)" />
      </div>

      {/* Chart + Top services — side by side on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="[&]:max-md:grid-cols-1">
        <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          <p className="font-bold mb-5" style={{ fontSize: 15, color: "var(--color-dark)", letterSpacing: "-0.01em" }}>Revenue trend</p>
          {hasRevenue ? <BarChart data={stats.weekly} /> : (
            <EmptySection icon={<IconChart />} text="No earnings yet this month." />
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          <p className="font-bold mb-5" style={{ fontSize: 15, color: "var(--color-dark)", letterSpacing: "-0.01em" }}>Top services</p>
          {stats.topServices.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {stats.topServices.map((svc, idx) => (
                <div key={svc.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    className="text-[11px] font-bold flex items-center justify-center flex-shrink-0"
                    style={{ width: 24, height: 24, borderRadius: "50%", ...(idx === 0 ? { background: "var(--color-amber)", color: "#fff" } : { background: "var(--amber-soft)", color: "var(--color-amber)" }) }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <p className="truncate font-semibold" style={{ fontSize: 14, color: "var(--color-dark)" }}>{svc.name}</p>
                      <span className="font-bold flex-shrink-0" style={{ fontSize: 13, color: "var(--color-dark)", marginLeft: 8 }}>₪{svc.revenue.toLocaleString()}</span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--color-cream-2)" }}>
                      <div className="rounded-full" style={{ height: "100%", width: `${Math.max(6, (svc.revenue / maxServiceRevenue) * 100)}%`, background: idx === 0 ? "var(--wash-amber)" : "var(--color-amber)", opacity: idx === 0 ? 1 : 0.55 + idx * 0.05, transition: "width 0.5s" }} />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>{svc.count} {svc.count === 1 ? "booking" : "bookings"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptySection icon={<IconTag />} text="No completed services yet." />
          )}
        </div>
      </div>

      {/* Ads nudge */}
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
        <button
          onClick={() => window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, "_blank")}
          className="flex-shrink-0 font-bold text-white rounded-xl transition-all active:scale-95"
          style={{ fontSize: 13, padding: "10px 16px", background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)" }}
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
      {/* Muted hero */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(232,146,10,0.08)", border: "1.5px dashed rgba(232,146,10,0.25)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(232,146,10,0.50)" }}>Earnings this month</p>
        <p className="font-black leading-none" style={{ fontSize: 52, color: "rgba(232,146,10,0.20)", letterSpacing: "-0.03em" }}>₪0</p>
        <p className="text-[13px] mt-4" style={{ color: "var(--color-muted)" }}>
          Earnings appear here once you complete bookings.
        </p>
      </div>

      {/* Muted stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {[["Bookings", <IconCal key="c" />], ["Completed", <IconCheck key="ch" />], ["No shows", <IconX key="x" />], ["Avg ticket", <IconTag key="t" />]].map(([label, icon]) => (
          <div key={label as string} className="rounded-2xl" style={{ padding: "16px 20px", background: "#fff", boxShadow: "var(--shadow-sm)", opacity: 0.45 }}>
            <div className="rounded-xl flex items-center justify-center mb-3" style={{ width: 36, height: 36, background: "rgba(107,96,82,0.08)", color: "var(--color-muted)" }}>{icon}</div>
            <p className="font-black leading-none mb-1.5" style={{ fontSize: 30, color: "var(--color-dark)" }}>0</p>
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{label as string}</p>
          </div>
        ))}
      </div>

      {/* Muted chart + services */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-sm)", opacity: 0.5 }}>
          <p className="font-bold mb-4" style={{ fontSize: 15, color: "var(--color-dark)" }}>Revenue trend</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {[40, 65, 30, 80].map((h, i) => (
              <div key={i} style={{ flex: 1, background: "rgba(232,146,10,0.15)", borderRadius: "8px 8px 0 0", height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-sm)", opacity: 0.5 }}>
          <p className="font-bold mb-4" style={{ fontSize: 15, color: "var(--color-dark)" }}>Top services</p>
          {[90, 60, 35].map((w, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ height: 12, width: `${w}px`, background: "rgba(30,26,20,0.08)", borderRadius: 6 }} />
                <div style={{ height: 12, width: 40, background: "rgba(30,26,20,0.06)", borderRadius: 6 }} />
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "rgba(30,26,20,0.06)" }}>
                <div style={{ height: "100%", width: `${w}%`, borderRadius: 99, background: "rgba(232,146,10,0.25)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[13px]" style={{ color: "var(--color-muted)", paddingTop: 4 }}>
        Complete your first booking and come back here to see your numbers.
      </p>
    </div>
  );
}

// ─── Appointments tab ─────────────────────────────────────────────────────────

function AppointmentsTab({ bookings, monthLabel }: { bookings: BookingRow[]; monthLabel: string }) {

  function exportCSV() {
    const header = ["Date", "Time", "Client", "Service", "Duration (min)", "Price (₪)", "Status", "Payment"];
    const rows = bookings.map((b) => [
      b.appointment_date,
      b.appointment_time,
      b.customer_name,
      b.service?.name ?? "",
      b.service?.duration ?? "",
      b.service?.price ?? "",
      STATUS_LABEL[b.status],
      b.payment_status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${monthLabel.replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: "var(--color-muted)" }}>
          {bookings.length} appointment{bookings.length !== 1 ? "s" : ""} in {monthLabel}
        </p>
        {bookings.length > 0 && (
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all active:scale-95"
            style={{ fontSize: 13, padding: "8px 14px", background: "#fff", boxShadow: "var(--shadow-sm)", color: "var(--color-dark)" }}
          >
            <IconDownload />
            Export CSV
          </button>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-2xl" style={{ background: "#fff", boxShadow: "var(--shadow-md)", padding: "56px 24px", textAlign: "center" }}>
          <div className="rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ width: 52, height: 52, background: "var(--amber-soft)" }}>
            <IconCal size={22} color="var(--color-amber)" />
          </div>
          <p className="font-extrabold" style={{ fontSize: 17, color: "var(--color-dark)", marginBottom: 8 }}>No appointments yet</p>
          <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 280, margin: "0 auto" }}>
            Appointments show up here once clients start booking this month.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          {bookings.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 20px",
                borderTop: i > 0 ? "1px solid var(--color-cream-2)" : "none",
              }}
            >
              {/* Date/time */}
              <div style={{ minWidth: 80, flexShrink: 0 }}>
                <p className="font-bold" style={{ fontSize: 13, color: "var(--color-dark)" }}>
                  {format(parseISO(b.appointment_date), "d MMM")}
                </p>
                <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{b.appointment_time.slice(0, 5)}</p>
              </div>
              {/* Client + service */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-semibold truncate" style={{ fontSize: 14, color: "var(--color-dark)" }}>{b.customer_name}</p>
                <p className="truncate" style={{ fontSize: 12, color: "var(--color-muted)" }}>{b.service?.name ?? "Service"}</p>
              </div>
              {/* Price */}
              {b.service?.price != null && (
                <p className="font-bold flex-shrink-0" style={{ fontSize: 14, color: "var(--color-dark)" }}>
                  ₪{b.service.price.toLocaleString()}
                </p>
              )}
              {/* Status */}
              <span
                className="flex-shrink-0 rounded-full font-semibold"
                style={{ fontSize: 11, padding: "3px 10px", background: STATUS_BG[b.status], color: STATUS_COLOR[b.status] }}
              >
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

function RevenueTab({ bookings, monthLabel }: { bookings: BookingRow[]; monthLabel: string }) {
  const earned = bookings.filter((b) => isEarned(b.status));
  const pending = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const totalEarned = earned.reduce((s, b) => s + (b.service?.price || 0), 0);
  const totalReceivable = pending.reduce((s, b) => s + (b.service?.price || 0), 0);

  // Revenue by service
  const map = new Map<string, RevenueService>();
  bookings.forEach((b) => {
    if (!b.service?.name) return;
    const key = b.service.name;
    const e = map.get(key) ?? { name: key, count: 0, earned: 0, receivable: 0 };
    e.count++;
    if (isEarned(b.status)) e.earned += b.service.price || 0;
    else if (b.status === "pending" || b.status === "confirmed") e.receivable += b.service.price || 0;
    map.set(key, e);
  });
  const services = Array.from(map.values()).sort((a, b) => b.earned - a.earned || b.receivable - a.receivable);

  if (bookings.length === 0) return (
    <div className="rounded-2xl" style={{ background: "#fff", boxShadow: "var(--shadow-md)", padding: "56px 24px", textAlign: "center" }}>
      <div className="rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ width: 52, height: 52, background: "var(--amber-soft)" }}>
        <IconTag size={22} color="var(--color-amber)" />
      </div>
      <p className="font-extrabold" style={{ fontSize: 17, color: "var(--color-dark)", marginBottom: 8 }}>No revenue data yet</p>
      <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 280, margin: "0 auto" }}>
        Revenue details appear once you complete bookings this month.
      </p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="rounded-2xl p-5" style={{ background: "var(--wash-amber)", boxShadow: "var(--shadow-amber)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.70)", marginBottom: 10 }}>Total earned</p>
          <p className="font-black" style={{ fontSize: 36, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
            ₪{totalEarned.toLocaleString()}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 8 }}>{earned.length} completed booking{earned.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 10 }}>Receivable</p>
          <p className="font-black" style={{ fontSize: 36, color: "var(--color-dark)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            ₪{totalReceivable.toLocaleString()}
          </p>
          <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 8 }}>{pending.length} pending booking{pending.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* By service */}
      {services.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 24px", padding: "12px 20px", borderBottom: "1px solid var(--color-cream-2)" }}>
            {["Service", "Bookings", "Earned"].map((h) => (
              <p key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</p>
            ))}
          </div>
          {services.map((s, i) => (
            <div
              key={s.name}
              style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 24px", padding: "14px 20px", borderTop: i > 0 ? "1px solid var(--color-cream-2)" : "none", alignItems: "center" }}
            >
              <p className="font-semibold" style={{ fontSize: 14, color: "var(--color-dark)" }}>{s.name}</p>
              <p style={{ fontSize: 14, color: "var(--color-muted)", textAlign: "right" }}>{s.count}</p>
              <p className="font-bold" style={{ fontSize: 14, color: s.earned > 0 ? "var(--color-dark)" : "var(--color-muted)", textAlign: "right" }}>
                {s.earned > 0 ? `₪${s.earned.toLocaleString()}` : "₪0"}
              </p>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 24px", padding: "14px 20px", borderTop: "2px solid var(--color-cream-2)", background: "var(--color-cream)", alignItems: "center" }}>
            <p className="font-bold" style={{ fontSize: 14, color: "var(--color-dark)" }}>Total — {monthLabel}</p>
            <p className="font-bold" style={{ fontSize: 14, color: "var(--color-dark)", textAlign: "right" }}>{bookings.length}</p>
            <p className="font-bold" style={{ fontSize: 14, color: "var(--color-amber)", textAlign: "right" }}>₪{totalEarned.toLocaleString()}</p>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: WeekPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const peak = data.reduce((hi, d, i) => (d.revenue > data[hi].revenue ? i : hi), 0);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
      {data.map((d, i) => {
        const isActive = active === i;
        const isPeak = i === peak;
        const heightPct = Math.max(4, (d.revenue / max) * 100);
        return (
          <button
            key={d.label}
            onClick={() => setActive(isActive ? null : i)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%" }}
            aria-label={`${d.label}: ₪${d.revenue.toLocaleString()}`}
          >
            <span
              style={{
                padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                background: isActive ? "var(--color-amber)" : "transparent",
                color: isActive ? "#fff" : "transparent",
                transition: "all 0.15s",
              }}
            >
              ₪{d.revenue.toLocaleString()}
            </span>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div
                style={{
                  width: "100%", maxWidth: 52, borderRadius: "12px 12px 0 0",
                  height: `${heightPct}%`,
                  background: (isActive || isPeak) ? "var(--wash-amber)" : "rgba(232,146,10,0.20)",
                  boxShadow: (isActive || isPeak) ? "var(--shadow-amber)" : "none",
                  transition: "all 0.2s",
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-muted)" }}>{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, iconBg, iconColor, valueColor }: {
  label: string; value: number | string;
  icon: React.ReactNode; iconBg: string; iconColor: string; valueColor?: string;
}) {
  return (
    <div className="rounded-2xl" style={{ padding: "16px 20px", background: "#fff", boxShadow: "var(--shadow-md)" }}>
      <div className="rounded-xl flex items-center justify-center mb-3" style={{ width: 36, height: 36, background: iconBg, color: iconColor }}>{icon}</div>
      <p className="font-black leading-none mb-1.5" style={{ fontSize: 30, color: valueColor || "var(--color-dark)", letterSpacing: "-0.02em" }}>{value}</p>
      <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{label}</p>
    </div>
  );
}

// ─── Empty section ────────────────────────────────────────────────────────────

function EmptySection({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", textAlign: "center" }}>
      <div style={{ color: "rgba(107,96,82,0.30)", marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 13, color: "var(--color-muted)" }}>{text}</p>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCal({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconCheck({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconX({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>;
}
function IconTag({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
}
function IconChart() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}
function IconDownload() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}
