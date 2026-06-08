"use client";

import { useState, useEffect } from "react";
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { InsightsSkeleton } from "@/components/LoadingSkeleton";

type DateRange = "week" | "month" | "lastMonth";

interface Stats {
  revenue: number;
  previousRevenue: number;
  bookings: number;
  previousBookings: number;
  completed: number;
  cancelled: number;
  noShow: number;
  noShowRate: number;
  newCustomers: number;
  returningCustomers: number;
  topServices: { name: string; count: number; revenue: number }[];
  dailyBookings: { date: string; count: number; revenue: number }[];
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
      
      // Current period bookings
      const { data: currentBookings } = await supabase
        .from("bookings")
        .select("*, service:services(price)")
        .eq("business_id", business.id)
        .gte("appointment_date", startStr)
        .lte("appointment_date", endStr);
      
      // Previous period bookings
      const { data: previousBookings } = await supabase
        .from("bookings")
        .select("*, service:services(price)")
        .eq("business_id", business.id)
        .gte("appointment_date", prevStartStr)
        .lte("appointment_date", prevEndStr);
      
      // Calculate revenue
      const revenue = (currentBookings || []).reduce((sum, b) => sum + (b.service?.price || 0), 0);
      const previousRevenue = (previousBookings || []).reduce((sum, b) => sum + (b.service?.price || 0), 0);
      
      // Count by status
      const bookings = currentBookings?.length || 0;
      const previousBookingsCount = previousBookings?.length || 0;
      const completed = (currentBookings || []).filter(b => b.status === "completed").length;
      const cancelled = (currentBookings || []).filter(b => b.status === "cancelled").length;
      const noShow = (currentBookings || []).filter(b => b.status === "no_show").length;
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
      
      // Daily bookings for chart
      const dailyMap = new Map<string, { count: number; revenue: number }>();
      (currentBookings || []).forEach(b => {
        const date = b.appointment_date;
        const existing = dailyMap.get(date);
        if (existing) {
          existing.count++;
          existing.revenue += b.service?.price || 0;
        } else {
          dailyMap.set(date, { count: 1, revenue: b.service?.price || 0 });
        }
      });
      const dailyBookings = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, count: data.count, revenue: data.revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // New vs returning customers (simplified for MVP)
      const { data: allCustomers } = await supabase
        .from("customers")
        .select("created_at")
        .eq("business_id", business.id);
      
      const newCustomers = (allCustomers || []).filter(c => c.created_at && c.created_at >= startStr).length;
      const returningCustomers = (currentBookings?.length || 0) - newCustomers;
      
      setStats({
        revenue,
        previousRevenue,
        bookings,
        previousBookings: previousBookingsCount,
        completed,
        cancelled,
        noShow,
        noShowRate,
        newCustomers,
        returningCustomers,
        topServices,
        dailyBookings,
      });
      
      setLoading(false);
    }
    
    fetchStats();
  }, [business, dateRange, supabase]);

  if (bizLoading) return <InsightsSkeleton />;

  const revenueChange = stats?.previousRevenue ? ((stats.revenue - stats.previousRevenue) / stats.previousRevenue) * 100 : 0;
  const bookingsChange = stats?.previousBookings ? ((stats.bookings - stats.previousBookings) / stats.previousBookings) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--color-dark)" }}>Insights</h1>
      </div>
      
      {/* Date range selector */}
      <div className="shrink-0 px-4 py-3 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="flex gap-2">
          {(["week", "month", "lastMonth"] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                dateRange === range ? "text-white" : "opacity-60"
              }`}
              style={{
                background: dateRange === range ? "var(--color-amber)" : "var(--color-cream-2)",
                color: dateRange === range ? "#fff" : "var(--color-dark)",
              }}
            >
              {range === "week" && "This week"}
              {range === "month" && "Last 30 days"}
              {range === "lastMonth" && "Last month"}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
        </div>
      ) : stats ? (
        <div className="flex-1 p-4 space-y-4">
          {/* Revenue Card */}
          <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-2)" }}>
            <div className="text-xs opacity-60 mb-1">Revenue</div>
            <div className="text-3xl font-black" style={{ color: "var(--color-dark)" }}>₪{stats.revenue.toLocaleString()}</div>
            {revenueChange !== 0 && (
              <div className={`text-xs mt-1 ${revenueChange > 0 ? "text-green-600" : "text-red-600"}`}>
                {revenueChange > 0 ? "↑" : "↓"} {Math.abs(revenueChange).toFixed(1)}% from previous period
              </div>
            )}
          </div>
          
          {/* Bookings Card */}
          <div className="p-4 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }}>
            <div className="text-xs opacity-60 mb-1">Total bookings</div>
            <div className="text-3xl font-black" style={{ color: "var(--color-dark)" }}>{stats.bookings}</div>
            {bookingsChange !== 0 && (
              <div className={`text-xs mt-1 ${bookingsChange > 0 ? "text-green-600" : "text-red-600"}`}>
                {bookingsChange > 0 ? "↑" : "↓"} {Math.abs(bookingsChange).toFixed(1)}% from previous period
              </div>
            )}
          </div>
          
          {/* Status Breakdown */}
          <div className="p-4 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }}>
            <div className="text-sm font-bold mb-3" style={{ color: "var(--color-dark)" }}>Booking status</div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Completed</span>
                  <span>{stats.completed} ({((stats.completed / stats.bookings) * 100).toFixed(0)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${(stats.completed / stats.bookings) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Cancelled</span>
                  <span>{stats.cancelled}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${(stats.cancelled / stats.bookings) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>No-show rate</span>
                  <span>{stats.noShowRate.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full" style={{ 
                    width: `${stats.noShowRate}%`,
                    background: stats.noShowRate > 20 ? "#ef4444" : stats.noShowRate > 10 ? "#eab308" : "#22c55e"
                  }} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Top Services */}
          <div className="p-4 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }}>
            <div className="text-sm font-bold mb-3" style={{ color: "var(--color-dark)" }}>Top services</div>
            <div className="space-y-2">
              {stats.topServices.map((service, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{service.name}</div>
                    <div className="text-xs opacity-60">{service.count} bookings</div>
                  </div>
                  <div className="font-bold">₪{service.revenue}</div>
                </div>
              ))}
              {stats.topServices.length === 0 && (
                <div className="text-center text-sm opacity-60 py-4">No service data yet</div>
              )}
            </div>
          </div>
          
          {/* New vs Returning */}
          <div className="p-4 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }}>
            <div className="text-sm font-bold mb-3" style={{ color: "var(--color-dark)" }}>Customers</div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-green-600">{stats.newCustomers}</div>
                <div className="text-xs opacity-60">New</div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-600">{stats.returningCustomers}</div>
                <div className="text-xs opacity-60">Returning</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-sm opacity-60">No data available</div>
      )}
    </div>
  );
}
