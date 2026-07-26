import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];
const VALID_MODES = ["pull", "push", "both"];

// POST — change pull/push/both for an existing connection. Admin-only.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { businessId, staffId, syncMode } = await req.json();
  if (!businessId || !VALID_MODES.includes(syncMode)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const admin = createServiceClient();
  let query = admin
    .from("calendar_connections")
    .update({ sync_mode: syncMode, updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("provider", "google");
  query = staffId ? query.eq("staff_id", staffId) : query.is("staff_id", null);
  const { error } = await query;

  if (error) return NextResponse.json({ error: "update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
