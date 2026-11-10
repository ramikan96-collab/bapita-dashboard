// Private pay links for stay bookings (spec: docs/specs/2026-11-10-stay-pay-link.md).
//
// The host agrees a price with a guest and sends them /pay/l/<token>. Everything
// that matters — amount, booking, business — lives on the payment_links row; the
// URL carries only an unguessable token. Server-only: every caller uses the
// service-role client and does its own ownership / state checks.
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LINK_MAX_AMOUNT } from "@/lib/payment-links-shared";

export { LINK_DEFAULT_HOURS, LINK_MAX_HOURS, LINK_MAX_AMOUNT, payLinkUrl } from "@/lib/payment-links-shared";

/** 32 random bytes, base64url — 43 chars, not guessable, URL-safe. */
export function newLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens we issue are exactly 43 base64url chars; reject anything else early. */
export function isLinkToken(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);
}

/** Round to agorot and validate. Returns null when the amount is not usable. */
export function normaliseLinkAmount(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.replace(/[,\s₪]/g, "")) : Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n * 100) / 100;
  if (r < 1 || r > LINK_MAX_AMOUNT) return null;
  return r;
}

export interface PaymentLinkRow {
  id: string;
  token: string;
  business_id: string;
  booking_id: string;
  amount: number;
  lang: "en" | "he";
  status: "active" | "paid" | "cancelled";
  expires_at: string;
  paid_at: string | null;
  created_at: string;
}

export const LINK_SELECT = "id, token, business_id, booking_id, amount, lang, status, expires_at, paid_at, created_at";

export type LinkState = "payable" | "paid" | "cancelled" | "expired";

export function linkState(link: Pick<PaymentLinkRow, "status" | "expires_at">, now: Date = new Date()): LinkState {
  if (link.status === "paid") return "paid";
  if (link.status === "cancelled") return "cancelled";
  return new Date(link.expires_at).getTime() > now.getTime() ? "payable" : "expired";
}

export async function loadLinkByToken(supabase: SupabaseClient, token: string): Promise<PaymentLinkRow | null> {
  if (!isLinkToken(token)) return null;
  const { data } = await supabase.from("payment_links").select(LINK_SELECT).eq("token", token).maybeSingle();
  return (data as PaymentLinkRow | null) ?? null;
}

/**
 * The link that governs a booking's online payment, if any: the active one, or
 * else the one already paid. Used by the callback, the reconcile poll and the
 * settle step so they all check the same amount.
 */
export async function loadLinkForBooking(supabase: SupabaseClient, bookingId: string): Promise<PaymentLinkRow | null> {
  const { data } = await supabase
    .from("payment_links")
    .select(LINK_SELECT)
    .eq("booking_id", bookingId)
    .in("status", ["active", "paid"])
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data?.[0] as PaymentLinkRow | undefined) ?? null;
  return row ? { ...row, amount: Number(row.amount) } : null;
}
