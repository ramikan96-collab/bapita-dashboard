import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sweepExpiredDemos } from "@/lib/outreach/sweep";
import { findPaidDocumentsForBooking } from "@/lib/greeninvoice";
import { settleStayDocuments } from "@/lib/stay-payment-settle";

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
  // Delete rather than cancel: `bookings_slot_unique` ignores status, so a
  // cancelled hold would keep its slot unbookable forever. Availability reads
  // already ignore expired holds (lib/payment-holds.ts), so this cron is only a
  // janitor — correctness does not depend on how often it runs.
  const { data, error } = await supabase
    .from("bookings")
    .delete()
    .eq("payment_status", "pending_payment")
    .lt("created_at", cutoff)
    .select("id");
  if (error) {
    console.error("expire pending bookings failed:", error);
    return NextResponse.json({ error: "expire failed" }, { status: 500 });
  }

  // The demo sweep rides this cron rather than adding its own. The Vercel account is on Hobby,
  // which rejects more than one cron a day and fails the WHOLE deploy before building — so a
  // second entry in vercel.json would take the site down, not just skip the job.
  //
  // It is deliberately non-fatal: expiring deposit holds frees booking slots and must not be
  // blocked by a janitor for sales demos.
  let demos: Awaited<ReturnType<typeof sweepExpiredDemos>> | { error: string };
  try {
    demos = await sweepExpiredDemos();
  } catch (e) {
    console.error("demo sweep failed (deposit expiry still ran):", e);
    demos = { error: String(e) };
  }

  // Stay pay links: catch a payment whose callback never landed and whose guest
  // closed the tab before the success page could reconcile. Same non-fatal rule.
  let stays: { checked: number; settled: number } | { error: string };
  try {
    stays = await sweepStayPayments(supabase);
  } catch (e) {
    console.error("stay payment sweep failed:", e);
    stays = { error: String(e) };
  }

  return NextResponse.json({ ok: true, expired: data?.length ?? 0, demos, stays });
}

async function sweepStayPayments(supabase: ReturnType<typeof createServiceClient>) {
  const since = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString();
  // Newest first, unpaid bookings only, and a time budget so one daily run can
  // never eat the whole function limit on Green Invoice lookups.
  const started = Date.now();
  const BUDGET_MS = 40_000;
  const { data: links } = await supabase
    .from("payment_links")
    .select("booking_id, business_id, booking:bookings!inner(payment_status)")
    .eq("booking.payment_status", "none")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  const seen = new Set<string>();
  let checked = 0, settled = 0;
  for (const l of links ?? []) {
    if (seen.has(l.booking_id as string)) continue;
    seen.add(l.booking_id as string);
    if (++checked > 50 || Date.now() - started > BUDGET_MS) break;
    try {
      const docs = await findPaidDocumentsForBooking(l.business_id as string, l.booking_id as string);
      if (docs.length) {
        const r = await settleStayDocuments(supabase, l.booking_id as string, docs);
        if (r.anyPaid) settled++;
      }
    } catch (e) {
      console.error("stay sweep: lookup failed for booking", l.booking_id, e);
    }
  }
  return { checked: Math.min(checked, 50), settled };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return run();
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return run();
}
