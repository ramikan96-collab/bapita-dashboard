"use client";
import type { Lang } from "../translations";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** "bordered" = Dark theme's glass pill (light bg + border) */
  variant?: "bordered";
  /** inline = render as a static flex child (for embedding in a sticky header)
   *  instead of fixed top-right. Used by themes that have their own header. */
  inline?: boolean;
  /**
   * Each language's own URL, for a business that has them (lib/brand-copy).
   * The toggle then loads that URL instead of switching in place. A plain <a>,
   * not <Link>: <html lang/dir> is set by the root layout, which a client-side
   * navigation never re-renders.
   */
  hrefs?: Record<Lang, string> | null;
}

export function LangToggle({ lang, setLang, variant, inline, hrefs }: Props) {
  const bg     = variant === "bordered" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.48)";
  const border = variant === "bordered" ? "1px solid rgba(255,255,255,0.12)" : undefined;
  const position = inline
    ? { flexShrink: 0 as const }
    : { position: "fixed" as const, top: 16, right: 16, zIndex: 200 };
  return (
    <div style={{ background: bg, backdropFilter: "blur(8px)", borderRadius: 9999, padding: "4px", display: "flex", ...(border ? { border } : {}), ...position }}>
      {(["en", "he"] as Lang[]).map(l => {
        const style = { background: lang === l ? "rgba(255,255,255,0.22)" : "none", border: "none", borderRadius: 9999, padding: "3px 11px", cursor: "pointer", fontSize: 12, fontWeight: lang === l ? 700 : 400, color: "#fff", fontFamily: "inherit", transition: "background 0.2s", textDecoration: "none" };
        const label = l === "en" ? "EN" : "עב";
        return hrefs ? (
          <a key={l} href={hrefs[l]} hrefLang={l} lang={l} aria-current={lang === l ? "page" : undefined} style={style}>
            {label}
          </a>
        ) : (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={style}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
