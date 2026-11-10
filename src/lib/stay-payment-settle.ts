// Settling a STAY payment made through a host pay link
// (spec: docs/specs/2026-11-10-stay-pay-link.md).
//
// Separate from settlePaidBooking (appointment deposits) on purpose: a stay's
// expected amount is whatever the host agreed on a link, links can be replaced
// or cancelled while a Green Invoice page is still open, and pending requests
// may overlap. The rules here:
//
// 1. Money that Green Invoice reports as paid is ALWAYS recorded (a
//    transactions row). It is never dropped because something else is off.
// 2. The booking is confirmed only when everything checks out: the amount
//    matches one of the booking's links, the booking is still open, it was not
//    paid already, and no other confirmed stay or blocked date holds the nights.
// 3. Otherwise the booking is marked as having money on it and the host gets an
//    alert email saying exactly what to sort out (usually a refund in Green Invoice).
//
// Callers must pass a payment VERIFIED against Green Invoice as a paid document
// (findPaidDocumentForBooking). providerTxnId is that document id in every path
// (callback, reconcile poll, checkout pre-check), so the unique
// (provider, provider_txn_id) index makes a second delivery a no-op.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaidStayDocument, VerifiedPayment } from "@/lib/greeninvoice";
import { sendPaidConfirmation } from "@/lib/payment-settle";
import { sendTenantMail } from "@/lib/mail";
import { formatIls } from "@/lib/payments";
import { rangesOverlap, unavailableRanges, type StayBookingRow } from "@/lib/stay";
import { LINK_SELECT, type PaymentLinkRow } from "@/lib/payment-links";

export type StaySettleResult =
  | { ok: true; paid: true; duplicate: boolean; confirmed: boolean; problem?: string }
  | { ok: true; paid: false; reason: string }
  | { ok: false; error: string };

const BOOKING_SELECT =
  "id, business_id, service_id, status, payment_status, customer_name, customer_email, customer_phone, appointment_date, appointment_time, check_out, service:services(name)";

interface StayRow {
  id: string;
  business_id: string;
  service_id: string | null;
  status: string;
  payment_status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  appointment_date: string;
  appointment_time: string | null;
  check_out: string | null;
  service: { name?: string | null } | { name?: string | null }[] | null;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Prefer the link the guest most likely paid: active, then paid, then the newest cancelled. */
function pickLink(links: PaymentLinkRow[], paid: number): PaymentLinkRow | null {
  const matching = links.filter((l) => Math.abs(Number(l.amount) - paid) <= 0.01);
  const rank = (l: PaymentLinkRow) => (l.status === "active" ? 0 : l.status === "paid" ? 1 : 2);
  matching.sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));
  return matching[0] ?? null;
}

export async function settleStayPayment(params: {
  supabase: SupabaseClient;
  bookingId: string;
  verified: VerifiedPayment;
  providerTxnId: string;
}): Promise<StaySettleResult> {
  const { supabase, bookingId, verified, providerTxnId } = params;
  if (!verified.paid) return { ok: true, paid: false, reason: "not paid" };
  if (!providerTxnId) return { ok: false, error: "missing provider id" };

  const paidAmount = Number(verified.amount);
  if (!(paidAmount > 0)) {
    // A paid document with no readable amount cannot be matched to an agreed
    // price. Record nothing automatically; Green Invoice still holds the money.
    console.error("stay payment without amount", { bookingId, providerTxnId });
    return { ok: true, paid: false, reason: "amount unknown" };
  }

  const { data: bookingData } = await supabase.from("bookings").select(BOOKING_SELECT).eq("id", bookingId).single();
  const booking = bookingData as unknown as StayRow | null;
  if (!booking || !booking.check_out) return { ok: false, error: "not a stay booking" };

  // 1. Record the money first. Idempotent on the provider id: a duplicate means
  //    this exact payment was already handled — stop here.
  const { error: txnErr } = await supabase.from("transactions").insert({
    business_id: booking.business_id,
    booking_id: booking.id,
    amount: paidAmount,
    currency: "ILS",
    provider: "greeninvoice",
    provider_txn_id: providerTxnId,
    invoice_url: verified.invoiceUrl || null,
    status: "paid",
  });
  const duplicate = !!txnErr && (txnErr as { code?: string }).code === "23505";
  if (txnErr && !duplicate) {
    console.error("stay transaction insert failed:", txnErr);
    return { ok: false, error: "failed to record transaction" };
  }
  // Already recorded. If the booking already reflects money, an earlier run
  // finished — stop. If it still shows none, an earlier run died between the
  // insert and the confirm: carry on and finish it.
  if (duplicate) {
    // Re-read: a parallel run (callback vs. success-page poll) may have just
    // finished with this same document.
    const { data: fresh } = await supabase.from("bookings").select("status, payment_status").eq("id", booking.id).single();
    if (!fresh || fresh.payment_status !== "none") {
      return { ok: true, paid: true, duplicate: true, confirmed: fresh?.status === "confirmed" };
    }
  }

  // 2. Decide whether this payment may confirm the booking.
  const { data: linkRows } = await supabase
    .from("payment_links")
    .select(LINK_SELECT)
    .eq("booking_id", booking.id);
  const links = ((linkRows ?? []) as PaymentLinkRow[]).map((l) => ({ ...l, amount: Number(l.amount) }));
  const link = pickLink(links, paidAmount);

  const { data: biz } = await supabase
    .from("businesses")
    .select("name, blocked_dates, notification_email, owner_email, default_lang")
    .eq("id", booking.business_id)
    .single();

  let problem: string | null = null;
  if (!link) {
    problem = `The amount paid (${formatIls(paidAmount)}) does not match any payment link on this booking.`;
  } else if (link.status === "cancelled") {
    problem = `The guest paid a payment link you had cancelled or replaced (${formatIls(paidAmount)}).`;
  } else if (booking.payment_status !== "none") {
    problem = `This booking was already paid — this is a second payment of ${formatIls(paidAmount)}.`;
  } else if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    problem = `The booking is marked "${booking.status}" but the guest paid ${formatIls(paidAmount)}.`;
  } else if (booking.service_id) {
    const { data: others } = await supabase
      .from("bookings")
      .select("appointment_date, check_out, service_id")
      .eq("business_id", booking.business_id)
      .eq("service_id", booking.service_id)
      .eq("status", "confirmed")
      .neq("id", booking.id)
      .not("check_out", "is", null);
    const blocked = unavailableRanges((others ?? []) as StayBookingRow[], biz?.blocked_dates as string[] | null, booking.service_id);
    const mine = { start: booking.appointment_date, end: booking.check_out };
    if (blocked.some((r) => rangesOverlap(mine, r))) {
      problem = "These nights are already taken by another confirmed booking or blocked in your calendar.";
    }
  }

  if (!problem) {
    // Conditional on still-unpaid: if a parallel delivery got here first with a
    // different document, that is a second real payment — handled below.
    const { data: claimed, error: claimErr } = await supabase
      .from("bookings")
      .update({ status: "confirmed", payment_status: "deposit_paid" })
      .eq("id", booking.id)
      .eq("payment_status", "none")
      .not("status", "in", "(cancelled,completed,no_show)")
      .select("id");
    if (claimErr) {
      // Transient DB failure: report it so the caller retries. The transaction
      // row is in, and the duplicate branch above resumes from here next time.
      console.error("stay confirm update failed:", claimErr);
      return { ok: false, error: "failed to confirm booking" };
    }
    if (!claimed || claimed.length === 0) {
      // Same document already handled by a parallel run → not a second payment.
      if (duplicate) return { ok: true, paid: true, duplicate: true, confirmed: true };
      problem = `This booking was already paid — this is a second payment of ${formatIls(paidAmount)}.`;
    }
  }

  if (!problem && link) {
    const nowIso = new Date().toISOString();
    await supabase.from("payment_links").update({ status: "paid", paid_at: nowIso }).eq("id", link.id);
    // Any other open link on this booking must stop taking money.
    await supabase.from("payment_links").update({ status: "cancelled" }).eq("booking_id", booking.id).eq("status", "active");

    const svc = Array.isArray(booking.service) ? booking.service[0] : booking.service;
    await sendPaidConfirmation({
      booking: {
        id: booking.id,
        business_id: booking.business_id,
        payment_status: "deposit_paid",
        status: "confirmed",
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        appointment_date: booking.appointment_date,
        appointment_time: booking.appointment_time,
        check_out: booking.check_out,
        service: null,
      },
      service: { name: svc?.name ?? "" },
      paidAmount,
      balanceDue: 0,
      invoiceUrl: verified.invoiceUrl || "",
      lang: link.lang === "he" ? "he" : "en",
    });
    return { ok: true, paid: true, duplicate, confirmed: true };
  }

  // 3. Money in, booking not confirmed. Make the money visible on the booking
  //    (only if it showed none) and tell the host.
  const { data: marked } = await supabase
    .from("bookings")
    .update({ payment_status: "deposit_paid" })
    .eq("id", booking.id)
    .eq("payment_status", "none")
    .select("id");
  // A re-delivered document that a parallel run already flagged must not alert
  // the host twice. A NEW document always alerts (e.g. a real second payment).
  if (duplicate && (!marked || marked.length === 0)) {
    return { ok: true, paid: true, duplicate: true, confirmed: false, problem: problem! };
  }
  if (link && link.status === "active") {
    await supabase.from("payment_links").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", link.id);
  }
  console.warn("stay payment needs host attention", { bookingId: booking.id, problem });
  await alertHost({
    businessId: booking.business_id,
    to: (biz?.notification_email as string | null) || (biz?.owner_email as string | null) || process.env.GMAIL_USER || "",
    bizName: (biz?.name as string | null) ?? "",
    guest: booking.customer_name ?? "",
    phone: booking.customer_phone ?? "",
    dates: `${booking.appointment_date} → ${booking.check_out}`,
    amount: formatIls(paidAmount),
    problem: problem!,
    invoiceUrl: verified.invoiceUrl || "",
  });
  return { ok: true, paid: true, duplicate, confirmed: false, problem: problem! };
}

/**
 * Settle every paid document found for a stay booking. Each is its own
 * transaction (idempotent on its document id), so a guest who paid twice gets
 * both payments recorded and the host is alerted about the second.
 */
export async function settleStayDocuments(
  supabase: SupabaseClient,
  bookingId: string,
  docs: PaidStayDocument[],
): Promise<{ ok: boolean; anyPaid: boolean }> {
  let ok = true;
  let anyPaid = false;
  // Oldest first, so the first payment is the one that confirms.
  for (const doc of [...docs].reverse()) {
    const r = await settleStayPayment({ supabase, bookingId, verified: doc, providerTxnId: doc.docKey });
    if (!r.ok) ok = false;
    else if (r.paid) anyPaid = true;
  }
  return { ok, anyPaid };
}

async function alertHost(a: {
  businessId: string; to: string; bizName: string; guest: string; phone: string;
  dates: string; amount: string; problem: string; invoiceUrl: string;
}): Promise<void> {
  if (!a.to) return;
  try {
    await sendTenantMail({
      businessId: a.businessId,
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: a.to,
      subject: `⚠️ Payment needs your attention — ${a.guest} ${a.amount}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 8px;">A guest paid, but the booking was NOT confirmed</h2>
          <p style="margin:0 0 16px;color:#555;">${esc(a.problem)}</p>
          <div style="background:#FAF5EC;border-radius:12px;padding:20px;">
            <div style="margin-bottom:8px;"><strong>Business:</strong> ${esc(a.bizName)}</div>
            <div style="margin-bottom:8px;"><strong>Guest:</strong> ${esc(a.guest)} ${esc(a.phone)}</div>
            <div style="margin-bottom:8px;"><strong>Dates:</strong> ${esc(a.dates)}</div>
            <div style="margin-bottom:8px;"><strong>Paid:</strong> ${esc(a.amount)}</div>
            ${a.invoiceUrl ? `<div><a href="${esc(a.invoiceUrl)}">Receipt in Green Invoice</a></div>` : ""}
          </div>
          <p style="margin:16px 0 0;color:#555;">Decide in the dashboard: confirm the booking yourself, or refund the guest in Green Invoice.</p>
        </div>`,
    });
  } catch (e) {
    console.error("host payment alert failed:", e);
  }
}
