import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/admin";
import {
  isIsoDate, nightsBetween, rangesOverlap, todayIso, unavailableRanges, MAX_STAY_NIGHTS, STAY_CHECK_IN_TIME,
  type StayBookingRow,
} from "@/lib/stay";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LINK_DEFAULT_HOURS, LINK_MAX_HOURS, LINK_SELECT, newLinkToken, normaliseLinkAmount, payLinkUrl,
  type PaymentLinkRow,
} from "@/lib/payment-links";

// Host-side pay links for stay bookings (spec: docs/specs/2026-11-10-stay-pay-link.md).
//
//   POST   { bookingId, amount, lang?, hours? }  → link for an existing request
//          (cancels any open link on it)
//   POST   { create: { businessId, serviceId, checkIn, checkOut, guests?,
//            name, phone, email? }, amount, lang?, hours? }
//          → host-made booking (no guest request) + its link
//   DELETE { bookingId }                          → cancel the open link
//
// Owners have no INSERT/UPDATE policy on payment_links, so this route checks
// ownership itself and writes with the service role. The amount is the host's
// own agreed price; it is stored on the row and never travels in the URL.

async function authorise(bookingId: unknown) {
  if (typeof bookingId !== "string" || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return { error: NextResponse.json({ error: "missing bookingId" }, { status: 400 }) };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  const admin = createServiceClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, business_id, service_id, status, payment_status, appointment_date, check_out")
    .eq("id", bookingId)
    .single();
  if (!booking) return { error: NextResponse.json({ error: "not found" }, { status: 404 }) };

  const { data: biz } = await admin
    .from("businesses")
    .select("id, owner_id")
    .eq("id", booking.business_id)
    .single();
  if (!biz || (biz.owner_id !== user.id && !isAdminEmail(user.email))) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { admin, booking };
}

async function ownerOrAdmin(businessId: unknown) {
  if (typeof businessId !== "string" || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return { error: NextResponse.json({ error: "missing businessId" }, { status: 400 }) };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const admin = createServiceClient();
  const { data: biz } = await admin
    .from("businesses")
    .select("id, owner_id, business_type")
    .eq("id", businessId)
    .single();
  if (!biz || (biz.owner_id !== user.id && !isAdminEmail(user.email))) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { admin, biz };
}

function parseLinkOptions(body: Record<string, unknown>) {
  const amount = normaliseLinkAmount(body.amount);
  const lang: "en" | "he" = body.lang === "he" ? "he" : "en";
  const hoursRaw = Number(body.hours);
  const hours = Number.isFinite(hoursRaw) && hoursRaw >= 1 ? Math.min(Math.trunc(hoursRaw), LINK_MAX_HOURS) : LINK_DEFAULT_HOURS;
  return { amount, lang, hours };
}

const AMOUNT_ERROR = "Enter an amount between ₪1 and ₪100,000.";

async function paymentsConnected(admin: SupabaseClient, businessId: string): Promise<boolean> {
  const { data } = await admin
    .from("payment_credentials")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("provider", "greeninvoice")
    .maybeSingle();
  return !!data;
}

const notConnected = () => NextResponse.json(
  { error: "Online payments are not connected for this business — connect Green Invoice first." },
  { status: 400 },
);

/** Nights taken on this unit by a confirmed stay (other than `exceptId`) or a blocked date. */
async function datesTaken(
  admin: SupabaseClient,
  businessId: string,
  serviceId: string,
  range: { start: string; end: string },
  exceptId?: string,
): Promise<boolean> {
  let q = admin
    .from("bookings")
    .select("appointment_date, check_out, service_id")
    .eq("business_id", businessId)
    .eq("service_id", serviceId)
    .eq("status", "confirmed")
    .not("check_out", "is", null);
  if (exceptId) q = q.neq("id", exceptId);
  const { data: rows } = await q;
  const { data: biz } = await admin.from("businesses").select("blocked_dates").eq("id", businessId).single();
  const ranges = unavailableRanges((rows ?? []) as StayBookingRow[], biz?.blocked_dates as string[] | null, serviceId);
  return ranges.some((r) => rangesOverlap(range, r));
}

const LINK_FAILED = "Could not create the link.";

/** Retire any open link on the booking, then issue a fresh one. */
async function issueLink(
  admin: SupabaseClient,
  booking: { id: string; business_id: string },
  opts: { amount: number; lang: "en" | "he"; hours: number },
): Promise<NextResponse | null> {
  // One open link per booking (the partial unique index enforces this too), so
  // the old one is retired first — and put back if the new one cannot be made,
  // so a failed retry never leaves the guest holding a dead link.
  const { data: retired } = await admin
    .from("payment_links")
    .update({ status: "cancelled" })
    .eq("booking_id", booking.id)
    .eq("status", "active")
    .select("id");

  const { data: link, error } = await admin
    .from("payment_links")
    .insert({
      token: newLinkToken(),
      business_id: booking.business_id,
      booking_id: booking.id,
      amount: opts.amount,
      lang: opts.lang,
      status: "active",
      expires_at: new Date(Date.now() + opts.hours * 3600 * 1000).toISOString(),
    })
    .select(LINK_SELECT)
    .single();
  if (error || !link) {
    console.error("payment link insert failed:", error);
    const ids = (retired ?? []).map((r) => r.id as string);
    if (ids.length) await admin.from("payment_links").update({ status: "active" }).in("id", ids);
    return null;
  }
  const row = link as PaymentLinkRow;
  return NextResponse.json({
    ok: true,
    bookingId: booking.id,
    link: { ...row, amount: Number(row.amount), url: payLinkUrl(row.token) },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const opts = parseLinkOptions(body);

  if (body.create && typeof body.create === "object") {
    return createWithBooking(body.create as Record<string, unknown>, opts);
  }

  const auth = await authorise(body.bookingId);
  if ("error" in auth) return auth.error;
  const { admin, booking } = auth;

  if (!booking.check_out) {
    return NextResponse.json({ error: "Pay links are for stay bookings only." }, { status: 400 });
  }
  if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "no_show") {
    return NextResponse.json({ error: "This booking is closed." }, { status: 400 });
  }
  if (booking.payment_status !== "none") {
    return NextResponse.json({ error: "This booking already has a payment on it." }, { status: 400 });
  }
  if (booking.check_out <= todayIso()) {
    return NextResponse.json({ error: "These dates are in the past." }, { status: 400 });
  }
  if (opts.amount == null) return NextResponse.json({ error: AMOUNT_ERROR }, { status: 400 });
  if (booking.service_id && await datesTaken(admin, booking.business_id, booking.service_id, { start: booking.appointment_date, end: booking.check_out }, booking.id)) {
    return NextResponse.json({ error: "Those nights are already confirmed for someone else or blocked." }, { status: 409 });
  }
  if (!(await paymentsConnected(admin, booking.business_id))) return notConnected();

  return (await issueLink(admin, booking, { ...opts, amount: opts.amount }))
    ?? NextResponse.json({ error: LINK_FAILED }, { status: 500 });
}

/**
 * Host-made link with no guest request behind it: create the stay booking
 * (pending, unpaid — it only confirms once paid), then its link.
 */
async function createWithBooking(
  c: Record<string, unknown>,
  opts: { amount: number | null; lang: "en" | "he"; hours: number },
) {
  const auth = await ownerOrAdmin(c.businessId);
  if ("error" in auth) return auth.error;
  const { admin, biz } = auth;

  if (biz.business_type !== "stay") {
    return NextResponse.json({ error: "Pay links are for stay businesses only." }, { status: 400 });
  }
  if (opts.amount == null) return NextResponse.json({ error: AMOUNT_ERROR }, { status: 400 });

  const checkIn = c.checkIn, checkOut = c.checkOut;
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return NextResponse.json({ error: "Pick check-in and check-out dates." }, { status: 400 });
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1 || nights > MAX_STAY_NIGHTS) {
    return NextResponse.json({ error: "Check-out must be after check-in (max 90 nights)." }, { status: 400 });
  }
  if (checkIn < todayIso()) {
    return NextResponse.json({ error: "Check-in is in the past." }, { status: 400 });
  }

  const name = typeof c.name === "string" ? c.name.trim().slice(0, 120) : "";
  const phone = typeof c.phone === "string" ? c.phone.replace(/[^\d+]/g, "").slice(0, 20) : "";
  const emailRaw = typeof c.email === "string" ? c.email.trim().slice(0, 200) : "";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : "";
  if (!name || phone.replace(/\D/g, "").length < 7) {
    return NextResponse.json({ error: "Guest name and phone are required." }, { status: 400 });
  }
  if (emailRaw && !email) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }
  const guestsRaw = Number(c.guests);
  const guests = Number.isFinite(guestsRaw) && guestsRaw >= 1 ? Math.min(Math.trunc(guestsRaw), 50) : 1;

  const { data: unit } = await admin
    .from("services")
    .select("id")
    .eq("id", typeof c.serviceId === "string" ? c.serviceId : "")
    .eq("business_id", biz.id)
    .maybeSingle();
  if (!unit) return NextResponse.json({ error: "Pick an apartment." }, { status: 400 });

  // Refuse nights already confirmed on this unit or blocked — a link the guest
  // could pay for a night someone else holds is the one thing this must never do.
  if (await datesTaken(admin, biz.id, unit.id, { start: checkIn, end: checkOut })) {
    return NextResponse.json({ error: "Those nights are already booked or blocked on this apartment." }, { status: 409 });
  }

  if (!(await paymentsConnected(admin, biz.id))) return notConnected();

  const { data: customer, error: custErr } = await admin
    .from("customers")
    .upsert(
      // Leave a stored email alone when the host did not type one.
      { business_id: biz.id, name, phone, ...(email ? { email } : {}) },
      { onConflict: "business_id,phone", ignoreDuplicates: false },
    )
    .select("id")
    .single();
  if (custErr || !customer) {
    console.error("pay-link customer upsert failed:", custErr);
    return NextResponse.json({ error: "Could not save the guest." }, { status: 500 });
  }

  const { data: booking, error: bookErr } = await admin
    .from("bookings")
    .insert({
      business_id: biz.id,
      service_id: unit.id,
      customer_id: customer.id,
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      appointment_date: checkIn,
      appointment_time: STAY_CHECK_IN_TIME,
      check_out: checkOut,
      guests,
      status: "pending",
      payment_status: "none",
      notes: "Created by the host with a payment link.",
    })
    .select("id, business_id")
    .single();
  if (bookErr || !booking) {
    console.error("pay-link booking insert failed:", bookErr);
    return NextResponse.json({ error: "Could not create the booking." }, { status: 500 });
  }

  const res = await issueLink(admin, booking, { ...opts, amount: opts.amount });
  if (res) return res;
  // No link → the booking would be an orphan the host retries into a duplicate.
  await admin.from("bookings").delete().eq("id", booking.id);
  return NextResponse.json({ error: LINK_FAILED }, { status: 500 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const auth = await authorise(body.bookingId);
  if ("error" in auth) return auth.error;
  const { admin, booking } = auth;

  const { error } = await admin
    .from("payment_links")
    .update({ status: "cancelled" })
    .eq("booking_id", booking.id)
    .eq("status", "active");
  if (error) {
    console.error("payment link cancel failed:", error);
    return NextResponse.json({ error: "Could not cancel the link." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
