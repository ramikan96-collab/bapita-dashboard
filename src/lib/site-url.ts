/**
 * The two hosts this app answers to, and what each one is for.
 *
 * `SITE_URL` (bapita.com) is the front door: the marketing site, the login
 * page and the whole owner dashboard. `BOOKING_URL` (book.bapita.com) is where
 * a customer's booking page lives — book.bapita.com/<slug> — and it is what
 * `src/app/[slug]/page.tsx` already declares as the canonical URL for a
 * business that has no custom domain of its own.
 *
 * dashboard.bapita.com is retired and forwards to the apex.
 *
 * Anything that needs an absolute URL (auth emails, sitemaps, IndexNow, OG
 * tags) must build it from here rather than hardcoding a host, so a future
 * domain move is one edit instead of a grep-and-pray. Pick by audience: an
 * owner-facing link is `siteUrl()`, a link to a booking page is `bookingUrl()`.
 *
 * Overridable via env for previews and local runs. Never derive either of
 * these from the request Host header for anything that ends up in an email or
 * a sitemap: a preview deployment would then mail out links to a URL nobody
 * outside the team can open.
 */
const trim = (u: string) => u.replace(/\/+$/, "");

export const SITE_URL = trim(process.env.NEXT_PUBLIC_SITE_URL || "https://bapita.com");
export const BOOKING_URL = trim(
  process.env.NEXT_PUBLIC_BOOKING_URL || "https://book.bapita.com"
);

/** Bare hosts, e.g. "bapita.com" / "book.bapita.com". */
export const SITE_HOST = new URL(SITE_URL).host;
export const BOOKING_HOST = new URL(BOOKING_URL).host;

/** Absolute URL on the marketing/dashboard host. */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute URL on the booking host — tenant pages and their assets. */
export function bookingUrl(path = "/"): string {
  return `${BOOKING_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
