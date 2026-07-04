"use client";

import { createContext, useContext, useCallback, useEffect } from "react";
import { he as dfnsHe, enUS as dfnsEn } from "date-fns/locale";
import type { Locale } from "date-fns";
import { translate, type DashboardLang } from "./dict";

const LangContext = createContext<DashboardLang>("en");

export function LangProvider({
  lang,
  children,
}: {
  lang: DashboardLang;
  children: React.ReactNode;
}) {
  // Single place that flips the document to RTL. No SSR flash-guessing —
  // the root <html> stays a static default and this corrects it post-mount.
  useEffect(() => {
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Current dashboard language, t() for UI strings, and the date-fns locale. */
export function useLang(): {
  lang: DashboardLang;
  t: (key: string) => string;
  dateLocale: Locale;
} {
  const lang = useContext(LangContext);
  const t = useCallback((key: string) => translate(lang, key), [lang]);
  return { lang, t, dateLocale: lang === "he" ? dfnsHe : dfnsEn };
}
