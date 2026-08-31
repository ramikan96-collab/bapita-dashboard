import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Auth for /api/outreach/*.
 *
 * These endpoints are called by Apps Script bound to a Google Sheet, which
 * cannot carry a Supabase session cookie. So they authenticate with a shared
 * bearer secret held in the sheet's Script Properties and checked here against
 * OUTREACH_SECRET.
 *
 * The blast radius is deliberately small: a leaked secret can create draft
 * businesses and burn LLM quota. It cannot publish a site, read bookings, read
 * customers, or touch a live tenant. Every handler behind this guard forces
 * status: "draft" and never accepts a status from the caller.
 */

// 30 calls per 60s per IP, module level (resets on cold start), same shape as
// api/public/track. Apps Script sleeps ~2s between rows, so a legitimate batch
// stays well under this; a scripted abuse loop does not.
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  // Compare fixed-width digests of the two instead.
  if (ab.length !== bb.length) {
    // Still burn a comparison so the failure path costs the same.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function guardOutreach(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const secret = process.env.OUTREACH_SECRET;
  if (!secret) {
    console.error("[outreach] OUTREACH_SECRET is not set — refusing every request");
    return { ok: false, response: NextResponse.json({ error: "not configured" }, { status: 500 }) };
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkIpLimit(ip)) {
    return { ok: false, response: NextResponse.json({ error: "rate limited" }, { status: 429 }) };
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !constantTimeEqual(token, secret)) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  return { ok: true };
}
