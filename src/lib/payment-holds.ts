// Server-only helpers for unpaid deposit holds.
//
// A booking waiting for a deposit sits at status='pending' /
// payment_status='pending_payment' and occupies its slot. If the customer walks
// away from the hosted payment page, that hold must die quickly or the slot is
// lost for a day.
//
// The Vercel cron that sweeps these can only run daily on the Hobby plan (see
// CLAUDE.md "Deploy Gotchas"), so availability must NOT depend on it: every read
// path ignores expired holds, and the write path clears them just-in-time.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Minutes an unpaid deposit booking may hold its slot. */
export function holdMinutes(): number {
  const raw = Number(process.env.DEPOSIT_EXPIRE_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 15;
}

/** ISO timestamp before which an unpaid hold counts as dead. */
export function holdCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - holdMinutes() * 60 * 1000).toISOString();
}

export interface HoldRow {
  payment_status?: string | null;
  created_at?: string | null;
}

/**
 * Does this row still block its slot? Expired unpaid holds do not.
 * Everything that is not a pending_payment hold blocks as before.
 */
export function holdIsLive(row: HoldRow, cutoffIso: string = holdCutoffIso()): boolean {
  if (row.payment_status !== "pending_payment") return true;
  if (!row.created_at) return true;
  return row.created_at >= cutoffIso;
}

/** Drop expired unpaid holds from a list of same-day bookings. */
export function withoutExpiredHolds<T extends HoldRow>(rows: T[], cutoffIso: string = holdCutoffIso()): T[] {
  return rows.filter((r) => holdIsLive(r, cutoffIso));
}

/**
 * Release expired unpaid holds for one business/date before writing a booking.
 *
 * The rows are DELETED, not cancelled. `bookings_slot_unique` is
 * (business_id, appointment_date, appointment_time) with no status predicate, so
 * a cancelled row keeps its slot locked forever — the next customer would hit a
 * duplicate-key error on a slot nobody holds. An unpaid hold never became a real
 * booking (no money, no confirmation), so there is nothing to keep.
 *
 * Best-effort: a failure here must never block the booking itself.
 */
export async function releaseExpiredHolds(
  supabase: SupabaseClient,
  businessId: string,
  date: string,
): Promise<void> {
  try {
    await supabase
      .from("bookings")
      .delete()
      .eq("business_id", businessId)
      .eq("appointment_date", date)
      .eq("payment_status", "pending_payment")
      .lt("created_at", holdCutoffIso());
  } catch (e) {
    console.error("releaseExpiredHolds failed (non-fatal):", e);
  }
}
