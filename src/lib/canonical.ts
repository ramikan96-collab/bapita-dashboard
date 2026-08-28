/**
 * Resolve the canonical/OG URL for a business page.
 *
 * Whenever a business has a verified custom domain, every SEO signal points at
 * that domain — even the book.bapita/<slug> copy — so Google consolidates all
 * authority onto the brand domain instead of the two hosts competing.
 * Businesses without a verified custom domain keep their book.bapita slug URL.
 *
 * Keyed purely off verified DB fields, so slug-only clients are never affected.
 * Metadata, JSON-LD and the sitemap all call this so they can never disagree —
 * a canonical pointing at the wrong host silently blocks indexing (2026-07-17).
 *
 * `subPath` is the extra page's slug for a multi-page URL. Omitted = homepage.
 */
export function resolveCanonical(
  slug: string,
  business: { custom_domain?: string | null; custom_domain_verified?: boolean | null },
  subPath?: string
) {
  const domain = business.custom_domain?.replace(/^www\./, "") ?? "";
  const hasCustomDomain = !!domain && business.custom_domain_verified === true;
  const canonicalBase = hasCustomDomain
    ? `https://www.${domain}`
    : "https://book.bapita.com";

  const sub = subPath?.trim().replace(/^\/+/, "");
  const pageUrl = hasCustomDomain
    ? `${canonicalBase}/${sub ?? ""}`
    : `${canonicalBase}/${slug}${sub ? `/${sub}` : ""}`;

  return { canonicalBase, pageUrl, hasCustomDomain, domain };
}
