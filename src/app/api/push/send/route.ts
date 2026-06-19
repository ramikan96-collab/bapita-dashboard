import { NextRequest, NextResponse } from "next/server";
import { sendPush } from "@/lib/push";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-push-secret");
  if (secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Supabase webhook sends { type, table, schema, record, old_record }
  const record = body.record ?? body;
  const { business_id, title, body: notifBody } = record;

  if (!business_id || !title) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  await sendPush(business_id, { title, body: notifBody ?? "" });

  return NextResponse.json({ ok: true });
}
