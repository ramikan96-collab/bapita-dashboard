import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking, Business } from "@/types";

/**
 * Persist a booking's new date/time. Service, duration, status are untouched.
 * Shared by the drag-to-reschedule flow and the Reschedule sheet so both
 * behave identically. Returns a DB error message, or null on success.
 */
export async function rescheduleBooking(
  supabase: SupabaseClient,
  bookingId: string,
  newDate: string,
  newTime: string,
): Promise<{ error: string | null }> {
  // Only date + time — mirror the create path (new-booking). Do NOT write
  // appointment_datetime: the app never sets it on insert and it is either a
  // generated column or absent, so writing it makes Postgres reject the update.
  const { error } = await supabase
    .from("bookings")
    .update({
      appointment_date: newDate,
      appointment_time: newTime,
    })
    .eq("id", bookingId);
  if (error) console.error("rescheduleBooking failed:", error.message);
  return { error: error ? error.message : null };
}

/**
 * Fire the customer "rescheduled" notification. Fire-and-forget: the DB move
 * already stands, so a failed email must never block the UI. Server resolves
 * the business + recipient from businessId, so a null customer email is a
 * silent no-op on the route.
 */
export function sendRescheduleEmail(
  booking: Booking,
  oldDate: string,
  oldTime: string,
  newDate: string,
  newTime: string,
  business: Business | null,
): void {
  if (!booking.customer_email) return;
  fetch("/api/send-reschedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      serviceName: booking.service?.name ?? "",
      oldDate,
      oldTime,
      newDate,
      newTime,
      businessId: business?.id,
    }),
  }).catch(() => {
    /* non-blocking: the reschedule itself already persisted */
  });
}
