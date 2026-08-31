import type { Metadata } from "next";

/**
 * Whether a public tenant page must be kept out of the search index.
 *
 * Two reasons, one rule:
 *  - Demo/template slugs are near-duplicate showcases.
 *  - A business that is not `live` has not signed up. Outreach pitch sites are
 *    created as drafts under the real business's name, and a crawlable pitch
 *    page for a business that never agreed to one is not acceptable. `status`
 *    was already selected on the public page but never gated anything; this is
 *    where it starts to.
 */
export function shouldNoindex(slug: string, status: string | null | undefined): boolean {
  if (/^demo(-|$)/.test(slug)) return true;
  return status !== "live";
}

/** follow:true so a noindexed page still passes link equity to bapita.com. */
export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = { index: false, follow: true };
