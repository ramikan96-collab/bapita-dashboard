import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { findPaidDocumentForBooking, documentIdOf } from "@/lib/greeninvoice";
import { settlePaidBooking, type SettleBookingRow } from "@/lib/payment-settle";
import { holdIsLive } from "@/lib/payment-holds";

// Public payment status for one booking, polled by /pay/success.
//
// Why this exists: the customer comes back from Green Invoice's hosted page
// before (or instead of) the notifyUrl callback. If the callback is late, lost,
// or blocked, a customer who really paid would otherwise watch their booking
// expire. So this endpoint also RECONCILES — it asks Green Invoice whether a
// paid document exists for this booking and settles it if so.
//
// Safe to expose: the booking id is an unguessable uuid, the response carries no
// personal data (no name, phone, email), and the reconcile can only ever confirm
// a payment that Green Invoice itself reports as paid for this exact booking.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BOOKING_SELECT =
  "id, business_id, payment_status, status, created_at, customer_name, customer_email, appointment_date, appointment_time, service:services(name, price, deposit_required, deposit_type, deposit_value)";

// Throttle: at most one Green Invoice reconcile per booking per 4s, no matter
// how fast the page polls.
const lastReconcile = new Map<string, number>();
const RECONCILE_MIN_MS = 4000;

function mayReconcile(bookingId: string): boolean {
  const now = Date.now();
  const prev = lastReconcile.get(bookingId) ?? 0;
  if (now - prev < RECONCILE_MIN_MS) return false;
  lastReconcile.set(bookingId, now);
  // Keep the map from growing without bound on a long-lived instance.
  if (lastReconcile.size > 500) {
    for (const [k, t] of lastReconcile) {
      if (now - t > 60_000) lastReconcile.delete(k);
    }
  }
  return true;
}

export async function GET(req: NextRequest) {
  const bookingId = new URL(req.url).searchParams.get("b") || "";
  if (!UUID_RE.test(bookingId)) {
    return NextResponse.json({ status: "unknown" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase.from("bookings").select(BOOKING_SELECT).eq("id", bookingId).single();
  // A missing booking means the unpaid hold was already swept (expired holds are
  // deleted, not kept). Report that rather than leaving the page spinning.
  if (!data) return NextResponse.json({ status: "expired" }, { status: 200 });

  const booking = data as unknown as SettleBookingRow & { created_at: string | null };

  const paidResponse = async () => {
    const { data: txn } = await supabase
      .from("transactions")
      .select("amount, invoice_url")
      .eq("booking_id", bookingId)
      .eq("status", "paid")
      .maybeSingle();
    return NextResponse.json({
      status: "paid",
      amountPaid: txn?.amount ?? null,
      invoiceUrl: txn?.invoice_url ?? null,
    });
  };

  if (booking.payment_status === "deposit_paid") return paidResponse();

  if (booking.payment_status === "pending_payment") {
    if (mayReconcile(bookingId)) {
      try {
        const verified = await findPaidDocumentForBooking(booking.business_id, bookingId);
        if (verified?.paid) {
          const result = await settlePaidBooking({
            supabase,
            booking,
            verified,
            providerTxnId: documentIdOf(verified.raw) || `${bookingId}:reconciled`,
          });
          if (result.ok && result.paid) return paidResponse();
        }
      } catch (e) {
        // A reconcile failure must never break the page — the customer simply
        // keeps seeing "waiting for confirmation".
        console.error("reconcile failed:", e);
      }
    }

    // Still unpaid: report whether the hold is alive so the page can stop polling.
    const live = holdIsLive({ payment_status: booking.payment_status, created_at: booking.created_at });
    return NextResponse.json({ status: live ? "pending" : "expired" });
  }

  if (booking.payment_status === "expired" || booking.status === "cancelled") {
    return NextResponse.json({ status: "expired" });
  }

  return NextResponse.json({ status: booking.status === "confirmed" ? "confirmed" : "pending" });
}
