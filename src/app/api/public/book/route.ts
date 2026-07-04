import { NextRequest, NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { bookingsForStaff } from "@/lib/availability";
import type { BusinessHours } from "@/types";
import nodemailer from "nodemailer";

interface ExistingBookingRow {
  appointment_time: string;
  staff_id: string | null;
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
    .gte("created_at", twoHoursAgo);
  if ((recentCount ?? 0) >= 2) {
    return NextResponse.json(
      { error: "You already have a booking. Contact the business to make changes." },
      { status: 429 }
    );
  }

  // Server-fetch service fields — never trust client for booking logic (duration gates the
  // overlap guard) or email content (name/price). Scope to businessId to block cross-tenant serviceId.
  const { data: svc, error: svcError } = await supabase
    .from("services")
    .select("duration, name, price, staff_ids")
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

  // Load same-day bookings for conflict checking + staff resolution.
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("appointment_time, staff_id, service:services(duration)")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .in("status", ["confirmed", "pending"]) as { data: ExistingBookingRow[] | null };

  const bookedRows = existingBookings || [];
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
    .select("allow_staff_choice, business_hours, name")
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

  // Fetch cancel token for the newly inserted booking
  const { data: newBooking } = await supabase
    .from("bookings")
    .select("cancel_token")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .eq("appointment_time", time)
    .eq("customer_phone", customerPhone)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const cancelToken = newBooking?.cancel_token as string | null;
  const cancelUrl = cancelToken ? `https://book.bapita.com/cancel/${cancelToken}` : null;

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
