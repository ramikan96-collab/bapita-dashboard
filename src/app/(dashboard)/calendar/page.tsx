"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameDay, parseISO,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useCalendarChrome, type StatusFilter } from "@/components/calendar/CalendarChrome";
import DayView from "@/components/calendar/DayView";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import BookingDrawer from "@/components/calendar/BookingDrawer";
import { CalendarSkeleton } from "@/components/LoadingSkeleton";
import type { Booking } from "@/types";

type CalView = "day" | "week" | "month";

function applyPatch(bookings: Booking[], id: string, patch: Partial<Booking>): Booking[] {
  return bookings.map((b) => (b.id === id ? { ...b, ...patch } : b));
}

export default function CalendarPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [view, setView]           = useState<CalView>("day");
  const [date, setDate]           = useState<Date>(new Date());
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const dateInputRef              = useRef<HTMLInputElement>(null);
  const supabase                  = createClient();
  const { setChrome }             = useCalendarChrome();

  const fetchBookings = useCallback(async () => {
    if (!business) return;
    setLoading(true);

    let query = supabase
      .from("bookings")
      .select("*, service:services(name, duration, price)")
      .eq("business_id", business.id)
      .order("appointment_time");

    if (view === "day") {
      query = query.eq("appointment_date", format(date, "yyyy-MM-dd"));
    } else if (view === "week") {
      const s = startOfWeek(date, { weekStartsOn: 1 });
      const e = endOfWeek(date, { weekStartsOn: 1 });
      query = query
        .gte("appointment_date", format(s, "yyyy-MM-dd"))
        .lte("appointment_date", format(e, "yyyy-MM-dd"));
    } else {
      const s = startOfMonth(date);
      const e = endOfMonth(date);
      query = query
        .gte("appointment_date", format(s, "yyyy-MM-dd"))
        .lte("appointment_date", format(e, "yyyy-MM-dd"));
    }

    const { data } = await query;
    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  }, [business, view, date, supabase]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (!business) return;
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `business_id=eq.${business.id}`,
        },
        () => fetchBookings()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [business, supabase, fetchBookings]);

  // Publish state to the AppShell top bar (☰ + Month ▾ + ⋮).
  const isTodaySelected = isSameDay(date, new Date());
  useEffect(() => {
    setChrome({
      monthYear: format(date, "MMMM yyyy"),
      view,
      setView,
      isToday: isTodaySelected,
      onToday: () => setDate(new Date()),
      openDatePicker: () =>
        dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click(),
      statusFilter,
      setStatusFilter,
    });
  }, [date, view, statusFilter, isTodaySelected, setChrome]);

  // Clear the top bar when leaving the calendar.
  useEffect(() => () => setChrome(null), [setChrome]);

  if (bizLoading) return <CalendarSkeleton />;

  if (!business) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 px-6 text-center">
        <span style={{ fontSize: 40 }}>🏪</span>
        <p className="font-black text-base" style={{ color: "var(--color-dark)" }}>Set up your business</p>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Go to Settings → Business Info to complete your profile.
        </p>
        <a href="/settings" className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: "var(--color-amber)", color: "#fff" }}>
          Open Settings
        </a>
      </div>
    );
  }

  function handleSelectDay(d: Date) {
    setDate(d);
    setView("day");
  }

  function handleUpdated(patch: Partial<Booking>) {
    if (!selected) return;
    setBookings((prev) => applyPatch(prev, selected.id, patch));
    setSelected((prev) => prev ? { ...prev, ...patch } : null);
  }

  const visibleBookings =
    statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);

  return (
    <div className="flex flex-col h-full">
      {/* Hidden date input driven by the AppShell "Month ▾" picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={format(date, "yyyy-MM-dd")}
        onChange={(e) => e.target.value && setDate(parseISO(e.target.value))}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
      />

      {/* Today summary strip — day view on today only */}
      {view === "day" && isSameDay(date, new Date()) && (() => {
        const todayRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.service?.price || 0), 0);
        const nextBooking = bookings
          .filter(b => b.status === "confirmed" || b.status === "pending")
          .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))[0];
        return (
          <div className="shrink-0 px-4 py-3 flex gap-3 overflow-x-auto border-b" style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)" }}>
            <div className="shrink-0 px-4 py-2 rounded-xl text-center min-w-[80px]" style={{ background: "var(--color-cream-2)" }}>
              <div className="text-xl font-black" style={{ color: "var(--color-dark)" }}>{bookings.length}</div>
              <div className="text-xs" style={{ color: "var(--color-muted)" }}>Today</div>
            </div>
            <div className="shrink-0 px-4 py-2 rounded-xl text-center min-w-[80px]" style={{ background: "var(--color-cream-2)" }}>
              <div className="text-xl font-black" style={{ color: "var(--color-amber)" }}>₪{todayRevenue}</div>
              <div className="text-xs" style={{ color: "var(--color-muted)" }}>Earned</div>
            </div>
            {nextBooking && (
              <div className="shrink-0 px-4 py-2 rounded-xl flex items-center gap-2 min-w-[140px]" style={{ background: "var(--color-amber)", color: "#fff" }}>
                <div>
                  <div className="text-xs font-medium opacity-80">Up next</div>
                  <div className="text-sm font-bold">{nextBooking.customer_name}</div>
                  <div className="text-xs opacity-80">{nextBooking.appointment_time.slice(0, 5)}</div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
          </div>
        )}
        {view === "day" && <DayView date={date} bookings={visibleBookings} onSelectBooking={setSelected} />}
        {view === "week" && <WeekView date={date} bookings={visibleBookings} onSelectBooking={setSelected} onSelectDay={handleSelectDay} />}
        {view === "month" && <MonthView date={date} bookings={visibleBookings} onSelectDay={handleSelectDay} />}
      </div>

      {selected && <BookingDrawer booking={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />}
    </div>
  );
}
