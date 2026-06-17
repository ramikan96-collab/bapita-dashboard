import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import nodemailer from "nodemailer";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, business_name, phone, email, city, message, lang } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error: dbError } = await supabase.from("leads").insert({
    name: name.trim(),
    business_name: business_name?.trim() || null,
    phone: phone?.trim() || null,
    email: email.trim().toLowerCase(),
    city: city?.trim() || null,
    message: message?.trim() || null,
    status: "pending",
  });

  if (dbError) {
    console.error("leads insert error:", dbError);
    return NextResponse.json({ error: "Failed to save request." }, { status: 500 });
  }

  // Notify Bapita
  try {
    await transporter.sendMail({
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: "info.bapita@gmail.com",
      subject: `New lead: ${esc(name)}${business_name ? ` — ${esc(business_name)}` : ""}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <h2 style="margin:0 0 20px;color:#1C1814;">New lead from bapita.com</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#888;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;color:#1C1814;">${esc(name)}</td></tr>
            ${business_name ? `<tr><td style="padding:8px 0;color:#888;">Business</td><td style="padding:8px 0;font-weight:600;color:#1C1814;">${esc(business_name)}</td></tr>` : ""}
            ${phone ? `<tr><td style="padding:8px 0;color:#888;">Phone</td><td style="padding:8px 0;font-weight:600;color:#1C1814;">${esc(phone)}</td></tr>` : ""}
            <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;font-weight:600;color:#1C1814;">${esc(email)}</td></tr>
            ${city ? `<tr><td style="padding:8px 0;color:#888;">City</td><td style="padding:8px 0;font-weight:600;color:#1C1814;">${esc(city)}</td></tr>` : ""}
            ${message ? `<tr><td style="padding:8px 0;color:#888;vertical-align:top;">Message</td><td style="padding:8px 0;color:#1C1814;">${esc(message)}</td></tr>` : ""}
          </table>
          <a href="https://dashboard.bapita.com/admin/leads" style="display:inline-block;margin-top:24px;background:#E8920A;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View in Admin →</a>
        </div>
      `,
    });
  } catch (e) {
    console.error("Lead notification email failed:", e);
  }

  // Auto-reply to customer
  const isHe = (lang === "he") || /[֐-׿]/.test(name + (business_name ?? ""));
  try {
    await transporter.sendMail({
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: email.trim().toLowerCase(),
      subject: isHe ? "קיבלנו את הפרטים שלך — Bapita" : "We got your details — Bapita",
      html: isHe ? `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;direction:rtl;text-align:right;">
          <h2 style="margin:0 0 12px;color:#1C1814;">תודה, ${esc(name)}!</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">קיבלנו את הפרטים שלך. ניצור איתך קשר בקרוב.</p>
          <p style="color:#999;font-size:12px;margin:0;">שלחת בקשה דרך bapita.com</p>
        </div>
      ` : `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="margin:0 0 12px;color:#1C1814;">Thanks, ${esc(name)}!</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">We received your details and will be in touch soon.</p>
          <p style="color:#999;font-size:12px;margin:0;">You submitted a request via bapita.com</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Customer confirmation email failed:", e);
  }

  return NextResponse.json({ ok: true });
}
