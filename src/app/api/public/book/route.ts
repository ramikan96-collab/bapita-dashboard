import { NextRequest, NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { bookingsForStaff } from "@/lib/availability";
import type { BusinessHours } from "@/types";
import nodemailer from "nodemailer";
import { pushBookingCreated } from "@/lib/google-calendar";
import { resolvePayment, NO_PAYMENT } from "@/lib/payments";
import { withoutExpiredHolds, releaseExpiredHolds } from "@/lib/payment-holds";
import { loadBusinessPaymentsConfig } from "@/lib/payments-server";
import {
  STAY_CHECK_IN_TIME, isIsoDate, nightsBetween, stayTotal,
  unavailableRanges, validateStayRequest,
  type StayBookingRow, type StayValidationError,
} from "@/lib/stay";

interface ExistingBookingRow {
  appointment_time: string;
  staff_id: string | null;
  payment_status?: string | null;
  created_at?: string | null;
  service: { duration: number } | { duration: number }[] | null;
}

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── Email templates ──────────────────────────────────────────────────────────

function buildEmailHtml(params: {
  lang: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  formattedDate: string;
  time: string;
  servicePrice: number;
  cancelUrl?: string | null;
}): { subject: string; html: string } {
  const { lang: l, customerName, businessName, serviceName, formattedDate, time, servicePrice, cancelUrl } = params;
  if (l === "he") {
    return {
      subject: `ההזמנה שלך אושרה — ${businessName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;direction:rtl;text-align:right;">
          <h2 style="margin:0 0 8px;">הזמנה אושרה</h2>
          <p style="color:#555;margin:0 0 24px;">שלום ${esc(customerName)}, התור שלך נקבע.</p>
          <div style="background:#FAF5EC;border-radius:12px;padding:20px;margin-bottom:24px;">
            <div style="margin-bottom:8px;"><strong>עסק:</strong> ${esc(businessName)}</div>
            <div style="margin-bottom:8px;"><strong>שירות:</strong> ${esc(serviceName)}</div>
            <div style="margin-bottom:8px;"><strong>תאריך:</strong> ${esc(formattedDate)}</div>
            <div style="margin-bottom:8px;"><strong>שעה:</strong> ${esc(time.slice(0, 5))}</div>
            <div><strong>מחיר:</strong> ₪${servicePrice || 0}</div>
          </div>
          ${cancelUrl ? `<p style="color:#888;font-size:13px;"><a href="${cancelUrl}" style="color:#888;">ביטול תור</a></p>` : `<p style="color:#888;font-size:13px;">לביטול או שינוי תור, צרו קשר עם העסק ישירות.</p>`}
        </div>
      `,
    };
  }
  return {
    subject: `Booking confirmed — ${businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 8px;">Booking confirmed</h2>
        <p style="color:#555;margin:0 0 24px;">Hi ${esc(customerName)}, your appointment is set.</p>
        <div style="background:#FAF5EC;border-radius:12px;padding:20px;margin-bottom:24px;">
          <div style="margin-bottom:8px;"><strong>Business:</strong> ${esc(businessName)}</div>
          <div style="margin-bottom:8px;"><strong>Service:</strong> ${esc(serviceName)}</div>
          <div style="margin-bottom:8px;"><strong>Date:</strong> ${esc(formattedDate)}</div>
          <div style="margin-bottom:8px;"><strong>Time:</strong> ${esc(time.slice(0, 5))}</div>
          <div><strong>Price:</strong> ₪${servicePrice || 0}</div>
        </div>
        ${cancelUrl ? `<p style="color:#888;font-size:13px;"><a href="${cancelUrl}" style="color:#888;">Cancel this appointment</a></p>` : `<p style="color:#888;font-size:13px;">To cancel or reschedule, contact the business directly.</p>`}
      </div>
    `,
  };
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// IP-based: 10 bookings per 60s per IP (module-level; resets on cold start)
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  const {
    businessId,
    serviceId,
    date, time,
    customerName, customerPhone, customerEmail,
    lang, staffId,
    checkOut, guests, notes,
  } = await req.json();

  if (!businessId || !serviceId || !date || !time || !customerName || !customerPhone) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (typeof customerPhone !== "string") {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }
  const phoneDigits = customerPhone.replace(/[\s\-\+\(\)\.]/g, "");
  if (!/^\d{7,15}$/.test(phoneDigits)) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }

  // IP rate limit
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkIpLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  }

  const supabase = createServiceClient();

  // Phone rate limit: max 2 bookings per phone per business in last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("customer_phone", customerPhone)
    .gte("created_at", twoHoursAgo)
    // Abandoned or expired deposit attempts must not count against the customer:
    // otherwise two failed card attempts lock them out of booking for 2 hours.
    .not("payment_status", "in", '("expired")')
    .neq("status", "cancelled");
  if ((recentCount ?? 0) >= 2) {
    return NextResponse.json(
      { error: "You already have a booking. Contact the business to make changes." },
      { status: 429 }
    );
  }

  // ─── Stay branch (business_type = "stay") ───────────────────────────────────
  // Short-term rentals are date RANGES, not time slots, so they take their own
  // path and return before any appointment logic runs. `date` is the check-in
  // and `checkOut` is the checkout; `appointment_time` is stamped with a fixed
  // check-in time purely so the column stays non-null and the row renders in
  // every existing bookings list unchanged.
  const { data: bizType } = await supabase
    .from("businesses")
    .select("business_type, blocked_dates, name, notification_email")
    .eq("id", businessId)
    .single();

  if (bizType?.business_type === "stay") {
    return handleStayRequest({
      supabase, businessId, serviceId,
      checkIn: date, checkOut,
      guests, customerName, customerPhone, customerEmail, notes,
      lang: lang === "he" ? "he" : "en",
      business: bizType,
    });
  }

  // Server-fetch service fields — never trust client for booking logic (duration gates the
  // overlap guard) or email content (name/price). Scope to businessId to block cross-tenant serviceId.
  const { data: svc, error: svcError } = await supabase
    .from("services")
    .select("duration, name, price, staff_ids, deposit_required, deposit_type, deposit_value")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .single();
  if (svcError || !svc) {
    return NextResponse.json({ error: "invalid service" }, { status: 400 });
  }
  const svcDuration = Number(svc.duration) || 0;
  const svcName = (svc.name as string | null) ?? "";
  const svcPrice = Number(svc.price) || 0;
  const svcStaffIds = (svc.staff_ids as string[] | null) || [];

  // Free any dead deposit holds on this date first, so a slot abandoned at the
  // payment page is bookable again immediately (and the unique double-booking
  // index cannot reject this booking over a stale row).
  await releaseExpiredHolds(supabase, businessId, date);

  // Load same-day bookings for conflict checking + staff resolution.
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("appointment_time, staff_id, payment_status, created_at, service:services(duration)")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .in("status", ["confirmed", "pending"]) as { data: ExistingBookingRow[] | null };

  const bookedRows = withoutExpiredHolds(existingBookings || []);
  const newStart = svcDuration ? toMins(time) : 0;
  const newEnd = newStart + svcDuration;
  const overlaps = (rows: ExistingBookingRow[]) => rows.some((b) => {
    const bStart = toMins(b.appointment_time);
    const bDur = Array.isArray(b.service) ? (b.service[0]?.duration || 30) : (b.service?.duration || 30);
    return newStart < bStart + bDur && newEnd > bStart;
  });
  const takenErr = () => NextResponse.json(
    { error: "This time slot was just taken. Please go back and choose another time." },
    { status: 409 }
  );

  // Intra-day blocks for this date (business-wide when staff_id null, else per staff).
  const { data: blockRows } = await supabase
    .from("blocked_times")
    .select("start_time, end_time, staff_id")
    .eq("business_id", businessId)
    .eq("block_date", date) as { data: { start_time: string; end_time: string; staff_id: string | null }[] | null };
  const blocks = blockRows || [];
  const blockOverlaps = (sid: string | null) => blocks.some((b) => {
    if (!(b.staff_id == null || sid == null || b.staff_id === sid)) return false;
    return newStart < toMins(b.end_time) && newEnd > toMins(b.start_time);
  });

  // Staff assignment only applies when the business enabled customer staff choice.
  // OFF → identical to pre-staff behavior: global overlap guard, staff_id stays null
  //       (the owner assigns in the dashboard).
  // ON  → conflicts are scoped per staff, so two different staff can be booked concurrently.
  const { data: bizChoice } = await supabase
    .from("businesses")
    .select("allow_staff_choice, business_hours, name, slug, deposit_enabled, deposit_default_type, deposit_default_value")
    .eq("id", businessId)
    .single();
  const staffChoice = !!bizChoice?.allow_staff_choice;
  const bizName = (bizChoice?.name as string | null) ?? "";

  let assignedStaffId: string | null = null;

  if (!staffChoice) {
    // Global double-booking guard (pre-staff behavior) + blocked time.
    if (svcDuration && (overlaps(bookedRows) || blockOverlaps(null))) return takenErr();
  } else {
    // Per-staff hours: own working_hours override business hours; used to reject assigning a
    // booking to a staff member who isn't scheduled at this time (mirrors the slots route).
    const bizHours = (bizChoice?.business_hours as BusinessHours | null) || null;
    const { data: staffRows } = await supabase
      .from("staff")
      .select("id, working_hours")
      .eq("business_id", businessId)
      .neq("active", false) as { data: { id: string; working_hours: BusinessHours | null }[] | null };
    const hoursFor = (sid: string): BusinessHours | null =>
      ((staffRows || []).find((r) => r.id === sid)?.working_hours as BusinessHours | null) || bizHours;
    const dayKey = DAY_NAMES[new Date(date + "T12:00:00").getDay()];
    const withinHours = (sid: string) => {
      if (!svcDuration) return true;
      const dh = hoursFor(sid)?.[dayKey];
      if (!dh?.open) return false;
      return newStart >= toMins(dh.start) && newEnd <= toMins(dh.end);
    };

    // Resolve the eligible staff pool: service.staff_ids (server-fetched), else all active staff.
    let eligibleStaffIds: string[] = svcStaffIds;
    if (eligibleStaffIds.length === 0) {
      eligibleStaffIds = (staffRows || []).map((r) => r.id);
    }

    const explicit = typeof staffId === "string" && staffId ? staffId : null;
    if (explicit) {
      // Chosen professional must be working + free (bookings + their blocks).
      if (svcDuration && (!withinHours(explicit) || overlaps(bookingsForStaff(bookedRows, explicit)) || blockOverlaps(explicit))) return takenErr();
      assignedStaffId = explicit;
    } else if (eligibleStaffIds.length > 0) {
      // "Any available" — first eligible staff who is working + free at this time.
      if (svcDuration) {
        for (const sid of eligibleStaffIds) {
          if (withinHours(sid) && !overlaps(bookingsForStaff(bookedRows, sid)) && !blockOverlaps(sid)) { assignedStaffId = sid; break; }
        }
        if (!assignedStaffId) return takenErr(); // every eligible staff is busy or off
      } else {
        assignedStaffId = eligibleStaffIds[0];
      }
    }
    // else: choice enabled but no staff configured → leave null (defensive; UI hides the step).
  }

  // Upsert customer by phone + business
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      { business_id: businessId, name: customerName, phone: customerPhone, email: customerEmail || null },
      { onConflict: "business_id,phone", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (customerError) {
    console.error("Customer upsert error:", customerError);
    return NextResponse.json({ error: "failed to save customer" }, { status: 500 });
  }

  // ─── Deposit decision (server-side; never trust the client) ──────────────────
  // A deposit applies only when: the service is flagged deposit_required, the
  // business enabled deposits, AND payments are connected (addon active). The
  // amount is computed from the server-fetched svcPrice using the per-service
  // override, else the business default.
  let payment = NO_PAYMENT;
  if (svc.deposit_required && bizChoice?.deposit_enabled) {
    // Same "active" definition the public page uses (addon approved AND Green
    // Invoice connected), so what the customer was shown is what we charge.
    const cfg = await loadBusinessPaymentsConfig(businessId);
    payment = resolvePayment({ ...svc, price: svcPrice }, bizChoice, cfg.active);
  }
  const depositAmount = payment.amountDue;
  const depositApplies = payment.mode !== "none";

  // ─── Deposit path: create a pending_payment booking + Green Invoice form ──────
  if (depositApplies) {
    const { data: pendingBooking, error: pendErr } = await supabase.from("bookings").insert({
      business_id: businessId,
      service_id: serviceId,
      staff_id: assignedStaffId,
      customer_id: customer.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      appointment_date: date,
      appointment_time: time,
      status: "pending",
      payment_status: "pending_payment",
      notes: null,
    }).select("id").single();

    if (pendErr || !pendingBooking) {
      console.error("Pending booking insert error:", pendErr);
      const msg = pendErr?.code === '23505'
        ? "This time slot was just taken. Please go back and choose another time."
        : "failed to create booking";
      return NextResponse.json({ error: msg }, { status: pendErr?.code === '23505' ? 409 : 500 });
    }

    try {
      const { createPaymentForm, bookingRemark } = await import("@/lib/greeninvoice");
      const origin = "https://book.bapita.com";
      const bizSlug = (bizChoice?.slug as string | null) || "";
      const { url } = await createPaymentForm(businessId, {
        amount: depositAmount,
        description: `${svcName} — ${bizName}`,
        lang: lang === "he" ? "he" : "en",
        clientName: customerName,
        clientEmails: customerEmail ? [customerEmail] : [],
        remarks: bookingRemark(pendingBooking.id),
        successUrl: `${origin}/pay/success?b=${pendingBooking.id}&lang=${lang === "he" ? "he" : "en"}${bizSlug ? `&s=${bizSlug}` : ""}`,
        failureUrl: `${origin}/pay/cancel?b=${pendingBooking.id}&lang=${lang === "he" ? "he" : "en"}${bizSlug ? `&s=${bizSlug}` : ""}`,
        notifyUrl: `${origin}/api/payments/greeninvoice/webhook`,
        custom: pendingBooking.id,
      });
      return NextResponse.json({
        ok: true,
        requiresPayment: true,
        redirectUrl: url,
        bookingId: pendingBooking.id,
        paymentMode: payment.mode,
        amountDue: payment.amountDue,
        balanceDue: payment.balanceDue,
      });
    } catch (e) {
      // Roll the pending hold back so the slot is not dead-held on a failed form.
      await supabase.from("bookings").delete().eq("id", pendingBooking.id);
      console.error("GI payment form failed:", e);
      return NextResponse.json(
        { error: "Could not start the payment. Please try again or contact the business." },
        { status: 502 }
      );
    }
  }

  // ─── No-deposit path: confirm immediately (existing behavior) ─────────────────
  const { error: bookingError } = await supabase.from("bookings").insert({
    business_id: businessId,
    service_id: serviceId,
    staff_id: assignedStaffId,
    customer_id: customer.id,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail || null,
    appointment_date: date,
    appointment_time: time,
    status: "confirmed",
    payment_status: "none",
    notes: null,
  });

  if (bookingError) {
    console.error("Booking insert error:", bookingError);
    const msg = bookingError.code === '23505'
      ? "This time slot was just taken. Please go back and choose another time."
      : "failed to create booking";
    const errStatus = bookingError.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: msg }, { status: errStatus });
  }

  // Fetch cancel token (+ id for the Google Calendar push) for the newly inserted booking
  const { data: newBooking } = await supabase
    .from("bookings")
    .select("id, cancel_token")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .eq("appointment_time", time)
    .eq("customer_phone", customerPhone)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const cancelToken = newBooking?.cancel_token as string | null;
  const cancelUrl = cancelToken ? `https://book.bapita.com/cancel/${cancelToken}` : null;

  // Push to Google Calendar (Phase 0) — best-effort, never blocks the booking.
  // Runs in `after()` (like the emails below) so the serverless function stays
  // alive long enough to finish even though the response has already returned.
  if (newBooking?.id) {
    const bookingId = newBooking.id;
    after(() =>
      pushBookingCreated(supabase, {
        businessId,
        staffId: assignedStaffId,
        bookingId,
        summary: `${svcName} — ${customerName}`,
        dateISO: date,
        timeHHmm: time.slice(0, 5),
        durationMinutes: svcDuration || 30,
      }).catch((e) => console.error("Google Calendar push failed:", e))
    );
  }

  // Defer all email sends after response is returned
  after(async () => {
    const { data: bizData } = await supabase
      .from("businesses")
      .select("notification_email, owner_email")
      .eq("id", businessId)
      .single();
    const bccEmail = bizData?.notification_email || bizData?.owner_email || process.env.GMAIL_USER || "info.bapita@gmail.com";

    const dateLocale = lang === "he" ? "he-IL" : "en-US";
    const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(dateLocale, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // Send customer confirmation only if email provided
    const emailValid = typeof customerEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
    if (customerEmail && emailValid) {
      try {
        const { subject, html } = buildEmailHtml({
          lang: lang === "he" ? "he" : "en",
          customerName, businessName: bizName, serviceName: svcName, formattedDate, time,
          servicePrice: svcPrice,
          cancelUrl,
        });
        await transporter.sendMail({
          from: `Bapita <${process.env.GMAIL_USER}>`,
          to: customerEmail,
          subject,
          html,
        });
      } catch (e) {
        console.error("Customer email failed:", e);
      }
    }

    // Always send barber notification regardless of whether customer has email
    try {
      await transporter.sendMail({
        from: `Bapita <${process.env.GMAIL_USER}>`,
        to: bccEmail,
        subject: `הזמנה חדשה — ${customerName} | ${svcName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;direction:rtl;text-align:right;">
            <h2 style="margin:0 0 8px;">הזמנה חדשה 📅</h2>
            <div style="background:#FAF5EC;border-radius:12px;padding:20px;margin-bottom:24px;">
              <div style="margin-bottom:8px;"><strong>לקוח:</strong> ${esc(customerName)}</div>
              <div style="margin-bottom:8px;"><strong>טלפון:</strong> ${esc(customerPhone)}</div>
              <div style="margin-bottom:8px;"><strong>שירות:</strong> ${esc(svcName)}</div>
              <div style="margin-bottom:8px;"><strong>תאריך:</strong> ${esc(formattedDate)}</div>
              <div><strong>שעה:</strong> ${esc(time.slice(0, 5))}</div>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.error("Barber notification failed:", e);
    }
  });

  return NextResponse.json({ ok: true });
}


// ─── Stay request handling ────────────────────────────────────────────────────

type ServiceClient = ReturnType<typeof createServiceClient>;

interface StayBiz {
  name: string | null;
  blocked_dates: string[] | null;
  notification_email: string | null;
}

interface StayArgs {
  supabase: ServiceClient;
  businessId: string;
  serviceId: string;
  checkIn: string;
  checkOut: unknown;
  guests: unknown;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: unknown;
  lang: "he" | "en";
  business: StayBiz;
}

const STAY_ERROR_COPY: Record<StayValidationError, { en: string; he: string }> = {
  invalid_dates:   { en: "Please choose a check in and a check out date.", he: "בחרו תאריך הגעה ותאריך יציאה." },
  past_date:       { en: "That date has already passed.", he: "התאריך הזה כבר עבר." },
  too_short:       { en: "That stay is shorter than the minimum for this place.", he: "השהייה קצרה מהמינימום של הדירה הזו." },
  too_long:        { en: "That stay is too long to request online. Please contact the host.", he: "השהייה ארוכה מדי לבקשה אונליין. צרו קשר עם המארח." },
  too_many_guests: { en: "That is more guests than this place sleeps.", he: "מספר האורחים גדול מהקיבולת של הדירה." },
  unavailable:     { en: "Those dates are no longer available. Please pick another range.", he: "התאריכים האלה כבר לא זמינים. בחרו טווח אחר." },
};

/**
 * Create a stay REQUEST (phase 1: no payment, no instant confirmation).
 *
 * The row lands as `pending` and the host confirms it in the dashboard. Nothing
 * is pushed to Google Calendar here — a request is not yet a reservation, and
 * writing unconfirmed holds into the host's calendar would make it useless.
 */
async function handleStayRequest(args: StayArgs) {
  const {
    supabase, businessId, serviceId, checkIn, checkOut, guests,
    customerName, customerPhone, customerEmail, notes, lang, business,
  } = args;

  const fail = (code: StayValidationError, status = 400) =>
    NextResponse.json({ error: STAY_ERROR_COPY[code][lang] }, { status });

  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return fail("invalid_dates");

  // Unit must belong to this business — blocks a cross-tenant serviceId.
  const { data: unit } = await supabase
    .from("services")
    .select("id, name, price, min_nights, max_guests")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .single();
  if (!unit) return NextResponse.json({ error: "invalid unit" }, { status: 400 });

  const guestCount = Number.isFinite(Number(guests)) ? Math.max(1, Math.trunc(Number(guests))) : 1;

  // Re-read availability server-side. The client greyed out dates when the modal
  // opened; this is the guard that actually decides.
  const { data: rows } = await supabase
    .from("bookings")
    .select("appointment_date, check_out, service_id")
    .eq("business_id", businessId)
    .eq("service_id", serviceId)
    .eq("status", "confirmed")
    .not("check_out", "is", null) as { data: StayBookingRow[] | null };

  const invalid = validateStayRequest({
    start: checkIn,
    end: checkOut,
    guests: guestCount,
    unit,
    unavailable: unavailableRanges(rows ?? [], business.blocked_dates, serviceId),
  });
  if (invalid) return fail(invalid, invalid === "unavailable" ? 409 : 400);

  const nights = nightsBetween(checkIn, checkOut);
  const total  = stayTotal(Number(unit.price) || 0, nights);

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      { business_id: businessId, name: customerName, phone: customerPhone, email: customerEmail || null },
      { onConflict: "business_id,phone", ignoreDuplicates: false }
    )
    .select("id")
    .single();
  if (customerError || !customer) {
    console.error("Stay customer upsert error:", customerError);
    return NextResponse.json({ error: "failed to save customer" }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("bookings").insert({
    business_id: businessId,
    service_id: serviceId,
    customer_id: customer.id,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail || null,
    appointment_date: checkIn,
    appointment_time: STAY_CHECK_IN_TIME,
    check_out: checkOut,
    guests: guestCount,
    status: "pending",
    payment_status: "none",
    // Guest-supplied free text (arrival time, requests). Trimmed and capped so a
    // request cannot be used to stuff the host's dashboard.
    notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 1000) : null,
  });

  if (insertError) {
    console.error("Stay booking insert error:", insertError);
    return NextResponse.json({ error: "failed to create request" }, { status: 500 });
  }

  const bizName = business.name ?? "";
  const unitName = (unit.name as string | null) ?? "";

  after(async () => {
    const { data: bizData } = await supabase
      .from("businesses")
      .select("notification_email, owner_email")
      .eq("id", businessId)
      .single();
    const hostEmail =
      bizData?.notification_email || bizData?.owner_email || process.env.GMAIL_USER || "info.bapita@gmail.com";

    const locale = lang === "he" ? "he-IL" : "en-US";
    const fmt = (d: string) =>
      new Date(d + "T12:00:00").toLocaleDateString(locale, { weekday: "short", month: "long", day: "numeric", year: "numeric" });

    const rowsHtml = (labels: [string, string][]) =>
      labels.map(([k, v]) => `<div style="margin-bottom:8px;"><strong>${esc(k)}:</strong> ${esc(v)}</div>`).join("");

    // Host notification — always sent, this is the whole point of the request flow.
    try {
      await transporter.sendMail({
        from: `Bapita <${process.env.GMAIL_USER}>`,
        to: hostEmail,
        subject: `בקשת אירוח חדשה — ${customerName} | ${unitName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;direction:rtl;text-align:right;">
            <h2 style="margin:0 0 8px;">בקשת אירוח חדשה 🏠</h2>
            <div style="background:#FAF5EC;border-radius:12px;padding:20px;margin-bottom:20px;">
              ${rowsHtml([
                ["אורח", customerName],
                ["טלפון", customerPhone],
                ["דירה", unitName],
                ["צ׳ק אין", fmt(checkIn)],
                ["צ׳ק אאוט", fmt(checkOut as string)],
                ["לילות", String(nights)],
                ["אורחים", String(guestCount)],
                ["סה״כ", `₪${total}`],
              ])}
            </div>
            <p style="color:#888;font-size:13px;">אשרו או דחו את הבקשה בלוח הבקרה.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Stay host notification failed:", e);
    }

    // Guest acknowledgement — only when they gave a valid address.
    const emailValid = typeof customerEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
    if (customerEmail && emailValid) {
      const he = lang === "he";
      try {
        await transporter.sendMail({
          from: `Bapita <${process.env.GMAIL_USER}>`,
          to: customerEmail,
          subject: he ? `הבקשה שלך התקבלה — ${bizName}` : `We got your request — ${bizName}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;${he ? "direction:rtl;text-align:right;" : ""}">
              <h2 style="margin:0 0 8px;">${he ? "הבקשה התקבלה" : "Request received"}</h2>
              <p style="color:#555;margin:0 0 24px;">${
                he
                  ? `שלום ${esc(customerName)}, המארח קיבל את הבקשה ויחזור אליך בהקדם לאישור.`
                  : `Hi ${esc(customerName)}, the host has your request and will confirm shortly.`
              }</p>
              <div style="background:#FAF5EC;border-radius:12px;padding:20px;margin-bottom:20px;">
                ${rowsHtml([
                  [he ? "דירה" : "Place", unitName],
                  [he ? "צ׳ק אין" : "Check in", fmt(checkIn)],
                  [he ? "צ׳ק אאוט" : "Check out", fmt(checkOut as string)],
                  [he ? "לילות" : "Nights", String(nights)],
                  [he ? "אורחים" : "Guests", String(guestCount)],
                  [he ? "סה״כ" : "Total", `₪${total}`],
                ])}
              </div>
              <p style="color:#888;font-size:13px;">${
                he ? "זו בקשה בלבד ואינה מהווה אישור הזמנה." : "This is a request, not a confirmed reservation yet."
              }</p>
            </div>
          `,
        });
      } catch (e) {
        console.error("Stay guest email failed:", e);
      }
    }
  });

  return NextResponse.json({ ok: true, stay: true, nights, total });
}
