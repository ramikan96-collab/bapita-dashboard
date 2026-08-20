import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPayment } from "@/lib/greeninvoice";
import { settlePaidBooking, type SettleBookingRow } from "@/lib/payment-settle";

// Green Invoice payment callback (the per-form `notifyUrl` — Green Invoice has
// no webhook subscription endpoint, verified 404 in sandbox).
//
// We NEVER trust this payload to mark a booking paid: it only tells us WHICH
// booking to look at. The money is confirmed by re-fetching the payment from
// Green Invoice with the business's own credentials (verifyPayment), and the
// settle step re-derives the expected amount server-side.
// Idempotent on transactions.provider_txn_id.

const BOOKING_SELECT =
  "id, business_id, payment_status, status, customer_name, customer_email, appointment_date, appointment_time, service:services(name, price, deposit_required, deposit_type, deposit_value)";

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
