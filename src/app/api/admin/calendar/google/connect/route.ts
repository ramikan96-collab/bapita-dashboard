import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google-calendar";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

// GET — kicks off the Google OAuth consent flow for one business (+ optional
// staff) connection. Admin-only: this is the Phase 0 dogfood/concierge flow,
// not a customer-facing self-serve connect.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const staffId = searchParams.get("staffId") || null;
  if (!businessId) {
    return NextResponse.json({ error: "missing businessId" }, { status: 400 });
  }

  const state = Buffer.from(JSON.stringify({ businessId, staffId })).toString("base64url");
  return NextResponse.redirect(getAuthUrl(state));
}
