import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface DayHours { open: boolean; start: string; end: string; }
interface BusinessHours { [key: string]: DayHours; }

function getSlots(
  date: Date,
  durationMinutes: number,
  businessHours: BusinessHours | null,
  booked: { appointment_time: string; duration: number }[]
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
    return { start, end: start + (b.duration || 30) };
  });

  const slots: string[] = [];
  for (let t = openMinutes; t + durationMinutes <= closeMinutes; t += durationMinutes) {
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

  if (!businessId || !date) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("business_hours")
    .eq("id", businessId)
    .single();

  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("appointment_time, service:services(duration)")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .in("status", ["confirmed", "pending"]);

  const booked = (existingBookings || []).map((b: { appointment_time: string; service: { duration: number } | { duration: number }[] | null }) => ({
    appointment_time: b.appointment_time,
    duration: Array.isArray(b.service) ? (b.service[0]?.duration || 30) : (b.service?.duration || 30),
  }));

  const dateObj = new Date(date + "T00:00:00");
  const dayKey = DAY_NAMES[dateObj.getDay()];
  const bh = business?.business_hours as BusinessHours | null;
  const slots = getSlots(dateObj, duration, bh, booked);

  return NextResponse.json({
    slots,
    _debug: {
      businessFound: !!business,
      bizError: bizError ? { code: bizError.code, message: bizError.message } : null,
      dayKey,
      dayHours: bh?.[dayKey as keyof BusinessHours] ?? null,
      duration,
      date,
      bookedCount: booked.length,
    },
  });
}
