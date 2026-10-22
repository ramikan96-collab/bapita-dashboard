/**
 * Slugs that have a brand copy pack (lib/brand-copy/registry), as a plain list
 * with no copy attached. The middleware and the admin form import this; the
 * registry is server-only. registry.ts is typed against this list, so the two
 * cannot drift.
 */
export const BRAND_COPY_SLUGS = ["good-living-herzeliya"] as const;

export type BrandCopySlug = (typeof BRAND_COPY_SLUGS)[number];

export function hasBrandCopy(slug: string | null | undefined): slug is BrandCopySlug {
  return !!slug && (BRAND_COPY_SLUGS as readonly string[]).includes(slug);
}
