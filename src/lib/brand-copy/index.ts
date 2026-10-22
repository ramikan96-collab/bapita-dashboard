/**
 * Per-business "brand copy" packs: approved SEO copy in both languages, kept in
 * code next to the page that renders it. The packs themselves are listed in
 * ./registry (server side); this file is types and helpers only, safe to import
 * from client components without shipping every pack to every page.
 *
 * A business with a pack gets real, server-rendered language URLs —
 * book.bapita.com/<slug> is English, /<slug>/he is Hebrew, and the same for
 * every published extra page (/<slug>/he/<page>). Everyone else keeps the one
 * bilingual URL with the client-side toggle, untouched.
 *
 * Copy comes verbatim from the marketing side (Debby) after Rami's approval.
 * Do not reword it here; a string that does not fit the UI goes back to them.
 */

export type CopyLang = "en" | "he";

export interface FaqItem {
  q: string;
  a: string;
}

export interface HomeCopy {
  title: string;
  description: string;
  h1: string;
  intro: string;
  about: string;
  location: string;
  faq: FaqItem[];
  /** Alt for the hero and the share image. */
  heroAlt: string;
}

export interface UnitCopy {
  title: string;
  description: string;
  intro: string;
}

export interface BrandCopy {
  /** Brand name in both languages: header, H1 area, title suffix, JSON-LD, og:site_name. */
  name: string;
  /** Date this copy last changed. Feeds sitemap lastmod. */
  updated: string;
  /**
   * The hero rating line only ever shows Google's live numbers. Without them it
   * falls back to the theme's neutral line rather than a hand-typed rating.
   */
  googleRatingOnly: boolean;
  home: Record<CopyLang, HomeCopy>;
  /** Keyed by extra-page slug. */
  units: Record<string, Record<CopyLang, UnitCopy>>;
  /**
   * Photo alt text keyed by storage file name, minus the upload timestamp and
   * extension: "1790000109112-afe526d7-1.jpg" is "afe526d7-1".
   */
  alts: Record<string, Record<CopyLang, string>>;
}

/**
 * Path of a business page in one language: "/<slug>[/he][/<page>]".
 * English keeps the bare URL that is already indexed.
 */
export function langPath(slug: string, lang: CopyLang, page?: string | null): string {
  return `/${slug}${lang === "he" ? "/he" : ""}${page ? `/${page}` : ""}`;
}

/**
 * Alt text for a storage URL. The file's base name either IS the key
 * ("1791580157783-0") or ends with "-<key>" ("1790000109112-afe526d7-1"), so
 * "afe526d7-1" can never match "afe526d7-11".
 */
export function photoAlt(copy: BrandCopy | null | undefined, src: string | null | undefined, lang: CopyLang): string | undefined {
  if (!copy || !src) return undefined;
  const base = src.split("?")[0].split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? "";
  if (!base) return undefined;
  for (const [key, alt] of Object.entries(copy.alts)) {
    if (base === key || base.endsWith(`-${key}`)) return alt[lang];
  }
  return undefined;
}
