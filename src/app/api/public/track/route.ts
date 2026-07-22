import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// First-party analytics ingest for the public booking funnel.
// Public, unauthenticated, fire-and-forget (called via navigator.sendBeacon).
// Writes with the service-role client, which bypasses RLS.

const EVENTS = new Set([
  "page_view",
  "booking_started",
  "step_reached",
  "no_slots",
  "booking_completed",
]);

const STEPS = new Set(["service", "staff", "date", "time", "contact"]);
const SOURCES = new Set(["instagram", "google", "whatsapp", "facebook", "tiktok", "direct", "other"]);
const DEVICES = new Set(["mobile", "tablet", "desktop"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Rate limiting ────────────────────────────────────────────────────────────
// IP-based: 120 events per 60s per IP (module-level; resets on cold start).
// Higher than /book since page_view fires on every load.
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 120) return false;
  entry.count++;
  return true;
}

function clip(v: unknown, max = 512): string | null {
  if (typeof v !== "string" || !v) return null;
  return v.slice(0, max);
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  // Always 204 — analytics must never surface errors to the visitor.
  if (!checkIpLimit(ip)) return new NextResponse(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const businessId = typeof body.business_id === "string" ? body.business_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  const event = typeof body.event === "string" ? body.event : "";

  if (!UUID_RE.test(businessId) || !sessionId || !EVENTS.has(event)) {
    return new NextResponse(null, { status: 204 });
  }

  const step = event === "step_reached" && STEPS.has(String(body.step)) ? String(body.step) : null;
  const source = SOURCES.has(String(body.source)) ? String(body.source) : "other";
  const device = DEVICES.has(String(body.device)) ? String(body.device) : "desktop";

  const row = {
    business_id: businessId,
    slug: clip(body.slug, 128),
    session_id: sessionId.slice(0, 64),
    event,
    step,
    referrer: clip(body.referrer, 1024),
    utm_source: clip(body.utm_source, 128),
    utm_medium: clip(body.utm_medium, 128),
    utm_campaign: clip(body.utm_campaign, 128),
    source,
    device,
    lang: clip(body.lang, 16),
    meta: body.meta && typeof body.meta === "object" ? body.meta : null,
  };

  try {
    const supabase = createServiceClient();
    await supabase.from("page_events").insert(row);
  } catch {
    // swallow — never break the caller
  }

  return new NextResponse(null, { status: 204 });
}
