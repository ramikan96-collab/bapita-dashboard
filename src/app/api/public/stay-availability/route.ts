import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { unavailableRanges, unavailableNights, type StayBookingRow } from "@/lib/stay";

/**
 * Unbookable nights for one unit of a stay business.
 *
 * GET /api/public/stay-availability?businessId=…&unitId=…
 *   -> { nights: ["2026-09-04", …], minNights, maxGuests }
 *
 * "nights" is a flat list the date picker greys out. Only CONFIRMED stays hold
 * inventory in phase 1 — a pending request is a request, not a reservation, so
 * two guests may ask for the same week and the host decides. This mirrors the
 * server-side guard in /api/public/book exactly (both call lib/stay.ts).
 *
 * Deliberately a separate route from /api/public/slots: appointments and stays
 * answer different questions, and keeping them apart means adding stays cannot
 * regress time-slot availability for the barbers already live on it.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const unitId     = searchParams.get("unitId");

  if (!businessId || !unitId) {
    return NextResponse.json({ error: "missing businessId or unitId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("business_type, blocked_dates")
    .eq("id", businessId)
    .single();

  if (!business || business.business_type !== "stay") {
    return NextResponse.json({ error: "not a stay business" }, { status: 400 });
  }

  // Unit must belong to this business — never let a caller probe another tenant.
  const { data: unit } = await supabase
    .from("services")
    .select("id, min_nights, max_guests")
    .eq("id", unitId)
    .eq("business_id", businessId)
    .single();

  if (!unit) {
    return NextResponse.json({ error: "invalid unit" }, { status: 400 });
  }

  // Everything still ahead of us. A stay that started before today but runs past
  // it still blocks, so filter on check_out, not on check-in.
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows } = await supabase
    .from("bookings")
    .select("appointment_date, check_out, service_id")
    .eq("business_id", businessId)
    .eq("service_id", unitId)
    .eq("status", "confirmed")
    .not("check_out", "is", null)
    .gte("check_out", today) as { data: StayBookingRow[] | null };

  const ranges = unavailableRanges(rows ?? [], business.blocked_dates as string[] | null, unitId);

  return NextResponse.json(
    {
      nights: unavailableNights(ranges).filter((n) => n >= today),
      minNights: unit.min_nights ?? 1,
      maxGuests: unit.max_guests ?? null,
    },
    // Short cache: availability changes on a human timescale, and this is hit
    // once per unit per modal open.
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } },
  );
}
