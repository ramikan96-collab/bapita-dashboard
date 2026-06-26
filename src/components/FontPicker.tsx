"use client";

import { useEffect, useRef, useState } from "react";
import { FONT_CATALOG, HEBREW_FALLBACK, fontsHref } from "@/app/[slug]/_shared/fonts";

interface Props {
  /** chosen font name, or "" for theme default */
  value: string;
  onChange: (value: string) => void;
}

const SAMPLE = "אabג Ag";
const ALL_FONTS_HREF = fontsHref(FONT_CATALOG.map((f) => f.name));

function familyOf(name: string): string {
  return name ? `'${name}', ${HEBREW_FALLBACK}` : "inherit";
}

/**
 * Font selector with live preview: each option renders in its own font (Hebrew + Latin),
 * the closed control shows the current pick in its font. Custom dropdown (not a native
 * <select>) so previews render on mobile too. Loads the whole catalog for previews.
 */
export function FontPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options = [{ name: "", label: "Theme default" }, ...FONT_CATALOG.map((f) => ({ name: f.name, label: f.name }))];

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {ALL_FONTS_HREF && <link rel="stylesheet" href={ALL_FONTS_HREF} />}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 44, width: "100%", padding: "0 13px", borderRadius: 11,
          border: `1.5px solid ${open ? "var(--color-amber)" : "var(--color-cream-2)"}`,
          background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, boxSizing: "border-box", transition: "border-color 0.15s", fontFamily: "inherit",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontFamily: familyOf(value), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value || "Theme default"}
          </span>
          {value && (
            <span style={{ fontFamily: familyOf(value), color: "var(--color-muted)", fontSize: 13, flexShrink: 0 }}>{SAMPLE}</span>
          )}
        </span>
        <span style={{ color: "var(--color-muted)", fontSize: 11, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: 48, left: 0, right: 0, zIndex: 50,
            background: "#fff", border: "1.5px solid var(--color-cream-2)", borderRadius: 11,
            boxShadow: "0 8px 28px rgba(0,0,0,0.12)", padding: 5, maxHeight: 320, overflowY: "auto",
          }}
        >
          {options.map((opt) => {
            const selected = opt.name === value;
            return (
              <button
                key={opt.name || "__default"}
                type="button"
                onClick={() => { onChange(opt.name); setOpen(false); }}
                style={{
                  width: "100%", padding: "9px 11px", borderRadius: 8, border: "none",
                  background: selected ? "var(--color-cream-2)" : "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  textAlign: "start", fontFamily: familyOf(opt.name), color: "var(--color-dark)", fontSize: 15,
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "var(--color-cream)"; }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
                <span style={{ color: "var(--color-muted)", fontSize: 14, flexShrink: 0 }}>{opt.name ? SAMPLE : ""}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
