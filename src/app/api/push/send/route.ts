import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendPush } from "@/lib/push";

// Constant-time secret compare — avoids the timing leak of `!==` on the webhook secret.
function secretOk(provided: string, expected: string): boolean {
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-push-secret") ?? "";
  if (!secretOk(secret, process.env.PUSH_WEBHOOK_SECRET ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Supabase webhook sends { type, table, schema, record, old_record }
  const record = body.record ?? body;
  const { business_id, title, body: notifBody } = record;

  if (!business_id || !title) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // ?notifications=1 tells AppShell to open the notifications modal on load
  await sendPush(business_id, {
    title,
    body: notifBody ?? "",
    url: "/calendar?notifications=1",
  });

  return NextResponse.json({ ok: true });
}
