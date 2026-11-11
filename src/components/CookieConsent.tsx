"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Google Analytics loads only after the visitor accepts (Israel's Privacy
// Protection Law, Amendment 13). Until then no googletagmanager script is in the
// page. The choice is kept in localStorage; if storage is blocked the choice
// lasts for the current page view only and the banner returns next visit.

const GA_ID = "G-XESDNYB9T6";
const STORAGE_KEY = "bapita-cookie-consent";

type Choice = "accepted" | "declined";

const COPY = {
  en: {
    region: "Cookie notice",
    text: "We use analytics cookies to understand how the site is used, only if you accept.",
    more: "Learn more",
    accept: "Accept",
    decline: "Decline",
  },
  he: {
    region: "הודעת עוגיות",
    text: "אנחנו משתמשים בעוגיות ניתוח כדי להבין איך משתמשים באתר, רק אם תאשרו.",
    more: "מידע נוסף",
    accept: "אישור",
    decline: "דחייה",
  },
};

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

function writeChoice(c: Choice) {
  try {
    localStorage.setItem(STORAGE_KEY, c);
  } catch {
    /* storage blocked: the choice lasts for this page view only */
  }
}

// First path segments that are app routes, not a business slug.
const NOT_A_SLUG = new Set([
  "he", "hub", "legacy", "privacy", "terms", "pay", "login", "auth", "api", "admin", "cancel", "calendar", "clients",
  "extras", "financials", "insights", "new-booking", "profile", "settings", "usage", "pricing", "about", "features", "blog",
]);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** A tenant's own privacy notice on tenant pages, Bapita's /privacy elsewhere. */
function privacyHref(pathname: string, search: URLSearchParams, lang: "en" | "he"): string {
  const seg = pathname.split("/").filter(Boolean);
  let slug: string | null = null;
  if (seg[0] === "pay") {
    const s = seg[1] === "sample" ? seg[2] : search.get("s");
    if (s && SLUG_RE.test(s)) slug = s;
  } else if (seg[0] && !NOT_A_SLUG.has(seg[0]) && SLUG_RE.test(seg[0])) {
    slug = seg[0];
  }
  return slug ? `/${slug}/legal/privacy?lang=${lang}` : "/privacy";
}

/** Best-effort removal of the Google Analytics cookies when a choice is withdrawn. */
function clearGaCookies() {
  try {
    const host = location.hostname;
    const parts = host.split(".");
    const domains = [host, ...(parts.length > 2 ? [parts.slice(-2).join(".")] : [])].flatMap((d) => [d, `.${d}`]);
    for (const c of document.cookie.split(";")) {
      const n = c.split("=")[0].trim();
      if (n === "_ga" || n.startsWith("_ga_") || n === "_gid") {
        for (const d of domains) document.cookie = `${n}=; Max-Age=0; path=/; domain=${d}`;
        document.cookie = `${n}=; Max-Age=0; path=/`;
      }
    }
  } catch {
    /* ignore */
  }
}

export function CookieConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<"en" | "he">("en");
  const [search, setSearch] = useState<URLSearchParams>(() => new URLSearchParams());
  const [barH, setBarH] = useState(0);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reading storage and the URL after mount keeps the server HTML and the first client render identical.
    /* eslint-disable react-hooks/set-state-in-effect */
    setChoice(readChoice());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const l = q.get("lang") || document.documentElement.lang;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(l === "he" ? "he" : "en");
    setSearch(q);
  }, [pathname]);

  const showing = ready && choice === null;

  // While the bar is up, tell the floating booking button to sit above it; the
  // spacer below keeps the page's last lines from hiding underneath it.
  useEffect(() => {
    if (!showing || !bar.current) return;
    const el = bar.current;
    const apply = () => {
      document.documentElement.style.setProperty("--cookie-banner-h", `${el.offsetHeight}px`);
      setBarH(el.offsetHeight);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--cookie-banner-h");
      setBarH(0);
    };
  }, [showing]);

  function decide(c: Choice) {
    writeChoice(c);
    setChoice(c);
  }

  const t = COPY[lang];

  return (
    <>
      {choice === "accepted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}
      {showing && <div aria-hidden="true" style={{ height: barH }} />}
      {showing && (
        <div
          ref={bar}
          role="region"
          aria-label={t.region}
          dir={lang === "he" ? "rtl" : "ltr"}
          lang={lang}
          style={{
            position: "fixed", bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 60,
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "6px 12px",
            padding: "10px 14px", background: "#1E1A14", color: "#fff", fontSize: 13, lineHeight: 1.4,
            boxShadow: "0 -2px 12px rgba(0,0,0,0.25)",
          }}
        >
          <span>
            {t.text}{" "}
            <a href={privacyHref(pathname || "/", search, lang)} style={{ color: "#fff", textDecoration: "underline" }}>{t.more}</a>
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => decide("accepted")}
              style={{ minHeight: 36, padding: "0 16px", borderRadius: 9999, border: "1.5px solid #fff", background: "#fff", color: "#1E1A14", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
            >{t.accept}</button>
            <button
              type="button"
              onClick={() => decide("declined")}
              style={{ minHeight: 36, padding: "0 16px", borderRadius: 9999, border: "1.5px solid #fff", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
            >{t.decline}</button>
          </span>
        </div>
      )}
    </>
  );
}

/** Lets a visitor withdraw or change the choice: clears it and reloads so the banner comes back. */
export function CookieChoiceReset({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        clearGaCookies();
        window.location.reload();
      }}
      style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", textDecoration: "underline", cursor: "pointer" }}
    >{label}</button>
  );
}
