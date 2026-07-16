// Words a business can never use as its slug because they'd collide with
// real app routes (dashboard routes, auth pages, API prefixes, well-known
// static files, and marketing pages).
export const RESERVED_SLUGS: Set<string> = new Set([
  "login",
  "auth",
  "api",
  "admin",
  "cancel",
  "calendar",
  "clients",
  "extras",
  "financials",
  "insights",
  "new-booking",
  "profile",
  "settings",
  "usage",
  "pricing",
  "about",
  "features",
  "blog",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}
