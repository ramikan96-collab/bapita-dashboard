"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  isSameDay, parseISO,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import DayView from "@/components/calendar/DayView";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import BookingDrawer from "@/components/calendar/BookingDrawer";
import { CalendarSkeleton } from "@/components/LoadingSkeleton";
import type { Booking } from "@/types";

type CalView = "day" | "week" | "month";

function headerLabel(date: Date, view: CalView): string {
  if (view === "day") {
    if (isSameDay(date, new Date())) return "Today";
    return format(date, "EEE, d MMM");
  }
  if (view === "week") {
    const s = startOfWeek(date, { weekStartsOn: 1 });
    const e = endOfWeek(date, { weekStartsOn: 1 });
    if (format(s, "MMM") === format(e, "MMM"))
      return `${format(s, "d")} – ${format(e, "d MMM")}`;
    return `${format(s, "d MMM")} – ${format(e, "d MMM")}`;
  }
  return format(date, "MMMM yyyy");
}

function navigate(date: Date, view: CalView, dir: -1 | 1): Date {
  if (view === "day")   return dir === 1 ? addDays(date, 1)    : subDays(date, 1);
  if (view === "week")  return dir === 1 ? addWeeks(date, 1)   : subWeeks(date, 1);
  return                       dir === 1 ? addMonths(date, 1)  : subMonths(date, 1);
}

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
  const dateInputRef              = useRef<HTMLInputElement>(null);
  const supabase                  = createClient();

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

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 flex flex-col gap-2 border-b" style={{ borderColor: "var(--color-cream-2)", background: "var(--color-cream)" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate((d) => navigate(d, view, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: "var(--color-cream-2)", color: "var(--color-dark)" }}>‹</button>
          <button className="flex-1 text-center text-sm font-bold" style={{ color: "var(--color-dark)" }} onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}>
            {headerLabel(date, view)}
          </button>
          <input ref={dateInputRef} type="date" value={format(date, "yyyy-MM-dd")} onChange={(e) => e.target.value && setDate(parseISO(e.target.value))} className="absolute opacity-0 pointer-events-none w-0 h-0" />
          <button onClick={() => setDate((d) => navigate(d, view, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: "var(--color-cream-2)", color: "var(--color-dark)" }}>›</button>
          {!isSameDay(date, new Date()) && (
            <button onClick={() => setDate(new Date())} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "var(--color-amber)", color: "#fff" }}>Today</button>
          )}
        </div>
        <div className="flex rounded-xl p-0.5 self-center" style={{ background: "var(--color-cream-2)" }}>
          {(["day", "week", "month"] as CalView[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all capitalize`} style={{ background: view === v ? "var(--color-amber)" : "transparent", color: view === v ? "#fff" : "var(--color-muted)" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
          </div>
        )}
        {view === "day" && <DayView date={date} bookings={bookings} onSelectBooking={setSelected} />}
        {view === "week" && <WeekView date={date} bookings={bookings} onSelectBooking={setSelected} onSelectDay={handleSelectDay} />}
        {view === "month" && <MonthView date={date} bookings={bookings} onSelectDay={handleSelectDay} />}
      </div>

      {selected && <BookingDrawer booking={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />}
    </div>
  );
}
