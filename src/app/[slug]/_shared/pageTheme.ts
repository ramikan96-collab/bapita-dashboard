// Palette per theme for the extra pages (multi-page add-on). The three shared
// themes each define their own colours inline; these mirror them so a sub-page
// looks like the site it belongs to instead of like a generic document.
//
// Kept deliberately small: a sub-page is a reading page, not a landing page, so
// it needs a surface, text, muted text, a border and a card — nothing else.

export type ThemeKey = "classic" | "clean" | "dark";

export interface PagePalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  /** Text colour that sits on top of the accent (CTA button label). */
  onAccent: string;
  radius: number;
  dark: boolean;
}

const CLASSIC: PagePalette = {
  bg: "#F8F2E8", surface: "#F0E8D8", text: "#221510", muted: "#6B5B4D",
  border: "rgba(34,21,16,0.12)", onAccent: "#FFFFFF", radius: 14, dark: false,
};

const CLEAN: PagePalette = {
  bg: "#FFFFFF", surface: "#F9F9F9", text: "#111111", muted: "#6B7280",
  border: "#E5E5E5", onAccent: "#FFFFFF", radius: 10, dark: false,
};

const DARK: PagePalette = {
  bg: "#0D0D0D", surface: "#181818", text: "#F0F0F0", muted: "#888888",
  border: "rgba(255,255,255,0.08)", onAccent: "#0D0D0D", radius: 4, dark: true,
};

export function themeKey(templateStyle?: string | null): ThemeKey {
  return templateStyle === "clean" || templateStyle === "dark" ? templateStyle : "classic";
}

export function pagePalette(theme: ThemeKey): PagePalette {
  if (theme === "clean") return CLEAN;
  if (theme === "dark")  return DARK;
  return CLASSIC;
}
