// Settling a paid booking — the single implementation shared by the Green
// Invoice callback (notifyUrl) and the /pay/success reconcile path.
//
// Both callers must apply identical binding and amount checks, so the logic
// lives here rather than being copied. Callers are responsible for having
// VERIFIED the payment against Green Invoice first (verifyPayment /
// findPaidDocumentForBooking); this module never trusts a raw callback body.

import type { SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { bookingRemark, type VerifiedPayment } from "@/lib/greeninvoice";
import { resolvePayment, formatIls } from "@/lib/payments";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export interface SettleBookingRow {
  id: string;
  business_id: string;
  payment_status: string | null;
  status: string | null;
  customer_name: string | null;
  customer_email: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  service: ServiceRow | ServiceRow[] | null;
}

interface ServiceRow {
  name?: string | null;
  price?: number | null;
  deposit_required?: boolean | null;
  deposit_type?: string | null;
  deposit_value?: number | null;
}

export type SettleResult =
  | { ok: true; paid: true; duplicate: boolean }
  | { ok: true; paid: false; reason: string }
  | { ok: false; error: string };

/**
 * Confirm a booking whose deposit/full payment has been verified with Green
 * Invoice. Idempotent: a second delivery for the same provider_txn_id updates
 * nothing and sends no second email.
 */
export async function settlePaidBooking(params: {
  supabase: SupabaseClient;
  booking: SettleBookingRow;
  verified: VerifiedPayment;
  providerTxnId: string;
}): Promise<SettleResult> {
  const { supabase, booking, verified, providerTxnId } = params;

  if (booking.payment_status === "deposit_paid") {
    return { ok: true, paid: true, duplicate: true };
  }

  // ── Binding: this payment must belong to THIS booking ─────────────────────
  // Green Invoice echoes our `custom` on the callback, but issued DOCUMENTS
  // carry no custom field (verified in sandbox) — so the remarks we wrote when
  // creating the form ("Booking <uuid>") are the durable binding. Accept when
  // either proves the link; reject when neither does. A booking uuid is
  // unguessable, so a forged callback cannot satisfy either check.
  const marker = bookingRemark(booking.id);
  const refMatches = String(verified.customRef ?? "") === String(booking.id);
  const remarkMatches = String(verified.remarks ?? "").trim() === marker;
  if (!refMatches && !remarkMatches) {
    console.warn("payment/booking binding failed", {
      bookingId: booking.id,
      customRef: verified.customRef,
      remarks: verified.remarks,
    });
    return { ok: true, paid: false, reason: "reference mismatch" };
  }

  // ── Amount: re-derive server-side; a caller cannot under-pay and confirm ───
  const svcRow = Array.isArray(booking.service) ? booking.service[0] : booking.service;
  const { data: bizDep } = await supabase
    .from("businesses")
    .select("deposit_enabled, deposit_default_type, deposit_default_value, default_lang")
    .eq("id", booking.business_id)
    .single();

  const expectedPayment = resolvePayment(svcRow ?? null, bizDep ?? null, true);
  const expected = expectedPayment.amountDue;
  if (expected > 0 && verified.amount != null && Math.abs(Number(verified.amount) - expected) > 1) {
    console.warn("payment amount mismatch", { bookingId: booking.id, expected, got: verified.amount });
    return { ok: true, paid: false, reason: "amount mismatch" };
  }

  const txnId = providerTxnId || `${booking.id}:${Date.now()}`;

  // Idempotent transaction insert. A duplicate means another delivery won.
  const { error: txnErr } = await supabase.from("transactions").insert({
    business_id: booking.business_id,
    booking_id: booking.id,
    amount: verified.amount ?? expected,
    currency: "ILS",
    provider: "greeninvoice",
    provider_txn_id: txnId,
    invoice_url: verified.invoiceUrl || null,
    status: "paid",
  });

  const duplicate = !!txnErr && (txnErr as { code?: string }).code === "23505";
  if (txnErr && !duplicate) {
    console.error("transaction insert failed:", txnErr);
    return { ok: false, error: "failed to record transaction" };
  }

  await supabase
    .from("bookings")
    .update({ status: "confirmed", payment_status: "deposit_paid" })
    .eq("id", booking.id);

  if (!duplicate) {
    await sendPaidConfirmation({
      booking,
      service: svcRow ?? null,
      paidAmount: Number(verified.amount ?? expected) || 0,
      balanceDue: expectedPayment.balanceDue,
      invoiceUrl: verified.invoiceUrl || "",
      lang: (bizDep?.default_lang as string | null) === "he" ? "he" : "en",
    });
  }

  return { ok: true, paid: true, duplicate };
}

/**
 * Payment confirmation email. Separate from the no-deposit confirmation in
 * api/public/book because it must state what was paid and what is still owed at
 * the business — the single most common support question after online payment.
 */
async function sendPaidConfirmation(p: {
  booking: SettleBookingRow;
  service: ServiceRow | null;
  paidAmount: number;
  balanceDue: number;
  invoiceUrl: string;
  lang: "he" | "en";
}): Promise<void> {
  const email = p.booking.customer_email;
  const valid = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!email || !valid) return;

  const time = String(p.booking.appointment_time ?? "").slice(0, 5);
  const serviceName = p.service?.name ?? "";
  const paid = formatIls(p.paidAmount);
  const balance = formatIls(p.balanceDue);
  const invoiceLink = p.invoiceUrl ? esc(p.invoiceUrl) : "";

  const he = p.lang === "he";
  const subject = he ? "התשלום התקבל וההזמנה אושרה" : "Payment received — booking confirmed";
  const dir = he ? "direction:rtl;text-align:right;" : "";

  const rows = he
    ? `
        <div style="margin-bottom:8px;"><strong>שירות:</strong> ${esc(serviceName)}</div>
        <div style="margin-bottom:8px;"><strong>תאריך:</strong> ${esc(p.booking.appointment_date)}</div>
        <div style="margin-bottom:8px;"><strong>שעה:</strong> ${esc(time)}</div>
        <div style="margin-bottom:8px;"><strong>שולם עכשיו:</strong> ${esc(paid)}</div>
        ${p.balanceDue > 0 ? `<div><strong>יתרה לתשלום בעסק:</strong> ${esc(balance)}</div>` : `<div><strong>שולם במלואו</strong></div>`}
        ${invoiceLink ? `<div style="margin-top:8px;"><a href="${invoiceLink}">חשבונית</a></div>` : ""}`
    : `
        <div style="margin-bottom:8px;"><strong>Service:</strong> ${esc(serviceName)}</div>
        <div style="margin-bottom:8px;"><strong>Date:</strong> ${esc(p.booking.appointment_date)}</div>
        <div style="margin-bottom:8px;"><strong>Time:</strong> ${esc(time)}</div>
        <div style="margin-bottom:8px;"><strong>Paid now:</strong> ${esc(paid)}</div>
        ${p.balanceDue > 0 ? `<div><strong>Due at the business:</strong> ${esc(balance)}</div>` : `<div><strong>Paid in full</strong></div>`}
        ${invoiceLink ? `<div style="margin-top:8px;"><a href="${invoiceLink}">View invoice</a></div>` : ""}`;

  const intro = he
    ? `שלום ${esc(p.booking.customer_name)}, התשלום התקבל והתור אושר.`
    : `Hi ${esc(p.booking.customer_name)}, your payment went through and your appointment is confirmed.`;

  try {
    await transporter.sendMail({
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;${dir}">
          <h2 style="margin:0 0 8px;">${he ? "התשלום התקבל ✅" : "Payment received ✅"}</h2>
          <p style="color:#555;margin:0 0 24px;">${intro}</p>
          <div style="background:#FAF5EC;border-radius:12px;padding:20px;">${rows}</div>
        </div>
      `,
    });
  } catch (e) {
    console.error("payment confirmation email failed:", e);
  }
}
