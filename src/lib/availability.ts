import { format } from "date-fns";
import type { BusinessHours, DayKey } from "@/types";

const DAY_NAMES: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export interface TimeSlot {
  /** "HH:mm" */
  time: string;
  available: boolean;
}

export interface ExistingBooking {
  appointment_time: string; // "HH:mm" or "HH:mm:ss"
  service?: { duration: number } | null;
}

/**
 * Build the list of time slots for a day.
 *
 * - Slots step by the chosen service duration, within business hours.
 * - A slot overlapping an existing (non-cancelled) booking is marked unavailable.
 * - On today, slots whose start time has already passed are filtered out entirely.
 * - Returns [] when the business is closed that day (caller shows "no times" state).
 */
export function getAvailableSlots(
  date: Date,
  durationMinutes: number,
  businessHours: BusinessHours | undefined | null,
  existingBookings: ExistingBooking[],
  now: Date = new Date()
): TimeSlot[] {
  const dayKey = DAY_NAMES[date.getDay()];
  const dayHours = businessHours?.[dayKey];

  // No hours configured at all → fall back to a sane default. Closed day → [].
  const start = dayHours?.open ? dayHours.start : dayHours ? null : "09:00";
  const end = dayHours?.open ? dayHours.end : dayHours ? null : "19:00";
  if (!start || !end) return [];

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const openMinutes = startH * 60 + startM;
  const closeMinutes = endH * 60 + endM;

  const bookedRanges = existingBookings.map((b) => {
    const [h, m] = b.appointment_time.split(":").map(Number);
    const s = h * 60 + m;
    return { start: s, end: s + (b.service?.duration ?? 30) };
  });

  const isToday = format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: TimeSlot[] = [];
  for (let t = openMinutes; t + durationMinutes <= closeMinutes; t += durationMinutes) {
    // Past times today: drop them, never show a slot that can't be booked.
    if (isToday && t <= nowMinutes) continue;

    const overlaps = bookedRanges.some((r) => t < r.end && t + durationMinutes > r.start);
    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    slots.push({ time: `${hh}:${mm}`, available: !overlaps });
  }

  return slots;
}
