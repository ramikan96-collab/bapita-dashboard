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

  const { subject, message, name } = await req.json();

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 4px; color: #1E1A14;">New support request</h2>
      <p style="color: #888; margin: 0 0 24px; font-size: 14px;">${esc(subject)}</p>
      <div style="background: #FAF5EC; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="margin-bottom: 10px;"><strong>From:</strong> ${name ? esc(name) : "—"}</div>
        <div style="margin-bottom: 10px;"><strong>Email:</strong> ${esc(user.email)}</div>
        <div style="margin-bottom: 10px;"><strong>Subject:</strong> ${esc(subject)}</div>
        <div style="white-space: pre-wrap;"><strong>Message:</strong><br/>${esc(message)}</div>
      </div>
      <p style="color: #888; font-size: 12px;">Submitted via Bapita dashboard</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: "info.bapita@gmail.com",
      replyTo: user.email,
      subject: `Support: ${subject}`,
      html,
    });
  } catch (e) {
    console.error("Support email failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
