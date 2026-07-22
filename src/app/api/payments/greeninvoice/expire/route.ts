import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Releases slots held by unpaid deposit bookings. A booking left in
// payment_status='pending_payment' past the window is expired (slot freed).
// Called by a Vercel cron (see vercel.json). Also accepts a CRON_SECRET bearer
// for manual/local runs.
const EXPIRE_MINUTES = Number(process.env.DEPOSIT_EXPIRE_MINUTES || 15);

// Auth: only the CRON_SECRET bearer. Vercel injects `Authorization: Bearer
// $CRON_SECRET` into scheduled cron invocations when CRON_SECRET is set, so this
// covers the cron path too. We do NOT trust the `x-vercel-cron` header — it is
// client-spoofable and would let anyone force-expire pending bookings. Fail closed.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run() {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - EXPIRE_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", payment_status: "expired" })
    .eq("payment_status", "pending_payment")
    .lt("created_at", cutoff)
    .select("id");
  if (error) {
    console.error("expire pending bookings failed:", error);
    return NextResponse.json({ error: "expire failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, expired: data?.length ?? 0 });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return run();
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return run();
}
