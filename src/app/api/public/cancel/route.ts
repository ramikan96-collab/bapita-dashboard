import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

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
    .select("customer_name, business_id, appointment_date, appointment_time")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "booking not found or already cancelled" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
