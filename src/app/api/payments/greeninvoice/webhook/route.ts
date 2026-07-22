import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPayment } from "@/lib/greeninvoice";
import nodemailer from "nodemailer";

// Green Invoice payment callback (notifyUrl). We NEVER trust this payload to
// mark a booking paid — we re-fetch the transaction from GI with the business's
// own credentials (verifyPayment). Idempotent on transactions.provider_txn_id.

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function readPayload(req: NextRequest): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") || "";
  try {
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
    .select("id, business_id, payment_status, status, customer_name, customer_email, appointment_date, appointment_time, service:services(name, price, deposit_required, deposit_type, deposit_value)")
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ ok: true, ignored: "unknown booking" });

  // Already settled → idempotent no-op.
  if (booking.payment_status === "deposit_paid") {
    return NextResponse.json({ ok: true, already: true });
  }

  // Verify by re-fetching from Green Invoice.
  let verified: Awaited<ReturnType<typeof verifyPayment>> = null;
  try {
    verified = providerTxnId
      ? await verifyPayment(booking.business_id, providerTxnId)
      : null;
  } catch (e) {
    console.error("verifyPayment threw:", e);
  }

  if (!verified || !verified.paid) {
    // Not confirmed paid — ack without changing state (GI may retry / customer abandoned).
    return NextResponse.json({ ok: true, paid: false });
  }

  // SECURITY: bind the verified payment to THIS booking. The `custom` value we
  // passed when creating the form was the booking id; GI echoes it back on the
  // payment record. Without this, a real payment for booking A could be replayed
  // to confirm booking B in the same business. Fail closed on mismatch.
  if (String(verified.customRef ?? "") !== String(booking.id)) {
    console.warn("webhook payment/booking mismatch", { bookingId: booking.id, customRef: verified.customRef });
    return NextResponse.json({ ok: true, paid: false, reason: "reference mismatch" });
  }

  // SECURITY: re-derive the expected deposit server-side and reject if the paid
  // amount doesn't match (a caller cannot under-pay and still confirm).
  const svcRow = Array.isArray(booking.service) ? booking.service[0] : booking.service;
  const { data: bizDep } = await supabase
    .from("businesses")
    .select("deposit_default_type, deposit_default_value")
    .eq("id", booking.business_id)
    .single();
  const dType = (svcRow?.deposit_type as string | null) || (bizDep?.deposit_default_type as string | null) || "percent";
  const dRaw = svcRow?.deposit_value != null ? Number(svcRow.deposit_value) : Number(bizDep?.deposit_default_value ?? 0);
  const price = Number(svcRow?.price ?? 0);
  const expected = Math.round((dType === "percent" ? (price * dRaw) / 100 : dRaw) * 100) / 100;
  if (expected > 0 && verified.amount != null && Math.abs(Number(verified.amount) - expected) > 1) {
    console.warn("webhook deposit amount mismatch", { bookingId: booking.id, expected, got: verified.amount });
    return NextResponse.json({ ok: true, paid: false, reason: "amount mismatch" });
  }

  const txnId = providerTxnId || `${bookingId}:${Date.now()}`;

  // Idempotent transaction insert. If it already exists, another delivery won.
  const { error: txnErr } = await supabase.from("transactions").insert({
    business_id: booking.business_id,
    booking_id: booking.id,
    amount: verified.amount ?? 0,
    currency: "ILS",
    provider: "greeninvoice",
    provider_txn_id: txnId,
    invoice_url: verified.invoiceUrl ?? null,
    status: "paid",
  });

  const duplicate = txnErr && (txnErr as { code?: string }).code === "23505";
  if (txnErr && !duplicate) {
    console.error("transaction insert failed:", txnErr);
    return NextResponse.json({ error: "failed to record transaction" }, { status: 500 });
  }

  // Confirm the booking.
  await supabase
    .from("bookings")
    .update({ status: "confirmed", payment_status: "deposit_paid" })
    .eq("id", booking.id);

  // Send the confirmation email only on the first (non-duplicate) settle.
  if (!duplicate) {
    const svc = Array.isArray(booking.service) ? booking.service[0] : booking.service;
    const email = booking.customer_email as string | null;
    const emailValid = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (email && emailValid) {
      try {
        await transporter.sendMail({
          from: `Bapita <${process.env.GMAIL_USER}>`,
          to: email,
          subject: `התשלום התקבל וההזמנה אושרה`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;direction:rtl;text-align:right;">
              <h2 style="margin:0 0 8px;">התשלום התקבל ✅</h2>
              <p style="color:#555;margin:0 0 24px;">שלום ${esc(booking.customer_name)}, המקדמה שולמה והתור אושר.</p>
              <div style="background:#FAF5EC;border-radius:12px;padding:20px;">
                <div style="margin-bottom:8px;"><strong>שירות:</strong> ${esc(svc?.name ?? "")}</div>
                <div style="margin-bottom:8px;"><strong>תאריך:</strong> ${esc(booking.appointment_date)}</div>
                <div style="margin-bottom:8px;"><strong>שעה:</strong> ${esc(String(booking.appointment_time).slice(0, 5))}</div>
                <div><strong>מקדמה ששולמה:</strong> ₪${esc(verified.amount ?? "")}</div>
                ${verified.invoiceUrl ? `<div style="margin-top:8px;"><a href="${esc(verified.invoiceUrl)}">חשבונית</a></div>` : ""}
              </div>
            </div>
          `,
        });
      } catch (e) {
        console.error("deposit confirmation email failed:", e);
      }
    }
  }

  return NextResponse.json({ ok: true, paid: true, duplicate });
}
