import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { deleteRefreshToken } from "@/lib/google-calendar";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { businessId, staffId } = await req.json().catch(() => ({}));
  if (!businessId) return NextResponse.json({ error: "missing businessId" }, { status: 400 });

  const admin = createServiceClient();
  let query = admin
    .from("calendar_connections")
    .select("id, refresh_token_secret_id")
    .eq("business_id", businessId)
    .eq("provider", "google");
  query = staffId ? query.eq("staff_id", staffId) : query.is("staff_id", null);
  const { data: connection } = await query.maybeSingle();

  if (!connection) return NextResponse.json({ ok: true, disconnected: false });

  await admin.from("calendar_connections").delete().eq("id", connection.id);
  await deleteRefreshToken(admin, connection.refresh_token_secret_id);

  return NextResponse.json({ ok: true, disconnected: true });
}
