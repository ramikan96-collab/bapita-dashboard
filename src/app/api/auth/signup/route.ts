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
  const { email, password, name } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // generateLink creates the user + confirmation token in one call
  const { data: linkData, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: { full_name: name ?? "" },
      redirectTo: "https://dashboard.bapita.com/auth/callback",
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!linkData?.properties?.action_link) {
    return NextResponse.json({ error: "Could not generate confirmation link." }, { status: 500 });
  }

  try {
    const greeting = name ? `, ${esc(name)}` : "";
    await transporter.sendMail({
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Confirm your Bapita account",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="margin:0 0 12px;color:#1C1814;">Welcome to Bapita${greeting}!</h2>
          <p style="color:#666;margin:0 0 24px;line-height:1.5;">Click below to confirm your email address and activate your account.</p>
          <a href="${esc(linkData.properties.action_link)}" style="display:inline-block;background:#E8920A;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Confirm my account</a>
          <p style="color:#999;font-size:12px;margin-top:28px;">If you didn't sign up for Bapita, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Signup email failed:", e);
  }

  return NextResponse.json({ ok: true });
}
