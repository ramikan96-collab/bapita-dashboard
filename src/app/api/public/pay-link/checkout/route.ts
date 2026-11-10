import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPaymentForm, bookingRemark, findPaidDocumentsForBooking } from "@/lib/greeninvoice";
import type { SettleBookingRow } from "@/lib/payment-settle";
import { settleStayDocuments } from "@/lib/stay-payment-settle";
import { linkState, loadLinkByToken, payLinkUrl } from "@/lib/payment-links";
import { rangesOverlap, unavailableRanges, type StayBookingRow } from "@/lib/stay";
import { bookingUrl } from "@/lib/site-url";

// Guest presses "Pay" on /pay/l/<token>. A plain form POST, so it works with no
// client JS. Everything is re-checked here, server-side, at the moment of
// payment — the page the guest saw may be hours old.
//
// SECURITY
// - The amount comes from the payment_links row only. Nothing in the request
//   body except the token is read.
// - A paid document for this booking is looked up FIRST, so a guest who already
//   paid (and pressed back, or opened the link twice) is settled, not charged again.
// - Another confirmed booking on the same unit and dates blocks the charge.
// - Redirects only to the https form URL Green Invoice returned, or our own pages.

const BOOKING_SELECT =
  "id, business_id, service_id, payment_status, status, customer_name, customer_email, appointment_date, appointment_time, check_out, service:services(name, price, deposit_required, deposit_type, deposit_value)";

// Throttle Green Invoice form creation per link (per instance): a double click or
// a refresh loop must not open a pile of payment forms.
const lastCheckout = new Map<string, number>();
const CHECKOUT_MIN_MS = 5000;

function back(token: string, state?: string): NextResponse {
  const url = payLinkUrl(token) + (state ? `?e=${encodeURIComponent(state)}` : "");
  return NextResponse.redirect(url, 303);
}

// The form URL comes from Green Invoice's API over TLS with our own credentials.
// Its exact host is only known once a live terminal answers (sandbox has none),
// so require https rather than pin a hostname that might be wrong.
function isHttpsUrl(u: string): boolean {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");

  const supabase = createServiceClient();
  const link = await loadLinkByToken(supabase, token);
  if (!link) return NextResponse.redirect(bookingUrl("/"), 303);

  const { data: bookingData } = await supabase.from("bookings").select(BOOKING_SELECT).eq("id", link.booking_id).single();
  const booking = bookingData as unknown as (SettleBookingRow & { service_id: string | null }) | null;
  if (!booking || booking.business_id !== link.business_id) return back(token, "closed");

  const { data: biz } = await supabase.from("businesses").select("name, slug").eq("id", link.business_id).single();
  const lang = link.lang === "he" ? "he" : "en";
  const successUrl = bookingUrl(`/pay/success?b=${booking.id}&lang=${lang}${biz?.slug ? `&s=${biz.slug}` : ""}`);

  if (booking.payment_status === "deposit_paid" || link.status === "paid") {
    return NextResponse.redirect(successUrl, 303);
  }
  const state = linkState(link);
  if (state !== "payable") return back(token);
  if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "no_show" || booking.payment_status !== "none") {
    return back(token, "closed");
  }

  const now = Date.now();
  if (now - (lastCheckout.get(link.id) ?? 0) < CHECKOUT_MIN_MS) return back(token, "busy");
  lastCheckout.set(link.id, now);
  if (lastCheckout.size > 500) {
    for (const [k, t] of lastCheckout) if (now - t > 60_000) lastCheckout.delete(k);
  }

  // Already paid on an earlier attempt? Settle instead of charging again.
  // findPaidDocumentsForBooking THROWS when Green Invoice cannot answer — then we
  // stop rather than risk a second charge.
  try {
    const docs = await findPaidDocumentsForBooking(booking.business_id, booking.id);
    if (docs.length) {
      await settleStayDocuments(supabase, booking.id, docs);
      // Paid already — never open a second payment page, whatever settle decided.
      return NextResponse.redirect(successUrl, 303);
    }
  } catch (e) {
    // Cannot tell whether a payment exists — do not risk a second charge.
    console.error("pay-link pre-check failed:", e);
    return back(token, "error");
  }

  // Dates still free? Another confirmed stay on this unit, or a date the host
  // blocked, wins.
  if (booking.check_out && booking.service_id) {
    const { data: others } = await supabase
      .from("bookings")
      .select("appointment_date, check_out, service_id")
      .eq("business_id", booking.business_id)
      .eq("service_id", booking.service_id)
      .eq("status", "confirmed")
      .neq("id", booking.id)
      .not("check_out", "is", null);
    const { data: blockedBiz } = await supabase.from("businesses").select("blocked_dates").eq("id", booking.business_id).single();
    const ranges = unavailableRanges((others ?? []) as StayBookingRow[], blockedBiz?.blocked_dates as string[] | null, booking.service_id);
    const mine = { start: booking.appointment_date as string, end: booking.check_out };
    if (ranges.some((r) => rangesOverlap(mine, r))) {
      return back(token, "taken");
    }
  }

  const svc = Array.isArray(booking.service) ? booking.service[0] : booking.service;
  const unitName = svc?.name ?? "";
  const description = `${unitName} ${booking.appointment_date} → ${booking.check_out ?? ""} — ${biz?.name ?? ""}`.trim();

  try {
    const { url } = await createPaymentForm(booking.business_id, {
      amount: Number(link.amount),
      description,
      lang,
      clientName: booking.customer_name || "Guest",
      clientEmails: booking.customer_email ? [booking.customer_email] : [],
      remarks: bookingRemark(booking.id),
      successUrl,
      failureUrl: payLinkUrl(link.token) + "?e=failed",
      notifyUrl: bookingUrl("/api/payments/greeninvoice/webhook"),
      custom: booking.id,
    });
    if (!isHttpsUrl(url)) {
      console.error("pay-link: payment form URL is not https");
      return back(token, "error");
    }
    return NextResponse.redirect(url, 303);
  } catch (e) {
    console.error("pay-link createPaymentForm failed:", e);
    return back(token, "error");
  }
}
