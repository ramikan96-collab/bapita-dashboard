import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPayment, findPaidDocumentsForBooking } from "@/lib/greeninvoice";
import { settlePaidBooking, type SettleBookingRow } from "@/lib/payment-settle";
import { settleStayDocuments } from "@/lib/stay-payment-settle";

// Green Invoice payment callback (the per-form `notifyUrl` — Green Invoice has
// no webhook subscription endpoint, verified 404 in sandbox).
//
// We NEVER trust this payload to mark a booking paid: it only tells us WHICH
// booking to look at. The money is confirmed by re-fetching the payment from
// Green Invoice with the business's own credentials (verifyPayment), and the
// settle step re-derives the expected amount server-side.
// Idempotent on transactions.provider_txn_id.

const BOOKING_SELECT =
  "id, business_id, payment_status, status, customer_name, customer_email, appointment_date, appointment_time, check_out, service:services(name, price, deposit_required, deposit_type, deposit_value)";

// Per-instance throttle for the stay branch (see POST).
const lastLookup = new Map<string, number>();
const LOOKUP_MIN_MS = 4000;
function mayLookUp(bookingId: string): boolean {
  const now = Date.now();
  if (now - (lastLookup.get(bookingId) ?? 0) < LOOKUP_MIN_MS) return false;
  lastLookup.set(bookingId, now);
  if (lastLookup.size > 500) {
    for (const [k, t] of lastLookup) if (now - t > 60_000) lastLookup.delete(k);
  }
  return true;
}

async function readPayload(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await req.json();
    const form = await req.formData();
    return Object.fromEntries([...form.entries()]);
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const payload = await readPayload(req);

  // The booking id was passed as `custom` when creating the form; the GI txn id
  // arrives under one of these common keys. Read defensively.
  const bookingId = String(payload.custom ?? payload.bookingId ?? "");
  const providerTxnId = String(
    payload.id ?? payload.paymentId ?? payload.transactionId ?? payload.docId ?? ""
  );

  if (!bookingId) {
    // Nothing we can correlate — ack so GI stops retrying.
    return NextResponse.json({ ok: true, ignored: "no booking reference" });
  }

  const supabase = createServiceClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ ok: true, ignored: "unknown booking" });

  // Stays (host pay links): never trust the callback's payment id. Look up the
  // PAID DOCUMENT for this booking — a receipt exists only for money that
  // landed — and settle on its document id, the same id every other path uses.
  if ((booking as SettleBookingRow).check_out) {
    // This endpoint is public. Only stays that actually had a pay link can be
    // waiting for a payment, and each booking may trigger at most one Green
    // Invoice lookup per few seconds — a script replaying a booking id must not
    // burn the business's Green Invoice quota.
    const { count } = await supabase
      .from("payment_links")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId);
    if (!count) return NextResponse.json({ ok: true, ignored: "no pay link" });
    if (!mayLookUp(bookingId)) {
      // 429 so a genuine Green Invoice delivery retries; the success-page poll
      // is the safety net either way.
      return NextResponse.json({ error: "slow down" }, { status: 429 });
    }
    try {
      const docs = await findPaidDocumentsForBooking((booking as SettleBookingRow).business_id, bookingId);
      if (docs.length === 0) {
        // The receipt may not be searchable yet. 503 asks Green Invoice to
        // retry; the success-page poll and the daily sweep also catch it.
        return NextResponse.json({ ok: true, paid: false, retry: true }, { status: 503 });
      }
      const r = await settleStayDocuments(supabase, bookingId, docs);
      if (!r.ok) return NextResponse.json({ error: "settle failed" }, { status: 500 });
      return NextResponse.json({ ok: true, paid: r.anyPaid });
    } catch (e) {
      // 500 so Green Invoice retries; the success-page poll is the safety net.
      console.error("stay callback failed:", e);
      return NextResponse.json({ error: "temporary failure" }, { status: 500 });
    }
  }

  let verified = null;
  try {
    verified = providerTxnId
      ? await verifyPayment((booking as SettleBookingRow).business_id, providerTxnId)
      : null;
  } catch (e) {
    console.error("verifyPayment threw:", e);
  }

  if (!verified || !verified.paid) {
    // Not confirmed paid — ack without changing state (GI may retry / customer
    // abandoned). The reconcile path on /pay/success is the safety net.
    return NextResponse.json({ ok: true, paid: false });
  }

  const result = await settlePaidBooking({
    supabase,
    booking: booking as unknown as SettleBookingRow,
    verified,
    providerTxnId,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result);
}
