import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { addonType, addonName, businessName, name, phone, email, preferredContact, notes } = await req.json();

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 4px; color: #1E1A14;">New add-on request</h2>
      <p style="color: #888; margin: 0 0 24px; font-size: 14px;">Someone wants to connect <strong>${esc(addonName)}</strong></p>
      <div style="background: #FAF5EC; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="margin-bottom: 10px;"><strong>Business:</strong> ${esc(businessName)}</div>
        <div style="margin-bottom: 10px;"><strong>Add-on:</strong> ${esc(addonName)} <span style="color:#888;font-size:12px;">(${esc(addonType)})</span></div>
        <div style="margin-bottom: 10px;"><strong>Name:</strong> ${esc(name)}</div>
        <div style="margin-bottom: 10px;"><strong>Phone:</strong> ${phone ? esc(phone) : "—"}</div>
        <div style="margin-bottom: 10px;"><strong>Email:</strong> ${email ? esc(email) : "—"}</div>
        <div style="margin-bottom: 10px;"><strong>Preferred contact:</strong> ${esc(preferredContact)}</div>
        ${notes ? `<div><strong>Notes:</strong> ${esc(notes)}</div>` : ""}
      </div>
      <p style="color: #888; font-size: 12px;">Submitted via Bapita dashboard</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: "info.bapita@gmail.com",
      subject: `Add-on request: ${addonName} — ${businessName}`,
      html,
    });
  } catch (e) {
    console.error("Addon request email failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
