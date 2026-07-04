import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { bookingsForStaff } from "@/lib/availability";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface DayHours { open: boolean; start: string; end: string; }
interface BusinessHours { [key: string]: DayHours; }

interface ExistingBookingRow {
  appointment_time: string;
  staff_id: string | null;
  service: { duration: number } | { duration: number }[] | null;
}

function getSlots(
  date: Date,
  durationMinutes: number,
  businessHours: BusinessHours | null,
  booked: { appointment_time: string; duration: number }[],
  bufferMinutes: number = 0,
): string[] {
  const dayKey = DAY_NAMES[date.getDay()];
  const dayHours = businessHours?.[dayKey];
  if (!dayHours?.open) return [];

  const [startH, startM] = (dayHours.start || "09:00").split(":").map(Number);
  const [endH, endM] = (dayHours.end || "19:00").split(":").map(Number);
  const openMinutes = startH * 60 + startM;
  const closeMinutes = endH * 60 + endM;

  const bookedRanges = booked.map((b) => {
    const [h, m] = b.appointment_time.split(":").map(Number);
    const start = h * 60 + m;
    return { start, end: start + (b.duration || 30) + bufferMinutes };
  });

  const slots: string[] = [];
  for (let t = openMinutes; t + durationMinutes <= closeMinutes; t += durationMinutes + bufferMinutes) {
    const overlaps = bookedRanges.some((r) => t < r.end && t + durationMinutes > r.start);
    if (!overlaps) {
      slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    }
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const date = searchParams.get("date");
  const duration = parseInt(searchParams.get("duration") || "30");
  const serviceId = searchParams.get("serviceId");
  const staffId = searchParams.get("staffId");

  if (!businessId || !date) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  // Validate date: strict ISO YYYY-MM-DD, real calendar date, not in the past.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  const reqDate = new Date(date + "T12:00:00");
  if (isNaN(reqDate.getTime()) || reqDate.toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (reqDate < startOfToday) {
    return NextResponse.json({ slots: [] });
  }

  const supabase = createServiceClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("business_hours, buffer_minutes, advance_days, blocked_dates, allow_staff_choice")
    .eq("id", businessId)
    .single();

  // Blocked dates check
  const blocked = (business?.blocked_dates as string[] | null) || [];
  if (blocked.includes(date)) {
    return NextResponse.json({ slots: [] });
  }

  // Enforce advance booking window
  const advanceDays = (business?.advance_days as number | null) ?? 30;
  const requestedDate = new Date(date + "T12:00:00");
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + advanceDays);
  if (requestedDate > maxDate) {
    return NextResponse.json({ slots: [] });
  }

  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("appointment_time, staff_id, service:services(duration)")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .in("status", ["confirmed", "pending"]) as { data: ExistingBookingRow[] | null };

  const toBooked = (rows: ExistingBookingRow[]) =>
    rows.map((b) => ({
      appointment_time: b.appointment_time,
      duration: Array.isArray(b.service) ? (b.service[0]?.duration || 30) : (b.service?.duration || 30),
    }));

  const bufferMinutes = (business?.buffer_minutes as number | null) ?? 0;
  const bizHours = business?.business_hours as BusinessHours | null;
  const allBookings = existingBookings || [];
  const staffChoice = !!business?.allow_staff_choice;

  // Intra-day time blocks for this date. staff_id null = whole-business (holiday/owner);
  // set = that staff's own block (break/vacation).
  const { data: blockRows } = await supabase
    .from("blocked_times")
    .select("start_time, end_time, staff_id")
    .eq("business_id", businessId)
    .eq("block_date", date) as { data: { start_time: string; end_time: string; staff_id: string | null }[] | null };
  const allBlocks = blockRows || [];

  const blockToBusy = (b: { start_time: string; end_time: string }) => {
    const [sh, sm] = b.start_time.split(":").map(Number);
    const [eh, em] = b.end_time.split(":").map(Number);
    return { appointment_time: b.start_time, duration: Math.max(0, (eh * 60 + em) - (sh * 60 + sm)) };
  };
  // Blocks applying to a scope: business-wide (null) always apply; staff-specific apply to that
  // staff. sid null (no staff scoping) = every block applies.
  const blocksFor = (sid: string | null) =>
    allBlocks.filter((b) => b.staff_id == null || sid == null || b.staff_id === sid).map(blockToBusy);

  let slots: string[];

  if (!staffChoice) {
    // Pre-staff behavior + business-wide blocks. Staff-specific blocks also apply (single calendar).
    slots = getSlots(requestedDate, duration, bizHours, [...toBooked(allBookings), ...blocksFor(null)], bufferMinutes);
  } else {
    // Load active staff with their own hours (working_hours overrides business hours when set).
    const { data: staffRows } = await supabase
      .from("staff")
      .select("id, working_hours")
      .eq("business_id", businessId)
      .neq("active", false) as { data: { id: string; working_hours: BusinessHours | null }[] | null };
    const hoursFor = (sid: string) =>
      ((staffRows || []).find((r) => r.id === sid)?.working_hours as BusinessHours | null) || bizHours;
    const busyFor = (sid: string) => [...toBooked(bookingsForStaff(allBookings, sid)), ...blocksFor(sid)];

    if (staffId) {
      slots = getSlots(requestedDate, duration, hoursFor(staffId), busyFor(staffId), bufferMinutes);
    } else {
      // "Any available" — eligible staff pool = service.staff_ids, else all active staff.
      let eligibleStaffIds: string[] = [];
      if (serviceId) {
        const { data: service } = await supabase.from("services").select("staff_ids").eq("id", serviceId).single();
        eligibleStaffIds = (service?.staff_ids as string[] | null) || [];
      }
      if (eligibleStaffIds.length === 0) {
        eligibleStaffIds = (staffRows || []).map((r) => r.id);
      }
      if (eligibleStaffIds.length === 0) {
        slots = getSlots(requestedDate, duration, bizHours, [...toBooked(allBookings), ...blocksFor(null)], bufferMinutes);
      } else {
        // A slot is offered if at least one eligible staff member is free at it (own hours + own blocks).
        const union = new Set<string>();
        for (const sid of eligibleStaffIds) {
          for (const s of getSlots(requestedDate, duration, hoursFor(sid), busyFor(sid), bufferMinutes)) union.add(s);
        }
        slots = Array.from(union).sort();
      }
    }
  }

  return NextResponse.json({ slots });
}
