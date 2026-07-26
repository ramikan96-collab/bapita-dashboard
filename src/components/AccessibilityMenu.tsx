"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FontSize = "normal" | "large" | "xlarge";
type Contrast = "normal" | "high";
type Motion = "normal" | "reduce";
type Focus = "normal" | "strong";

interface A11yPrefs {
  font: FontSize;
  contrast: Contrast;
  motion: Motion;
  focus: Focus;
}

const DEFAULTS: A11yPrefs = { font: "normal", contrast: "normal", motion: "normal", focus: "normal" };
const STORAGE_KEY = "bapita-a11y-prefs";

function applyPrefs(prefs: A11yPrefs) {
  const root = document.documentElement;
  root.setAttribute("data-a11y-font", prefs.font);
  root.setAttribute("data-a11y-contrast", prefs.contrast);
  root.setAttribute("data-a11y-motion", prefs.motion);
  root.setAttribute("data-a11y-focus", prefs.focus);
}

/**
 * Text-link accessibility menu (WCAG 2.0 AA controls: font size, contrast,
 * motion, focus visibility). Renders as a plain footer link + popover —
 * no floating icon, matches how larger sites keep this understated.
 */
export function AccessibilityMenu({ label, rtl }: { label?: string; rtl?: boolean }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS);
  const [isRtl, setIsRtl] = useState(!!rtl);

  useEffect(() => {
    // Reading the server-rendered <html dir> after mount — can't derive this
    // from props/state without risking an SSR/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (rtl === undefined) setIsRtl(document.documentElement.dir === "rtl");
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = { ...DEFAULTS, ...JSON.parse(saved) } as A11yPrefs;
        setPrefs(parsed);
        applyPrefs(parsed);
      }
    } catch {
      /* localStorage unavailable — keep defaults */
    }
  }, [rtl]);

  function update(patch: Partial<A11yPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function reset() {
    setPrefs(DEFAULTS);
    applyPrefs(DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  const text = label ?? (isRtl ? "נגישות" : "Accessibility");

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="a11y-panel"
        style={{
          background: "none", border: "none", padding: 0, font: "inherit",
          fontSize: 12, color: "inherit", opacity: 0.6, cursor: "pointer",
          textDecoration: "underline", textUnderlineOffset: 2,
        }}
      >
        {text}
      </button>

      {open && (
        <div
          id="a11y-panel"
          role="dialog"
          aria-label={isRtl ? "הגדרות נגישות" : "Accessibility settings"}
          style={{
            position: "absolute", bottom: "calc(100% + 8px)",
            [isRtl ? "right" : "left"]: 0,
            width: 260, background: "#fff", color: "#1C1917",
            border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,0.18)", padding: 16,
            textAlign: isRtl ? "right" : "left", zIndex: 300,
            fontSize: 13,
          }}
        >
          <fieldset style={{ border: "none", padding: 0, margin: 0, marginBottom: 12 }}>
            <legend style={{ fontWeight: 700, marginBottom: 6, padding: 0 }}>
              {isRtl ? "גודל טקסט" : "Text size"}
            </legend>
            <div style={{ display: "flex", gap: 6 }}>
              {(["normal", "large", "xlarge"] as FontSize[]).map(size => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={prefs.font === size}
                  onClick={() => update({ font: size })}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 8,
                    border: `1.5px solid ${prefs.font === size ? "#E8920A" : "rgba(0,0,0,0.15)"}`,
                    background: prefs.font === size ? "#E8920A" : "transparent",
                    color: prefs.font === size ? "#fff" : "#1C1917",
                    cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                  }}
                >
                  A{size === "large" ? "+" : size === "xlarge" ? "++" : ""}
                </button>
              ))}
            </div>
          </fieldset>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={prefs.contrast === "high"} onChange={e => update({ contrast: e.target.checked ? "high" : "normal" })} />
            {isRtl ? "ניגודיות גבוהה" : "High contrast"}
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={prefs.motion === "reduce"} onChange={e => update({ motion: e.target.checked ? "reduce" : "normal" })} />
            {isRtl ? "צמצום אנימציות" : "Reduce motion"}
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={prefs.focus === "strong"} onChange={e => update({ focus: e.target.checked ? "strong" : "normal" })} />
            {isRtl ? "הדגשת פוקוס מקלדת" : "Stronger keyboard focus outline"}
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 10 }}>
            <button type="button" onClick={reset} style={{ background: "none", border: "none", color: "#6B6259", textDecoration: "underline", cursor: "pointer", fontSize: 12, padding: 0 }}>
              {isRtl ? "איפוס" : "Reset"}
            </button>
            <Link href="/accessibility" style={{ color: "#E8920A", fontSize: 12, fontWeight: 600 }}>
              {isRtl ? "הצהרת נגישות" : "Accessibility statement"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
