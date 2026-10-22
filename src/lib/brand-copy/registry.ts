import "server-only";
import type { BrandCopy } from "./index";
import { goodLivingHerzeliya } from "./good-living-herzeliya";
import { hasBrandCopy, type BrandCopySlug } from "./slugs";

// Which businesses have a brand copy pack. Server side only: a page passes its
// own pack down as a prop, so no client bundle carries anyone else's copy.
// Keyed by the plain list in ./slugs, so adding a pack means adding its slug there.
const PACKS: Record<BrandCopySlug, BrandCopy> = {
  "good-living-herzeliya": goodLivingHerzeliya,
};

export function brandCopy(slug: string | null | undefined): BrandCopy | null {
  return hasBrandCopy(slug) ? PACKS[slug] : null;
}

/** Slugs with language URLs, for the sitemap. */
export function brandCopySlugs(): string[] {
  return Object.keys(PACKS);
}
