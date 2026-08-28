// Shared inline styles for the admin page editor screens. Mirrors the tokens
// BusinessForm already uses, so the two screens look like one product.
import type React from "react";

export const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)", borderRadius: 16, padding: 20,
  boxShadow: "0 1px 3px rgba(30,26,20,0.06)",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--color-muted)",
  textTransform: "uppercase", letterSpacing: "0.05em",
};

export const inputStyle: React.CSSProperties = {
  height: 44, width: "100%", padding: "0 13px",
  borderRadius: 11, border: "1.5px solid var(--color-cream-2)",
  background: "var(--color-cream)", fontSize: 14,
  color: "var(--color-dark)", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s",
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle, height: "auto", minHeight: 120, padding: "12px 13px", lineHeight: 1.6, resize: "vertical",
};

export const primaryBtn: React.CSSProperties = {
  height: 44, padding: "0 22px", borderRadius: 11, border: "none",
  background: "var(--color-dark)", color: "#fff", fontSize: 14, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};

export const ghostBtn: React.CSSProperties = {
  background: "none", border: "1.5px solid var(--color-cream-2)", cursor: "pointer",
  fontSize: 13, fontWeight: 600, color: "var(--color-muted)",
  padding: "8px 14px", borderRadius: 10, fontFamily: "inherit",
};

/** "Deluxe Suite" -> "deluxe-suite". Latin only; Hebrew titles need a typed slug. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
