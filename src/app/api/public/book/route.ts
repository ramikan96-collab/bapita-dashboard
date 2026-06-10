import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

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

  const supabase = createServiceClient();

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
    return NextResponse.json({ error: "failed to create booking" }, { status: 500 });
  }

  // Send confirmation email (fire and forget)
  if (customerEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("he-IL", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      await resend.emails.send({
        from: "Bapita <noreply@bapita.com>",
        to: customerEmail,
        bcc: "info.bapita@gmail.com",
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
      console.error("Email send failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
