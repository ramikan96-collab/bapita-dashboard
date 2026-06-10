"use client";

import { useState, useEffect } from "react";
import { format, subDays, subWeeks, subMonths, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { InsightsSkeleton } from "@/components/LoadingSkeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type DateRange = "week" | "month" | "lastMonth";

interface Stats {
  revenue: number;
  previousRevenue: number;
  bookings: number;
  previousBookings: number;
  completed: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  noShowRate: number;
  newCustomers: number;
  returningCustomers: number;
  topServices: { name: string; count: number; revenue: number }[];
  dailyRevenue: { date: string; label: string; revenue: number }[];
}

export default function InsightsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) { setLoading(false); return; }

    async function fetchStats() {
      if (!business) return;
      setLoading(true);

      let startDate: Date;
      let previousStartDate: Date;
      const endDate = new Date();

      if (dateRange === "week") {
        startDate = startOfWeek(endDate, { weekStartsOn: 1 });
        previousStartDate = subWeeks(startDate, 1);
      } else if (dateRange === "month") {
        startDate = subDays(endDate, 30);
        previousStartDate = subDays(startDate, 30);
      } else {
        startDate = subMonths(endDate, 1);
        previousStartDate = subMonths(startDate, 1);
      }

      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");
      const prevStartStr = format(previousStartDate, "yyyy-MM-dd");
      const prevEndStr = format(startDate, "yyyy-MM-dd");

      const { data: currentBookings } = await supabase
        .from("bookings")
        .select("*, service:services(name, price)")
        .eq("business_id", business.id)
        .gte("appointment_date", startStr)
        .lte("appointment_date", endStr);

      const { data: previousBookings } = await supabase
        .from("bookings")
        .select("*, service:services(price)")
        .eq("business_id", business.id)
        .gte("appointment_date", prevStartStr)
        .lte("appointment_date", prevEndStr);

      const revenue = (currentBookings || []).reduce((sum, b) => sum + (b.service?.price || 0), 0);
      const previousRevenue = (previousBookings || []).reduce((sum, b) => sum + (b.service?.price || 0), 0);

      const bookings = currentBookings?.length || 0;
      const previousBookingsCount = previousBookings?.length || 0;
      const completed = (currentBookings || []).filter(b => b.status === "completed").length;
      const confirmed = (currentBookings || []).filter(b => b.status === "confirmed").length;
      const cancelled = (currentBookings || []).filter(b => b.status === "cancelled").length;
      const noShow = (currentBookings || []).filter(b => b.status === "no_show").length;
      const pending = (currentBookings || []).filter(b => b.status === "pending").length;
      const noShowRate = bookings > 0 ? (noShow / bookings) * 100 : 0;

      // Top services
      const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
      (currentBookings || []).forEach(b => {
        if (b.service?.name) {
          const existing = serviceMap.get(b.service.name);
          if (existing) {
            existing.count++;
            existing.revenue += b.service.price || 0;
          } else {
            serviceMap.set(b.service.name, { name: b.service.name, count: 1, revenue: b.service.price || 0 });
          }
        }
      });
      const topServices = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

      // Daily revenue for chart — T12:00:00 prevents UTC midnight → local-day rollback
      const dailyMap = new Map<string, number>();
      (currentBookings || []).forEach(b => {
        dailyMap.set(b.appointment_date, (dailyMap.get(b.appointment_date) || 0) + (b.service?.price || 0));
      });
      const dailyRevenue = Array.from(dailyMap.entries())
        .map(([date, rev]) => ({
          date,
          label: format(new Date(date + "T12:00:00"), "EEE"),
          revenue: rev,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // New vs returning
      const { data: allCustomers } = await supabase
        .from("customers")
        .select("created_at")
        .eq("business_id", business.id);

      const newCustomers = (allCustomers || []).filter(c => c.created_at && c.created_at >= startStr).length;
      const returningCustomers = Math.max(0, bookings - newCustomers);

      setStats({
        revenue, previousRevenue,
        bookings, previousBookings: previousBookingsCount,
        completed, confirmed, cancelled, noShow, pending,
        noShowRate, newCustomers, returningCustomers,
        topServices, dailyRevenue,
      });

      setLoading(false);
    }

    fetchStats();
  }, [business, dateRange, supabase]);

  if (bizLoading) return <InsightsSkeleton />;

  const revenueChange = stats?.previousRevenue
    ? ((stats.revenue - stats.previousRevenue) / stats.previousRevenue) * 100
    : 0;
  const bookingsChange = stats?.previousBookings
    ? ((stats.bookings - stats.previousBookings) / stats.previousBookings) * 100
    : 0;

  const rangeLabel =
    dateRange === "week" ? "This week" :
    dateRange === "month" ? "Last 30 days" :
    "Last month";

  const cardStyle = {
    background: "var(--color-surface)",
    boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-3">
        <h1 className="text-[28px] font-extrabold leading-tight" style={{ color: "var(--color-dark)" }}>
          Insights
        </h1>
        <p className="text-[13px] font-medium mt-0.5" style={{ color: "var(--color-muted)" }}>
          {rangeLabel}
        </p>
      </div>

      {/* Date range tabs */}
      <div className="shrink-0 px-4 pb-4">
        <div className="flex gap-2">
          {(["week", "month", "lastMonth"] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
              style={{
                background: dateRange === range ? "var(--color-dark)" : "var(--color-surface)",
                color: dateRange === range ? "#fff" : "var(--color-muted)",
                boxShadow: dateRange === range ? "none" : "0 1px 2px rgba(30,26,20,0.06)",
              }}
            >
              {range === "week" ? "This week" : range === "month" ? "30 days" : "Last month"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div
            className="w-7 h-7 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
          />
        </div>
      ) : stats ? (
        <div className="flex-1 px-4 pb-8 space-y-3">

          {/* Revenue hero */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--color-amber)",
              boxShadow: "0 4px 16px rgba(232,146,10,0.25)",
            }}
          >
            <p className="text-[12px] font-semibold text-white/70 uppercase tracking-widest mb-2">
              Revenue
            </p>
            <p className="text-[48px] font-black text-white leading-none">
              ₪{stats.revenue.toLocaleString()}
            </p>
            {revenueChange !== 0 && (
              <p
                className="text-[13px] mt-2 font-medium"
                style={{ color: revenueChange > 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)" }}
              >
                {revenueChange > 0 ? "↑" : "↓"} {Math.abs(revenueChange).toFixed(1)}% vs previous period
              </p>
            )}
          </div>

          {/* 2-col stat grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={cardStyle}>
              <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>Bookings</p>
              <p className="text-[36px] font-black leading-none" style={{ color: "var(--color-dark)" }}>
                {stats.bookings}
              </p>
              {bookingsChange !== 0 && (
                <p
                  className="text-[12px] mt-1.5 font-medium"
                  style={{ color: bookingsChange > 0 ? "#16A34A" : "#DC2626" }}
                >
                  {bookingsChange > 0 ? "+" : ""}{bookingsChange.toFixed(0)}%
                </p>
              )}
            </div>

            <div className="rounded-2xl p-4" style={cardStyle}>
              <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>No-shows</p>
              <p
                className="text-[36px] font-black leading-none"
                style={{
                  color: stats.noShowRate > 20 ? "#DC2626" : stats.noShowRate > 10 ? "#D97706" : "var(--color-dark)"
                }}
              >
                {stats.noShowRate.toFixed(0)}%
              </p>
              <p className="text-[12px] mt-1.5" style={{ color: "var(--color-muted)" }}>
                {stats.noShow} of {stats.bookings}
              </p>
            </div>

            <div className="rounded-2xl p-4" style={cardStyle}>
              <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>New clients</p>
              <p className="text-[36px] font-black leading-none" style={{ color: "#16A34A" }}>
                {stats.newCustomers}
              </p>
            </div>

            <div className="rounded-2xl p-4" style={cardStyle}>
              <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>Returning</p>
              <p className="text-[36px] font-black leading-none" style={{ color: "var(--color-amber)" }}>
                {stats.returningCustomers}
              </p>
            </div>
          </div>

          {/* Revenue bar chart */}
          {stats.dailyRevenue.length > 1 && (
            <div className="rounded-2xl p-4" style={cardStyle}>
              <p className="text-[15px] font-bold mb-4" style={{ color: "var(--color-dark)" }}>
                Revenue by day
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.dailyRevenue} margin={{ top: 4, right: 0, bottom: 0, left: -8 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--color-muted)", fontFamily: "Heebo" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted)", fontFamily: "Heebo" }}
                    tickFormatter={(v: number) => `₪${v}`}
                    axisLine={false}
                    tickLine={false}
                    width={44}
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
                    formatter={(value: number) => [`₪${value.toLocaleString()}`, "Revenue"]}
                    cursor={{ fill: "rgba(30,26,20,0.04)" }}
                  />
                  <Bar dataKey="revenue" fill="var(--color-amber)" radius={[5, 5, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status breakdown */}
          <div className="rounded-2xl p-4" style={cardStyle}>
            <p className="text-[15px] font-bold mb-3" style={{ color: "var(--color-dark)" }}>
              By status
            </p>
            <div className="space-y-2.5">
              {[
                { key: "completed", label: "Completed", count: stats.completed, pillBg: "rgba(34,197,94,0.15)", pillText: "#16A34A", dot: "#22C55E" },
                { key: "confirmed", label: "Confirmed", count: stats.confirmed, pillBg: "rgba(232,146,10,0.15)", pillText: "#B86800", dot: "var(--color-amber)" },
                { key: "pending",   label: "Pending",   count: stats.pending,   pillBg: "rgba(148,163,184,0.15)", pillText: "#64748B", dot: "#94A3B8" },
                { key: "cancelled", label: "Cancelled", count: stats.cancelled, pillBg: "rgba(239,68,68,0.15)",  pillText: "#DC2626", dot: "#EF4444" },
                { key: "no_show",   label: "No-show",   count: stats.noShow,    pillBg: "rgba(239,68,68,0.15)",  pillText: "#DC2626", dot: "#EF4444" },
              ]
                .filter(s => s.count > 0)
                .map((s) => {
                  const pct = stats.bookings > 0 ? Math.round((s.count / stats.bookings) * 100) : 0;
                  return (
                    <div key={s.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                        <span className="text-[15px]" style={{ color: "var(--color-dark)" }}>{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium"
                          style={{ background: s.pillBg, color: s.pillText }}
                        >
                          {pct}%
                        </span>
                        <span className="text-[15px] font-semibold w-5 text-end" style={{ color: "var(--color-dark)" }}>
                          {s.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Top services */}
          <div className="rounded-2xl p-4" style={cardStyle}>
            <p className="text-[15px] font-bold mb-3" style={{ color: "var(--color-dark)" }}>
              Top services
            </p>
            {stats.topServices.length > 0 ? (
              <div className="space-y-3">
                {stats.topServices.map((service, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span
                      className="text-[12px] font-bold w-4 text-center flex-shrink-0"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium truncate" style={{ color: "var(--color-dark)" }}>
                        {service.name}
                      </p>
                      <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                        {service.count} {service.count === 1 ? "booking" : "bookings"}
                      </p>
                    </div>
                    <span className="text-[15px] font-semibold flex-shrink-0" style={{ color: "var(--color-dark)" }}>
                      ₪{service.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-center py-4" style={{ color: "var(--color-muted)" }}>
                No service data yet
              </p>
            )}
          </div>

        </div>
      ) : (
        <div className="flex justify-center py-16">
          <p className="text-[15px]" style={{ color: "var(--color-muted)" }}>No data available</p>
        </div>
      )}
    </div>
  );
}
