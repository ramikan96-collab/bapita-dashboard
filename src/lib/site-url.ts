/**
 * The one host this app answers to.
 *
 * book.bapita.com and dashboard.bapita.com are retired: the whole product —
 * marketing, dashboard, and every tenant booking page — now lives on the apex.
 * Anything that needs an absolute URL (auth emails, sitemaps, IndexNow, OG
 * tags) must build it from here rather than hardcoding a host, so a future
 * domain move is one edit instead of a grep-and-pray.
 *
 * Overridable via NEXT_PUBLIC_SITE_URL for previews and local runs. Never
 * derive this from the request Host header for anything that ends up in an
 * email or a sitemap: a preview deployment would then mail out links to a
 * URL nobody outside the team can open.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://bapita.com"
).replace(/\/+$/, "");

/** Bare host of SITE_URL, e.g. "bapita.com". */
export const SITE_HOST = new URL(SITE_URL).host;

/** Absolute canonical URL for an app-relative path. */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
