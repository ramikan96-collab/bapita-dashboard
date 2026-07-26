/**
 * Google Calendar integration — Phase 0 (dogfood).
 * Spec: docs/specs/2026-07-22-google-calendar-integration.md
 *
 * One Bapita-owned OAuth client (GOOGLE_CLIENT_ID/SECRET, server env only) used
 * for every connection. Per-connection refresh token lives in Supabase Vault —
 * this file never sees a raw token outside a single request's memory, and never
 * logs one. calendar_connections only stores a vault secret id.
 *
 * Pull: freebusy.query (busy time ranges only, no event bodies — cheap, and
 * naturally immune to the push-loop problem since a pushed event just marks
 * its own slot busy, which the booking row already does).
 * Push: create/delete a tagged event (extendedProperties.private.bapita_booking_id).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const TIMEZONE = "Asia/Jerusalem";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

function clientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID;
  if (!v) throw new Error("GOOGLE_CLIENT_ID is not set");
  return v;
}
function clientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET;
  if (!v) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return v;
}

// dashboard.bapita.com is a retired subdomain that 308-redirects to
// book.bapita.com and drops the query string — an OAuth `code` would be lost
// mid-flow. book.bapita.com is the only host this must ever point at.
export function redirectUri(): string {
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI || "https://book.bapita.com/api/admin/calendar/google/callback";
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`token refresh failed: ${res.status}`);
    (err as Error & { invalidGrant?: boolean }).invalidGrant = res.status === 400 && body.includes("invalid_grant");
    throw err;
  }
  return res.json();
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

// ── Vault access (RPCs defined in the calendar_connections_phase0 migration) ──

export async function storeRefreshToken(admin: SupabaseClient, refreshToken: string, name: string): Promise<string> {
  const { data, error } = await admin.rpc("calendar_store_secret", { p_secret: refreshToken, p_name: name });
  if (error || !data) throw new Error(`vault store failed: ${error?.message}`);
  return data as string;
}

async function readRefreshToken(admin: SupabaseClient, secretId: string): Promise<string> {
  const { data, error } = await admin.rpc("calendar_read_secret", { p_id: secretId });
  if (error || !data) throw new Error(`vault read failed: ${error?.message}`);
  return data as string;
}

export async function deleteRefreshToken(admin: SupabaseClient, secretId: string): Promise<void> {
  await admin.rpc("calendar_delete_secret", { p_id: secretId });
}

// ── Connection-level helpers ───────────────────────────────────────────────

export interface CalendarConnection {
  id: string;
  business_id: string;
  staff_id: string | null;
  refresh_token_secret_id: string;
  calendar_id: string;
  sync_mode: string;
  status: string;
}

// Always re-derives an access token from the stored refresh token rather than
// caching one — Phase 0 volume is low and this avoids a token_expires_at
// column + refresh-race bugs. On invalid_grant, flips the connection to
// needs_reconnect so the admin UI surfaces it instead of failing silently.
async function getAccessToken(admin: SupabaseClient, connection: CalendarConnection): Promise<string> {
  const refreshToken = await readRefreshToken(admin, connection.refresh_token_secret_id);
  try {
    const { access_token } = await refreshAccessToken(refreshToken);
    return access_token;
  } catch (e) {
    if ((e as Error & { invalidGrant?: boolean }).invalidGrant) {
      await admin.from("calendar_connections").update({ status: "needs_reconnect", updated_at: new Date().toISOString() }).eq("id", connection.id);
    }
    throw e;
  }
}

function jerusalemDayBounds(dateISO: string): { timeMin: string; timeMax: string } {
  // dateISO is "YYYY-MM-DD". A UTC noon anchor for that calendar date is safe
  // from off-by-one DST issues, then formatToParts finds the true local
  // midnight boundary either side of it.
  const anchor = new Date(`${dateISO}T12:00:00Z`);
  const offsetMinutes = jerusalemUtcOffsetMinutes(anchor);
  const startUtc = new Date(`${dateISO}T00:00:00Z`).getTime() - offsetMinutes * 60_000;
  const endUtc = startUtc + 24 * 60 * 60_000;
  return { timeMin: new Date(startUtc).toISOString(), timeMax: new Date(endUtc).toISOString() };
}

function jerusalemUtcOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const utcHH = at.getUTCHours();
  const utcMM = at.getUTCMinutes();
  let diff = (hh * 60 + mm) - (utcHH * 60 + utcMM);
  if (diff < -720) diff += 1440;
  if (diff > 720) diff -= 1440;
  return diff;
}

function toJerusalemHHmm(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh}:${mm}`;
}

export interface BusyBlock { appointment_time: string; duration: number }

const FREEBUSY_TTL_MS = 5 * 60 * 1000;

/**
 * Busy blocks (as {appointment_time, duration}, same shape the slots route
 * already merges bookings/blocked_times in) for one connection on one date.
 * Cached per connection+date; refetches from Google only once the cache is
 * stale. Never throws — any Google/Vault failure returns [] so a calendar
 * outage can never block the booking flow.
 */
export async function getGoogleBusyBlocks(
  admin: SupabaseClient,
  businessId: string,
  staffId: string | null,
  dateISO: string,
): Promise<BusyBlock[]> {
  try {
    let query = admin
      .from("calendar_connections")
      .select("id, business_id, staff_id, refresh_token_secret_id, calendar_id, sync_mode, status")
      .eq("business_id", businessId)
      .eq("status", "connected")
      .in("sync_mode", ["pull", "both"]);
    query = staffId ? query.eq("staff_id", staffId) : query.is("staff_id", null);
    const { data: connection } = await query.maybeSingle();
    if (!connection) return [];

    const { timeMin, timeMax } = jerusalemDayBounds(dateISO);

    const { data: cached } = await admin
      .from("calendar_freebusy")
      .select("busy_start, busy_end, expires_at")
      .eq("connection_id", connection.id)
      .gte("busy_end", timeMin)
      .lte("busy_start", timeMax);

    const fresh = (cached ?? []).length > 0 && (cached ?? []).every((r) => new Date(r.expires_at).getTime() > Date.now());
    let ranges: { busy_start: string; busy_end: string }[];

    if (fresh) {
      ranges = cached!;
    } else {
      const accessToken = await getAccessToken(admin, connection as CalendarConnection);
      const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ timeMin, timeMax, timeZone: TIMEZONE, items: [{ id: connection.calendar_id }] }),
      });
      if (!res.ok) {
        ranges = cached && cached.length > 0 ? cached : [];
        return toBusyBlocks(ranges);
      }
      const body = await res.json();
      const busy: { start: string; end: string }[] = body.calendars?.[connection.calendar_id]?.busy ?? [];
      ranges = busy.map((b) => ({ busy_start: b.start, busy_end: b.end }));

      await admin.from("calendar_freebusy").delete().eq("connection_id", connection.id).gte("busy_end", timeMin).lte("busy_start", timeMax);
      if (ranges.length > 0) {
        const expiresAt = new Date(Date.now() + FREEBUSY_TTL_MS).toISOString();
        await admin.from("calendar_freebusy").insert(
          ranges.map((r) => ({ connection_id: connection.id, busy_start: r.busy_start, busy_end: r.busy_end, expires_at: expiresAt }))
        );
      }
    }

    return toBusyBlocks(ranges);
  } catch (e) {
    console.error("getGoogleBusyBlocks failed:", (e as Error).message);
    return [];
  }
}

function toBusyBlocks(ranges: { busy_start: string; busy_end: string }[]): BusyBlock[] {
  return ranges.map((r) => {
    const [sh, sm] = toJerusalemHHmm(r.busy_start).split(":").map(Number);
    const durationMin = Math.max(0, Math.round((new Date(r.busy_end).getTime() - new Date(r.busy_start).getTime()) / 60000));
    return { appointment_time: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`, duration: durationMin };
  });
}

// ── Push: create/delete a tagged event ──────────────────────────────────────

export interface PushBookingInput {
  businessId: string;
  staffId: string | null;
  bookingId: string;
  summary: string;
  dateISO: string; // "YYYY-MM-DD"
  timeHHmm: string; // "HH:mm"
  durationMinutes: number;
}

export async function pushBookingCreated(admin: SupabaseClient, input: PushBookingInput): Promise<void> {
  try {
    let query = admin
      .from("calendar_connections")
      .select("id, business_id, staff_id, refresh_token_secret_id, calendar_id, sync_mode, status")
      .eq("business_id", input.businessId)
      .eq("status", "connected")
      .in("sync_mode", ["push", "both"]);
    query = input.staffId ? query.eq("staff_id", input.staffId) : query.is("staff_id", null);
    const { data: connection } = await query.maybeSingle();
    if (!connection) return;

    const accessToken = await getAccessToken(admin, connection as CalendarConnection);
    const offsetMinutes = jerusalemUtcOffsetMinutes(new Date(`${input.dateISO}T12:00:00Z`));
    const wallAsUtcMs = new Date(`${input.dateISO}T${input.timeHHmm}:00Z`).getTime();
    const startISO = new Date(wallAsUtcMs - offsetMinutes * 60_000).toISOString();
    const endISO = new Date(new Date(startISO).getTime() + input.durationMinutes * 60_000).toISOString();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: input.summary,
          start: { dateTime: startISO, timeZone: TIMEZONE },
          end: { dateTime: endISO, timeZone: TIMEZONE },
          extendedProperties: { private: { bapita_booking_id: input.bookingId } },
        }),
      }
    );
    if (!res.ok) return;
    const event = await res.json();
    if (event.id) {
      await admin.from("bookings").update({ google_cal_event_id: event.id }).eq("id", input.bookingId);
    }
  } catch (e) {
    console.error("pushBookingCreated failed:", (e as Error).message);
  }
}

export async function pushBookingCancelled(admin: SupabaseClient, businessId: string, staffId: string | null, googleEventId: string): Promise<void> {
  try {
    let query = admin
      .from("calendar_connections")
      .select("id, business_id, staff_id, refresh_token_secret_id, calendar_id, sync_mode, status")
      .eq("business_id", businessId)
      .eq("status", "connected")
      .in("sync_mode", ["push", "both"]);
    query = staffId ? query.eq("staff_id", staffId) : query.is("staff_id", null);
    const { data: connection } = await query.maybeSingle();
    if (!connection) return;

    const accessToken = await getAccessToken(admin, connection as CalendarConnection);
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events/${encodeURIComponent(googleEventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (e) {
    console.error("pushBookingCancelled failed:", (e as Error).message);
  }
}
