import { createServiceClient } from "@/lib/supabase/service";
import { isSweepable } from "@/lib/outreach/demo";

/**
 * The nightly demo sweep: delete sales demo sites whose clock has run out.
 *
 * Two properties this has that a one-line DELETE does not, both deliberate:
 *
 * 1. **It is a dry run until switched on.** `DEMO_SWEEP_ARMED=true` is required to delete
 *    anything. Until Rami has looked at one night's would-delete list and agreed with it, the
 *    job reports and does nothing. A cron that deletes from the table holding real customers
 *    does not get to be trusted on the strength of a code review.
 *
 * 2. **It re-checks every row in application code before deleting it.** The query already
 *    filters on all three conditions; `isSweepable` then asserts them again on the rows that
 *    came back. Belt and braces on a DELETE against production is not paranoia, it is the
 *    cheapest insurance available.
 */

export type SweepResult = {
  armed: boolean;
  candidates: { id: string; name: string | null; slug: string | null; demo_expires_at: string | null }[];
  deleted: number;
  skipped: { id: string; reason: string }[];
};

export async function sweepExpiredDemos(now: Date = new Date()): Promise<SweepResult> {
  const armed = process.env.DEMO_SWEEP_ARMED === "true";
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, slug, demo_expires_at, lead_source, status")
    .not("demo_expires_at", "is", null)
    .lt("demo_expires_at", now.toISOString())
    .eq("lead_source", "outreach")
    .eq("status", "draft");

  if (error) throw new Error(`demo sweep query failed: ${error.message}`);

  const rows = data ?? [];
  const skipped: SweepResult["skipped"] = [];
  const deletable: typeof rows = [];

  for (const row of rows) {
    if (isSweepable(row, now)) deletable.push(row);
    else skipped.push({ id: row.id, reason: "failed the second check — left alone" });
  }

  const candidates = deletable.map((r) => ({
    id: r.id,
    name: r.name ?? null,
    slug: r.slug ?? null,
    demo_expires_at: r.demo_expires_at ?? null,
  }));

  if (!armed || deletable.length === 0) {
    if (candidates.length > 0) {
      console.warn(
        `demo sweep (DRY RUN — set DEMO_SWEEP_ARMED=true to arm): would delete ${candidates.length} — ` +
          candidates.map((c) => c.slug ?? c.id).join(", "),
      );
    }
    return { armed, candidates, deleted: 0, skipped };
  }

  // Services cascade with the business row; if they ever stop doing so, this is the place
  // that has to change, not the caller.
  const { error: delErr } = await supabase
    .from("businesses")
    .delete()
    .in("id", deletable.map((r) => r.id));

  if (delErr) throw new Error(`demo sweep delete failed: ${delErr.message}`);

  console.warn(`demo sweep deleted ${deletable.length}: ${candidates.map((c) => c.slug ?? c.id).join(", ")}`);
  return { armed, candidates, deleted: deletable.length, skipped };
}
