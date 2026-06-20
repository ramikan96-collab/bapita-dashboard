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
}

export function LangToggle({ lang, setLang, variant, inline }: Props) {
  const bg     = variant === "bordered" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.48)";
  const border = variant === "bordered" ? "1px solid rgba(255,255,255,0.12)" : undefined;
  const position = inline
    ? { flexShrink: 0 as const }
    : { position: "fixed" as const, top: 16, right: 16, zIndex: 200 };
  return (
    <div style={{ background: bg, backdropFilter: "blur(8px)", borderRadius: 9999, padding: "4px", display: "flex", ...(border ? { border } : {}), ...position }}>
      {(["en", "he"] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{ background: lang === l ? "rgba(255,255,255,0.22)" : "none", border: "none", borderRadius: 9999, padding: "3px 11px", cursor: "pointer", fontSize: 12, fontWeight: lang === l ? 700 : 400, color: "#fff", fontFamily: "inherit", transition: "background 0.2s" }}
        >
          {l === "en" ? "EN" : "עב"}
        </button>
      ))}
    </div>
  );
}
