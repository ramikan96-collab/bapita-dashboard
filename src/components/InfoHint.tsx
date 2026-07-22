"use client";

import { useState, useRef, useEffect } from "react";

// Small "i" affordance that reveals a short explanation. Hover on desktop,
// tap on mobile (tap again or tap outside to dismiss). RTL-safe.

export function InfoHint({ text, label = "More info" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button
        type="button"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v); }}
        style={{
          width: 16, height: 16, borderRadius: "50%", padding: 0,
          border: `1.5px solid ${open ? "var(--color-amber)" : "var(--color-cream-2)"}`,
          background: "var(--color-surface)",
          color: open ? "var(--color-amber)" : "var(--color-muted)",
          fontSize: 10, fontWeight: 800, fontStyle: "italic", lineHeight: 1, cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Georgia, serif", transition: "color 0.15s, border-color 0.15s",
        }}
      >i</button>

      {open && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            insetInlineStart: 0,
            zIndex: 60,
            width: 250,
            maxWidth: "72vw",
            background: "var(--color-dark)",
            color: "var(--color-surface)",
            borderRadius: 12,
            padding: "11px 13px",
            fontSize: 12.5,
            fontWeight: 500,
            lineHeight: 1.55,
            letterSpacing: "0.005em",
            boxShadow: "0 10px 30px rgba(30,26,20,0.28)",
            textAlign: "start",
            whiteSpace: "normal",
            cursor: "default",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
