import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { exchangeCodeForTokens, getUserEmail, storeRefreshToken, deleteRefreshToken } from "@/lib/google-calendar";
import { OAUTH_STATE_COOKIE } from "../connect/route";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

function noncesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// GET — Google redirects here with ?code&state after consent. Admin-only,
// same gate as /connect. Exchanges the code, stores the refresh token in
// Supabase Vault (never in this table directly), and upserts the connection.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");
  const cookieNonce = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // Cleared on every exit path so a stale nonce never lingers past one attempt.
  const clearNonceCookie = (res: NextResponse) => {
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/api/admin/calendar/google", maxAge: 0 });
    return res;
  };

  if (error) {
    return clearNonceCookie(NextResponse.redirect(new URL(`/admin/calendar-dev?error=${encodeURIComponent(error)}`, req.url)));
  }
  if (!code || !stateRaw) {
    return clearNonceCookie(NextResponse.redirect(new URL("/admin/calendar-dev?error=missing_code", req.url)));
  }

  let businessId: string, staffId: string | null;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
    businessId = state.businessId;
    staffId = state.staffId ?? null;
    const nonce = state.nonce;
    if (!businessId) throw new Error("no businessId in state");
    // Binds this callback to the browser that started the /connect flow —
    // without it, `state` is just an unsigned param anyone linking to
    // /connect?businessId=... fully controls (login-CSRF on the OAuth grant).
    if (!nonce || !cookieNonce || !noncesMatch(nonce, cookieNonce)) {
      throw new Error("nonce mismatch");
    }
  } catch {
    return clearNonceCookie(NextResponse.redirect(new URL("/admin/calendar-dev?error=bad_state", req.url)));
  }

  const admin = createServiceClient();

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Happens if this Google account already granted consent before without
      // a fresh `prompt=consent` round trip. Surface it plainly — silently
      // reusing an old (possibly absent) token would be worse.
      return clearNonceCookie(NextResponse.redirect(new URL("/admin/calendar-dev?error=no_refresh_token", req.url)));
    }
    const email = await getUserEmail(tokens.access_token);

    let existingQuery = admin
      .from("calendar_connections")
      .select("id, refresh_token_secret_id")
      .eq("business_id", businessId)
      .eq("provider", "google");
    existingQuery = staffId ? existingQuery.eq("staff_id", staffId) : existingQuery.is("staff_id", null);
    const { data: existing } = await existingQuery.maybeSingle();

    const secretName = `calendar_refresh_${businessId}_${staffId ?? "business"}_${Date.now()}`;
    const secretId = await storeRefreshToken(admin, tokens.refresh_token, secretName);

    if (existing) {
      await admin
        .from("calendar_connections")
        .update({
          refresh_token_secret_id: secretId,
          connected_email: email,
          status: "connected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      // Best-effort cleanup of the old secret — not fatal if it fails.
      deleteRefreshToken(admin, existing.refresh_token_secret_id).catch(() => {});
    } else {
      await admin.from("calendar_connections").insert({
        business_id: businessId,
        staff_id: staffId,
        refresh_token_secret_id: secretId,
        connected_email: email,
        status: "connected",
      });
    }

    return clearNonceCookie(NextResponse.redirect(new URL("/admin/calendar-dev?connected=1", req.url)));
  } catch (e) {
    console.error("Google Calendar callback failed:", (e as Error).message);
    return clearNonceCookie(NextResponse.redirect(new URL("/admin/calendar-dev?error=exchange_failed", req.url)));
  }
}
