import { NextRequest, NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { pushBookingCancelled } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("cancel_token", token)
    .in("status", ["confirmed", "pending"])
    .select("customer_name, business_id, appointment_date, appointment_time, staff_id, google_cal_event_id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "booking not found or already cancelled" }, { status: 404 });
  }

  // Remove the Google Calendar event (Phase 0) — best-effort, never blocks cancellation.
  if (data.google_cal_event_id) {
    const { business_id, staff_id, google_cal_event_id } = data;
    after(() =>
      pushBookingCancelled(supabase, business_id, staff_id, google_cal_event_id).catch((e) =>
        console.error("Google Calendar cancel-sync failed:", e)
      )
    );
  }

  return NextResponse.json({ ok: true });
}
