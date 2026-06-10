"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameDay, parseISO, addDays, addMonths,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useCalendarChrome, type StatusFilter } from "@/components/calendar/CalendarChrome";
import DayView from "@/components/calendar/DayView";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import BookingDrawer from "@/components/calendar/BookingDrawer";
import BlockTimeSheet, { type BlockDraft } from "@/components/calendar/BlockTimeSheet";
import { openHourFor, minsToTime } from "@/components/calendar/grid";
import { CalendarSkeleton } from "@/components/LoadingSkeleton";
import type { Booking, BlockedTime } from "@/types";

type CalView = "day" | "week" | "month";

function applyPatch(bookings: Booking[], id: string, patch: Partial<Booking>): Booking[] {
  return bookings.map((b) => (b.id === id ? { ...b, ...patch } : b));
}

// Visible date range [start, end] for the active view.
function rangeFor(view: CalView, date: Date): [Date, Date] {
  if (view === "day") return [date, date];
  if (view === "week") {
    return [startOfWeek(date, { weekStartsOn: 1 }), endOfWeek(date, { weekStartsOn: 1 })];
  }
  return [startOfMonth(date), endOfMonth(date)];
}

export default function CalendarPage() {
  const { business, loading: bizLoading } = useBusiness();
  const router = useRouter();
  const [view, setView]           = useState<CalView>("week");
  const [date, setDate]           = useState<Date>(new Date());
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [blocked, setBlocked]     = useState<BlockedTime[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<Booking | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const dateInputRef              = useRef<HTMLInputElement>(null);
  const supabase                  = createClient();
  const { setChrome }             = useCalendarChrome();

  const fetchBookings = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const [s, e] = rangeFor(view, date);

    const { data } = await supabase
      .from("bookings")
      .select("*, service:services(name, duration:duration_minutes, price:price_nis)")
      .eq("business_id", business.id)
      .gte("appointment_date", format(s, "yyyy-MM-dd"))
      .lte("appointment_date", format(e, "yyyy-MM-dd"))
      .order("appointment_time");

    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  }, [business, view, date, supabase]);

  const fetchBlocked = useCallback(async () => {
    if (!business) return;
    const [s, e] = rangeFor(view, date);
    const { data } = await supabase
      .from("blocked_times")
      .select("*")
      .eq("business_id", business.id)
      .gte("block_date", format(s, "yyyy-MM-dd"))
      .lte("block_date", format(e, "yyyy-MM-dd"));
    setBlocked((data as BlockedTime[]) ?? []);
  }, [business, view, date, supabase]);

  useEffect(() => {
    fetchBookings();
    fetchBlocked();
  }, [fetchBookings, fetchBlocked]);

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

  // Tap an empty slot → new booking pre-filled with that date + time.
  function handleCreateAt(d: Date, mins: number) {
    const params = new URLSearchParams({
      date: format(d, "yyyy-MM-dd"),
      time: minsToTime(mins),
    });
    router.push(`/new-booking?${params.toString()}`);
  }

  // Long-press an empty slot → block time sheet (create mode).
  function handleLongPressAt(d: Date, mins: number) {
    if (!business) return;
    setBlockDraft({
      business_id: business.id,
      block_date: format(d, "yyyy-MM-dd"),
      start_time: minsToTime(mins),
      end_time: minsToTime(mins + 60),
      label: null,
    });
  }

  // Tap a blocked slot → block time sheet (remove mode).
  function handleBlockClick(bl: BlockedTime) {
    setBlockDraft({
      id: bl.id,
      business_id: bl.business_id,
      block_date: bl.block_date,
      start_time: bl.start_time,
      end_time: bl.end_time,
      label: bl.label,
    });
  }

  const openHour = openHourFor(business, view === "day" ? date : undefined);

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
        {view === "day" && (
          <DayView
            date={date}
            bookings={visibleBookings}
            blocked={blocked}
            openHour={openHour}
            onSelectBooking={setSelected}
            onCreateAt={handleCreateAt}
            onLongPressAt={handleLongPressAt}
            onBlockClick={handleBlockClick}
            onPrev={() => setDate((d) => addDays(d, -1))}
            onNext={() => setDate((d) => addDays(d, 1))}
          />
        )}
        {view === "week" && (
          <WeekView
            date={date}
            bookings={visibleBookings}
            blocked={blocked}
            openHour={openHour}
            onSelectBooking={setSelected}
            onCreateAt={handleCreateAt}
            onLongPressAt={handleLongPressAt}
            onBlockClick={handleBlockClick}
            onSelectDay={handleSelectDay}
            onPrev={() => setDate((d) => addDays(d, -7))}
            onNext={() => setDate((d) => addDays(d, 7))}
          />
        )}
        {view === "month" && (
          <MonthView
            date={date}
            bookings={visibleBookings}
            onSelectDay={handleSelectDay}
            onPrev={() => setDate((d) => addMonths(d, -1))}
            onNext={() => setDate((d) => addMonths(d, 1))}
          />
        )}
      </div>

      {selected && <BookingDrawer booking={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />}
      {blockDraft && (
        <BlockTimeSheet
          draft={blockDraft}
          onClose={() => setBlockDraft(null)}
          onSaved={fetchBlocked}
        />
      )}
    </div>
  );
}
