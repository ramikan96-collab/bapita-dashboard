"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  format, startOfMonth, endOfMonth,
  isSameDay, parseISO, addDays, addMonths,
} from "date-fns";

import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useLang } from "@/i18n";
import { useCalendarChrome, type CalView } from "@/components/calendar/CalendarChrome";
import DayView from "@/components/calendar/DayView";
import WeekView from "@/components/calendar/WeekView";
import ConfirmRescheduleSheet from "@/components/calendar/ConfirmRescheduleSheet";
import MonthView from "@/components/calendar/MonthView";
import AgendaView from "@/components/calendar/AgendaView";
import AgendaList from "@/components/calendar/AgendaList";
import type { BlockDraft } from "@/components/calendar/BlockTimeSheet";
import { openHourFor, minsToTime, timeToMins } from "@/components/calendar/grid";
import { useToast } from "@/components/Toast";
import { rescheduleBooking, sendRescheduleEmail } from "@/lib/reschedule";
import { CalendarSkeleton } from "@/components/LoadingSkeleton";
import { loadActiveStaff } from "@/lib/staff";
import type { Booking, BlockedTime, BookingStatus, StaffMember } from "@/types";

// Both only render once the user opens a booking/block — split out of the
// calendar route's initial chunk instead of loading with every page view.
const BookingDrawer = dynamic(() => import("@/components/calendar/BookingDrawer"));
const BlockTimeSheet = dynamic(() => import("@/components/calendar/BlockTimeSheet"));

function applyPatch(bookings: Booking[], id: string, patch: Partial<Booking>): Booking[] {
  return bookings.map((b) => (b.id === id ? { ...b, ...patch } : b));
}

// A pending drag-to-reschedule move, awaiting the owner's confirmation.
interface PendingMove {
  booking: Booking;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
}

// Visible date range [start, end] for the active view.
function rangeFor(view: CalView, date: Date): [Date, Date] {
  if (view === "day") return [date, date];
  if (view === "week") {
    return [date, addDays(date, 6)];
  }
  if (view === "agenda") return [date, addDays(date, 90)];
  return [startOfMonth(date), endOfMonth(date)];
}

function CalendarPageInner() {
  const { business, loading: bizLoading } = useBusiness();
  const { showToast } = useToast();
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [savingMove, setSavingMove] = useState(false);
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView]           = useState<CalView>("week");
  const [date, setDate]           = useState<Date>(new Date());
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [blocked, setBlocked]     = useState<BlockedTime[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<Booking | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingStatus[]>([]);
  const [calendarFilter, setCalendarFilter] = useState<string[]>([]);
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Booking[] | null>(null);
  const dateInputRef              = useRef<HTMLInputElement>(null);
  const supabase                  = createClient();
  const { setChrome }             = useCalendarChrome();

  const fetchBookings = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const [s, e] = rangeFor(view, date);

    const { data } = await supabase
      .from("bookings")
      .select("*, service:services(name, duration, price), label:labels(id,name,color), staff:staff(id,name,color)")
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
    // Initial + range-change loads from Supabase; setState runs post-fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
    fetchBlocked();
  }, [fetchBookings, fetchBlocked]);

  useEffect(() => {
    if (!business) return;
    loadActiveStaff(supabase, business.id).then(setStaff);
  }, [business, supabase]);

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

  // Open booking drawer from notification click (?booking=<id>).
  // Keyed on the search param so it re-runs even when we're already on
  // /calendar and only the query string changes (no remount otherwise).
  const bookingParam = searchParams.get("booking");
  useEffect(() => {
    if (!bookingParam) return;
    createClient()
      .from("bookings")
      .select("*, service:services(name, duration, price), label:labels(id,name,color), staff:staff(id,name,color)")
      .eq("id", bookingParam)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelected(data as Booking);
          setDate(parseISO((data as Booking).appointment_date));
          setView("day");
        }
        // Strip the param so a refresh doesn't reopen it and re-clicking the
        // same booking flips the value null→id again, re-triggering this effect.
        router.replace(window.location.pathname, { scroll: false });
      });
  }, [bookingParam, router]);

  // Publish state to the AppShell top bar.
  const isTodaySelected = isSameDay(date, new Date());

  const headerLabel = useMemo(() => {
    const n = bookings.length;
    const apptStr = `${n} appointment${n !== 1 ? "s" : ""}`;
    if (view === "day") return `${format(date, "EEE, MMM d")} · ${apptStr}`;
    if (view === "week") {
      return `${format(date, "MMM d")}–${format(addDays(date, 6), "MMM d")} · ${apptStr}`;
    }
    if (view === "agenda") return `Upcoming · ${apptStr}`;
    return `${format(date, "MMMM yyyy")} · ${apptStr}`;
  }, [view, date, bookings]);

  useEffect(() => {
    setChrome({
      monthYear: format(date, "MMMM yyyy"),
      headerLabel,
      view,
      setView,
      isToday: isTodaySelected,
      onToday: () => setDate(new Date()),
      openDatePicker: () =>
        dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click(),
      statusFilter,
      setStatusFilter,
      calendarFilter,
      setCalendarFilter,
      staff,
      searchQuery,
      setSearchQuery,
    });
    // searchQuery/setters intentionally omitted — republishing chrome on every
    // keystroke would thrash the top bar; the values are read via the stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, view, statusFilter, calendarFilter, isTodaySelected, headerLabel, setChrome, staff]);

  // Clear the top bar when leaving the calendar.
  useEffect(() => () => setChrome(null), [setChrome]);

  // Debounced search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || !business) {
      // Clearing results when the query is empty (debounced input sync).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, service:services(name, duration, price), label:labels(id,name,color), staff:staff(id,name,color)")
        .eq("business_id", business.id)
        .ilike("customer_name", `%${q}%`)
        .order("appointment_date", { ascending: false })
        .limit(50);
      setSearchResults((data as Booking[]) ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, business, supabase]);

  if (bizLoading) return <CalendarSkeleton />;

  if (!business) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center px-4 py-8" style={{ background: "var(--color-cream)" }}>
        <div
          className="w-full max-w-sm p-6"
          style={{ background: "var(--color-surface)", borderRadius: 20, boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)" }}
        >
          {/* Icon */}
          <div
            className="flex items-center justify-center mb-4"
            style={{ width: 56, height: 56, borderRadius: 16, background: "var(--amber-soft)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>

          <h1 className="text-[22px] font-extrabold leading-snug" style={{ color: "var(--color-dark)" }}>
            {t("Welcome to Bapita")}
          </h1>
          <p className="text-[15px] mt-1.5 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {t("Set up your business and your calendar comes to life. Takes about two minutes.")}
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-3 mt-6">
            {[
              { n: 1, title: t("Business info"), desc: t("Name, phone, address") },
              { n: 2, title: t("Services"), desc: t("What you offer + prices") },
              { n: 3, title: t("Business hours"), desc: t("When you're open") },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                  style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)" }}
                >
                  {s.n}
                </div>
                <div>
                  <div className="text-[15px] font-semibold leading-tight" style={{ color: "var(--color-dark)" }}>{s.title}</div>
                  <div className="text-[12px] leading-tight" style={{ color: "var(--color-muted)" }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/settings"
            className="mt-6 w-full flex items-center justify-center text-[15px] font-bold transition-all"
            style={{
              height: 48, borderRadius: 14, background: "var(--wash-amber)", color: "var(--color-surface)",
              boxShadow: "0 4px 14px rgba(232,146,10,0.28)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(232,146,10,0.38)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(232,146,10,0.28)"; }}
          >
            {t("Set up your business")}
          </Link>
        </div>
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

  // Drag-to-reschedule drop: validate the slot, then ask the owner to confirm
  // the new date/time before anything is saved. The card does not move until
  // confirmed — Cancel simply snaps it back (nothing persisted).
  function handleRescheduleDrop(booking: Booking, newDate: string, newTime: string) {
    const duration = booking.service?.duration ?? 30;
    const start = timeToMins(newTime);
    const end = start + duration;
    const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

    const clash =
      bookings.some((o) =>
        o.id !== booking.id &&
        o.appointment_date === newDate &&
        o.status !== "cancelled" &&
        overlaps(start, end, timeToMins(o.appointment_time), timeToMins(o.appointment_time) + (o.service?.duration ?? 30)),
      ) ||
      blocked.some((bl) =>
        bl.block_date === newDate &&
        overlaps(start, end, timeToMins(bl.start_time), timeToMins(bl.end_time)),
      );
    if (clash) {
      showToast("That slot is taken", "error");
      return;
    }

    if (booking.appointment_date === newDate && booking.appointment_time === newTime) return;

    setPendingMove({
      booking,
      oldDate: booking.appointment_date,
      oldTime: booking.appointment_time,
      newDate,
      newTime,
    });
  }

  async function confirmMove() {
    if (!pendingMove || savingMove) return;
    const { booking, oldDate, oldTime, newDate, newTime } = pendingMove;
    setSavingMove(true);
    const { error } = await rescheduleBooking(supabase, booking.id, newDate, newTime);
    setSavingMove(false);
    if (error) {
      showToast("Couldn't reschedule. Please try again.", "error");
      return;
    }
    setBookings((prev) => applyPatch(prev, booking.id, { appointment_date: newDate, appointment_time: newTime }));
    sendRescheduleEmail(booking, oldDate, oldTime, newDate, newTime, business);
    setPendingMove(null);
    showToast("Rescheduled", "success");
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
      staff_id: calendarFilter.length === 1 ? calendarFilter[0] : null,
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
      staff_id: bl.staff_id ?? null,
    });
  }

  const openHour = openHourFor(business, view === "day" ? date : undefined);

  const byStatus =
    statusFilter.length === 0 ? bookings : bookings.filter((b) => statusFilter.includes(b.status));
  const visibleBookings =
    calendarFilter.length === 0
      ? byStatus
      : byStatus.filter((b) => b.staff_id != null && calendarFilter.includes(b.staff_id));
  const visibleBlocked =
    calendarFilter.length === 0
      ? blocked
      : blocked.filter((bl) => bl.staff_id == null || calendarFilter.includes(bl.staff_id));

  return (
    <div className="flex flex-col h-full">
      {/* Hidden date input for desktop sidebar date picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={format(date, "yyyy-MM-dd")}
        onChange={(e) => e.target.value && setDate(parseISO(e.target.value))}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
      />

      <div className="flex-1 overflow-hidden relative">
        {loading && !searchQuery && (
          <div className="absolute top-0 left-0 right-0 overflow-hidden z-20" style={{ height: 2 }}>
            <div style={{ height: "100%", background: "var(--color-amber)", animation: "calProgress 1.1s ease-in-out infinite" }} />
            <style jsx>{`
              @keyframes calProgress {
                0% { width: 0%; margin-left: 0%; }
                50% { width: 60%; margin-left: 20%; }
                100% { width: 0%; margin-left: 100%; }
              }
            `}</style>
          </div>
        )}

        {/* Search results overlay */}
        {searchQuery ? (
          <div className="h-full overflow-y-auto bg-[var(--color-surface)] md:bg-[var(--color-cream)]">
            {searchResults === null ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 px-6 text-center">
                <p className="text-[15px] font-bold" style={{ color: "var(--color-dark)" }}>{t("No results")}</p>
                <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                  {t("No bookings matching")} &ldquo;{searchQuery.trim()}&rdquo;
                </p>
              </div>
            ) : (
              <AgendaList
                bookings={searchResults}
                onSelectBooking={setSelected}
              />
            )}
          </div>
        ) : null}

        {!searchQuery && (
          <div key={view} className="page-anim h-full">
            {view === "day" && (
              <DayView
                date={date}
                bookings={visibleBookings}
                blocked={visibleBlocked}
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
                blocked={visibleBlocked}
                openHour={openHour}
                business={business}
                onSelectBooking={setSelected}
                onCreateAt={handleCreateAt}
                onLongPressAt={handleLongPressAt}
                onBlockClick={handleBlockClick}
                onSelectDay={handleSelectDay}
                onRescheduleDrop={handleRescheduleDrop}
                onPrev={() => setDate((d) => addDays(d, -7))}
                onNext={() => setDate((d) => addDays(d, 7))}
              />
            )}
            {view === "month" && (
              <MonthView
                date={date}
                bookings={visibleBookings}
                onSelectDay={handleSelectDay}
                onSelectBooking={setSelected}
                onPrev={() => setDate((d) => addMonths(d, -1))}
                onNext={() => setDate((d) => addMonths(d, 1))}
              />
            )}
            {view === "agenda" && (
              <AgendaView
                bookings={visibleBookings}
                onSelectBooking={setSelected}
                onNewBooking={() => router.push("/new-booking")}
              />
            )}
          </div>
        )}
      </div>

      {selected && (
        <BookingDrawer
          booking={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={(id) => {
            setBookings((prev) => prev.filter((b) => b.id !== id));
            setSelected(null);
          }}
        />
      )}
      {blockDraft && (
        <BlockTimeSheet
          draft={blockDraft}
          onClose={() => setBlockDraft(null)}
          onSaved={fetchBlocked}
        />
      )}
      {pendingMove && (
        <ConfirmRescheduleSheet
          booking={pendingMove.booking}
          oldDate={pendingMove.oldDate}
          oldTime={pendingMove.oldTime}
          newDate={pendingMove.newDate}
          newTime={pendingMove.newTime}
          saving={savingMove}
          onConfirm={confirmMove}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageInner />
    </Suspense>
  );
}
