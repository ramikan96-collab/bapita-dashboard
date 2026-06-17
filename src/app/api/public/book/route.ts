import { NextRequest, NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import nodemailer from "nodemailer";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
    businessId, businessName,
    serviceId, serviceName, serviceDuration, servicePrice,
    date, time,
    customerName, customerPhone, customerEmail,
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

  // Conflict check — prevent double-booking race conditions
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("appointment_time, service:services(duration)")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .in("status", ["confirmed", "pending"]);

  if (existingBookings && serviceDuration) {
    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const newStart = toMins(time);
    const newEnd = newStart + serviceDuration;
    const conflict = existingBookings.some((b: { appointment_time: string; service: { duration: number } | { duration: number }[] | null }) => {
      const bStart = toMins(b.appointment_time);
      const bDur = Array.isArray(b.service) ? (b.service[0]?.duration || 30) : (b.service?.duration || 30);
      return newStart < bStart + bDur && newEnd > bStart;
    });
    if (conflict) {
      return NextResponse.json({ error: "This time slot was just taken. Please go back and choose another time." }, { status: 409 });
    }
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

  // Defer all email sends after response is returned
  after(async () => {
    const { data: bizData } = await supabase
      .from("businesses")
      .select("notification_email")
      .eq("id", businessId)
      .single();
    const bccEmail = bizData?.notification_email || process.env.GMAIL_USER || "info.bapita@gmail.com";

    const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("he-IL", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // Send customer confirmation only if email provided
    const emailValid = typeof customerEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
    if (customerEmail && emailValid) {
      try {
        await transporter.sendMail({
          from: `Bapita <${process.env.GMAIL_USER}>`,
          to: customerEmail,
          subject: `Booking confirmed — ${esc(businessName)}`,
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
              <p style="color:#888;font-size:13px;">To cancel or reschedule, contact the business directly.</p>
            </div>
          `,
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
        subject: `הזמנה חדשה — ${esc(customerName)} | ${esc(serviceName)}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;direction:rtl;text-align:right;">
            <h2 style="margin:0 0 8px;">הזמנה חדשה 📅</h2>
            <div style="background:#FAF5EC;border-radius:12px;padding:20px;margin-bottom:24px;">
              <div style="margin-bottom:8px;"><strong>לקוח:</strong> ${esc(customerName)}</div>
              <div style="margin-bottom:8px;"><strong>טלפון:</strong> ${esc(customerPhone)}</div>
              <div style="margin-bottom:8px;"><strong>שירות:</strong> ${esc(serviceName)}</div>
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
