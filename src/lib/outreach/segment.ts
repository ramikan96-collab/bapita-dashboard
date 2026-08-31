/**
 * Which pitch a prospect gets. Derived from the Places `website` field, which
 * is the single most predictive thing Google tells us about an Israeli
 * appointment business.
 */
export type Segment = "no_web" | "ig_only" | "has_site";

/**
 * no_web   — Google has no website field. Strongest pitch.
 * ig_only  — the "website" is an Instagram profile or a Linktree. Very common
 *            in this segment, and the pitch must never imply they have nothing:
 *            they clearly invested in Instagram.
 * has_site — a real site exists. The angle is bookings, not existence.
 */
export function segmentFor(website: string | null | undefined): Segment {
  const w = (website ?? "").trim().toLowerCase();
  if (!w) return "no_web";
  if (/(^|\/\/|\.)instagram\.com(\/|$)/.test(w) || /(^|\/\/|\.)linktr\.ee(\/|$)/.test(w)) {
    return "ig_only";
  }
  return "has_site";
}
