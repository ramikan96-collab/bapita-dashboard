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
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const {
    customerName, customerEmail, serviceName,
    oldDate, oldTime, newDate, newTime, businessId,
  } = await req.json();

  if (!customerEmail) {
    return NextResponse.json({ ok: true });
  }

  // Resolve notification email + business name server-side, scoped to the
  // caller. Never trust a client-supplied business name — echoing it into an
  // email to an arbitrary recipient turns this authed route into a spoofable
  // mailer. (Same guard as /api/send-confirmation.)
  let bccEmail = process.env.GMAIL_USER || "info.bapita@gmail.com";
  let businessName = "";
  if (businessId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("name, notification_email, owner_email")
      .eq("id", businessId)
      .or(`owner_id.eq.${user.id},owner_email.eq.${user.email ?? ""}`)
      .single();
    bccEmail = biz?.notification_email || biz?.owner_email || bccEmail;
    businessName = biz?.name || "";
  } else {
    const { data: bizRows } = await supabase
      .from("businesses")
      .select("name, notification_email, owner_email")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const biz = bizRows?.[0];
    bccEmail = biz?.notification_email || biz?.owner_email || bccEmail;
    businessName = biz?.name || "";
  }

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("he-IL", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 8px;">Appointment rescheduled</h2>
      <p style="color: #555; margin: 0 0 24px;">Hi ${esc(customerName)}, your appointment has been moved to a new time.</p>
      <div style="background: #FAF5EC; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="margin-bottom: 8px;"><strong>Business:</strong> ${esc(businessName)}</div>
        <div style="margin-bottom: 8px;"><strong>Service:</strong> ${esc(serviceName)}</div>
        <div style="margin-bottom: 12px; color: #999; text-decoration: line-through;">
          Was: ${esc(fmtDate(oldDate))} · ${esc(String(oldTime).slice(0, 5))}
        </div>
        <div style="margin-bottom: 8px;"><strong>New date:</strong> ${esc(fmtDate(newDate))}</div>
        <div><strong>New time:</strong> ${esc(String(newTime).slice(0, 5))}</div>
      </div>
      <p style="color: #888; font-size: 13px;">To cancel or reschedule again, contact the business directly.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Bapita <${process.env.GMAIL_USER}>`,
      to: customerEmail,
      bcc: bccEmail,
      subject: `Appointment rescheduled - ${businessName}`,
      html,
    });
  } catch (e) {
    console.error("Reschedule email send failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
