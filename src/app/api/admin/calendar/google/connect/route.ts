import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google-calendar";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];
export const OAUTH_STATE_COOKIE = "gcal_oauth_nonce";

// GET — kicks off the Google OAuth consent flow for one business (+ optional
// staff) connection. Admin-only: this is the Phase 0 dogfood/concierge flow,
// not a customer-facing self-serve connect.
//
// `state` carries a random nonce that's also set as an HttpOnly cookie. The
// callback rejects unless the two match — without this, a crafted link could
// get a logged-in admin to complete a Google consent grant that attaches to
// an attacker-chosen businessId/staffId (state is otherwise just an unsigned
// query param the requester fully controls).
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

  const nonce = crypto.randomBytes(32).toString("base64url");
  const state = Buffer.from(JSON.stringify({ businessId, staffId, nonce })).toString("base64url");

  const res = NextResponse.redirect(getAuthUrl(state));
  res.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/admin/calendar/google",
    maxAge: 600,
  });
  return res;
}
