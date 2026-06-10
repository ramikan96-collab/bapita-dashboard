import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { customerName, customerEmail, businessName, serviceName, date, time } = await req.json();

  if (!customerEmail) {
    return NextResponse.json({ ok: true });
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("he-IL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const { error } = await resend.emails.send({
    from: "Bapita <noreply@bapita.com>",
    to: customerEmail,
    subject: `Booking confirmed - ${esc(businessName)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 8px;">Booking confirmed</h2>
        <p style="color: #555; margin: 0 0 24px;">Hi ${esc(customerName)}, your appointment is set.</p>
        <div style="background: #FAF5EC; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="margin-bottom: 8px;"><strong>Business:</strong> ${esc(businessName)}</div>
          <div style="margin-bottom: 8px;"><strong>Service:</strong> ${esc(serviceName)}</div>
          <div style="margin-bottom: 8px;"><strong>Date:</strong> ${esc(formattedDate)}</div>
          <div><strong>Time:</strong> ${esc(time.slice(0, 5))}</div>
        </div>
        <p style="color: #888; font-size: 13px;">To cancel or reschedule, contact the business directly.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
