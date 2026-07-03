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
  const hours = business?.business_hours as BusinessHours | null;
  const allBookings = existingBookings || [];

  // Staff-scoped availability only applies when the business enabled customer staff choice.
  // Otherwise behaviour is identical to pre-staff: global booking overlap, staff ignored.
  const staffChoice = !!business?.allow_staff_choice;

  let slots: string[];

  if (!staffChoice) {
    slots = getSlots(requestedDate, duration, hours, toBooked(allBookings), bufferMinutes);
  } else if (staffId) {
    // A specific staff member was chosen — availability is scoped to their bookings only.
    const staffBookings = bookingsForStaff(allBookings, staffId);
    slots = getSlots(requestedDate, duration, hours, toBooked(staffBookings), bufferMinutes);
  } else {
    // "Any available" — determine the eligible staff pool (service.staff_ids, or all active staff).
    let eligibleStaffIds: string[] = [];
    if (serviceId) {
      const { data: service } = await supabase
        .from("services")
        .select("staff_ids")
        .eq("id", serviceId)
        .single();
      eligibleStaffIds = (service?.staff_ids as string[] | null) || [];
    }
    if (eligibleStaffIds.length === 0) {
      const { data: activeStaff } = await supabase
        .from("staff")
        .select("id")
        .eq("business_id", businessId)
        .neq("active", false);
      eligibleStaffIds = (activeStaff || []).map((s) => s.id as string);
    }

    if (eligibleStaffIds.length === 0) {
      // No staff configured for this business — identical to pre-staff behavior.
      slots = getSlots(requestedDate, duration, hours, toBooked(allBookings), bufferMinutes);
    } else {
      // Union: a slot is offered if at least one eligible staff member is free at it.
      const union = new Set<string>();
      for (const sid of eligibleStaffIds) {
        const staffBookings = bookingsForStaff(allBookings, sid);
        for (const s of getSlots(requestedDate, duration, hours, toBooked(staffBookings), bufferMinutes)) {
          union.add(s);
        }
      }
      slots = Array.from(union).sort();
    }
  }

  return NextResponse.json({ slots });
}
