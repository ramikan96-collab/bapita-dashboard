/**
 * What makes a business a demo, in one place.
 *
 * Every guard, sweep and filter in the codebase asks this module rather than writing its own
 * predicate. A demo tenant that is "a demo" to the admin board but not to the email guard is
 * how a real person ends up receiving a booking confirmation from a shop that does not know
 * it exists.
 *
 * See docs/migrations/2026-09-05-demo-expiry.sql for why the clock is the flag.
 */

/** Days a demo lives before the daily sweep deletes it. Spec §6. */
export const DEMO_TTL_DAYS = 30;

export type DemoFields = {
  lead_source?: string | null;
  demo_expires_at?: string | null;
  status?: string | null;
};

/**
 * A demo is a row on the expiry clock. Converting a customer clears the clock, which is what
 * takes them out of every check here at once.
 */
export function isDemo(b: DemoFields | null | undefined): boolean {
  return Boolean(b?.demo_expires_at);
}

export function isExpiredDemo(b: DemoFields | null | undefined, now: Date = new Date()): boolean {
  if (!b?.demo_expires_at) return false;
  const t = Date.parse(b.demo_expires_at);
  return Number.isFinite(t) && t < now.getTime();
}

/** The timestamp to stamp on a demo at creation. */
export function demoExpiryFrom(now: Date = new Date(), days: number = DEMO_TTL_DAYS): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * The three conditions the nightly DELETE requires, all of them.
 *
 * This is deliberately narrower than `isDemo`. A sweep is a DELETE against the production
 * table that holds real customers, so it does not run on "the clock passed" alone: the row
 * must also still be an outreach draft. A demo that somebody published, or whose lead_source
 * was changed, is a row a human has touched — it is left alone and reported rather than
 * deleted quietly.
 */
export function isSweepable(b: DemoFields | null | undefined, now: Date = new Date()): boolean {
  return (
    isExpiredDemo(b, now) && b?.lead_source === "outreach" && b?.status === "draft"
  );
}
