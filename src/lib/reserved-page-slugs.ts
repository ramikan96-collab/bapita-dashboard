// Second-level slugs a business can never use for an extra page, i.e. the
// <page> in book.bapita.com/<business>/<page>.
//
// Deliberately SEPARATE from reserved-slugs.ts. That file guards first-level
// tenant slugs against real app routes; this one guards page slugs against
// paths we intend to serve under a tenant later. The two lists have different
// reasons to change and must not be merged.
export const RESERVED_PAGE_SLUGS: Set<string> = new Set([
  // Phase 3.2 puts /legal/privacy and /legal/terms under each tenant.
  "legal",
]);

export function isReservedPageSlug(slug: string): boolean {
  return RESERVED_PAGE_SLUGS.has(slug.trim().toLowerCase());
}

/** lowercase, a-z 0-9 and hyphens, no leading/trailing/doubled hyphen. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PageSlugError = "empty" | "format" | "reserved" | "length";

/** null when the slug is usable. Uniqueness is checked separately (DB constraint is the backstop). */
export function validatePageSlug(raw: string): PageSlugError | null {
  const slug = raw.trim().toLowerCase();
  if (!slug) return "empty";
  if (slug.length > 60) return "length";
  if (!SLUG_RE.test(slug)) return "format";
  if (isReservedPageSlug(slug)) return "reserved";
  return null;
}

export function pageSlugErrorMessage(err: PageSlugError): string {
  switch (err) {
    case "empty":    return "Give the page a URL slug.";
    case "length":   return "Slug is too long (60 characters max).";
    case "reserved": return "That slug is reserved by Bapita. Pick another.";
    case "format":   return "Use lowercase letters, numbers and hyphens only, e.g. deluxe-suite.";
  }
}
