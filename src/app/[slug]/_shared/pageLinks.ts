import type { Business, Page } from "@/types";

/** The subset of a page the public homepage needs to link to it. */
export type LinkablePage = Pick<Page, "slug" | "service_id" | "section_key">;

export interface PageLinks {
  /** Href of the detail page for this service, or null when it has none. */
  service(serviceId: string): string | null;
  /** Href of the custom page linked from this section, or null. */
  section(sectionKey: string): string | null;
  /** True when there is at least one link to draw. */
  any: boolean;
}

/**
 * Where a page lives, relative to whichever host the visitor is on.
 *
 * A business with a verified custom domain serves its pages at /<page> (the
 * middleware rewrites them) and its book.bapita copies 308 to that domain, so
 * one relative path is correct on both hosts. Same rule as resolveCanonical —
 * they must not disagree.
 */
export function buildPageLinks(business: Business, pages: LinkablePage[] | undefined): PageLinks {
  const hasCustomDomain = !!business.custom_domain && business.custom_domain_verified === true;
  const base = hasCustomDomain ? "" : `/${business.slug}`;
  const href = (slug: string) => `${base}/${slug}`;

  const byService = new Map<string, string>();
  const bySection = new Map<string, string>();
  for (const p of pages ?? []) {
    if (p.service_id && !byService.has(p.service_id)) byService.set(p.service_id, href(p.slug));
    if (p.section_key && !bySection.has(p.section_key)) bySection.set(p.section_key, href(p.slug));
  }

  return {
    service: (id) => byService.get(id) ?? null,
    section: (key) => bySection.get(key) ?? null,
    any: byService.size > 0 || bySection.size > 0,
  };
}
