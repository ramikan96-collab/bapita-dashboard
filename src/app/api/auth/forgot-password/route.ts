import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import nodemailer from "nodemailer";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: "https://dashboard.bapita.com/auth/callback?next=/profile",
    },
  });

  // Always return ok — don't reveal whether user exists
  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ ok: true });
  }

  try {
    await transporter.sendMail({
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Reset your Bapita password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="margin:0 0 12px;color:#1C1814;">Reset your password</h2>
          <p style="color:#666;margin:0 0 24px;line-height:1.5;">Click the button below to set a new password for your Bapita account. This link expires in 1 hour.</p>
          <a href="${esc(data.properties.action_link)}" style="display:inline-block;background:#E8920A;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Reset password</a>
          <p style="color:#999;font-size:12px;margin-top:28px;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Reset email failed:", e);
  }

  return NextResponse.json({ ok: true });
}
