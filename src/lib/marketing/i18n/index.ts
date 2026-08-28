import { en } from "./en";
import { he } from "./he";

/**
 * The two languages bapita.com is published in, and the machinery for picking
 * one. English lives at `/`, Hebrew at `/he` — real URLs, so Google indexes the
 * Hebrew page as its own document. A client-side toggle would have been half
 * the work and invisible to search, which for a business selling to Israel is
 * the wrong half to save.
 */
export const LOCALES = ["en", "he"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * The shape every language file must have. `he.ts` is typed against it, so a
 * missing key is a build failure rather than an English sentence surfacing in
 * the middle of a Hebrew page.
 */
export type Dict = typeof en;

const DICTS: Record<Locale, Dict> = { en, he };

export function getDict(locale: Locale): Dict {
  return DICTS[locale];
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "he" ? "rtl" : "ltr";
}

/** Where a locale's homepage lives. */
export function pathFor(locale: Locale): string {
  return locale === "he" ? "/he" : "/";
}

/** The other language, for the toggle. */
export function otherLocale(locale: Locale): Locale {
  return locale === "he" ? "en" : "he";
}

/**
 * Fills `{count}` and `{base}` style slots. Deliberately tiny: the alternative
 * is an i18n library, and the only thing this page interpolates is a number of
 * add-ons and a price that is the same in both languages.
 */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/**
 * The full stop a component adds around a locale string — after a link, or
 * after a <Key> that closes the sentence.
 *
 * Empty in Hebrew. The English page ends a display sentence with a period on
 * purpose; Hebrew headline and lede copy does not carry one, and in RTL that
 * period lands hard against the left edge of the line, where it reads as a
 * stray mark rather than as punctuation. Every Hebrew string in `he.ts` is
 * written without its closing stop for the same reason, so this is the one
 * place a component could still put one back.
 */
export function fullStop(locale: Locale): string {
  return locale === "he" ? "" : ".";
}
