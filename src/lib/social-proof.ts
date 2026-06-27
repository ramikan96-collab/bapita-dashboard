import type { Business } from "@/types";

/**
 * Builds the hero "social proof" line shown next to the stars.
 *
 * Priority: live Google numbers (rating + review count, auto-populated from the
 * Places API) win. Falls back to the manually-entered stat fields, then to the
 * generic "happy clients" label.
 */
export function getSocialProof(
  business: Business,
  isRtl: boolean,
  fallback: string,
): string {
  const count = business.google_review_count;

  if (business.stat_rating && count != null && count > 0)
    return isRtl
      ? `${business.stat_rating} · ${count} ביקורות בגוגל`
      : `${business.stat_rating} · ${count} Google reviews`;

  if (business.stat_rating && business.stat_clients)
    return isRtl
      ? `${business.stat_rating} · ${business.stat_clients}+ לקוחות מרוצים`
      : `${business.stat_rating} · ${business.stat_clients}+ happy clients`;

  if (business.stat_rating)
    return isRtl ? `${business.stat_rating} ⭐ גוגל` : `${business.stat_rating} Google rating`;

  if (business.stat_clients)
    return isRtl ? `${business.stat_clients}+ לקוחות מרוצים` : `${business.stat_clients}+ happy clients`;

  return fallback;
}
