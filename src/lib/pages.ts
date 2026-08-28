// Shared helpers for the multi-page add-on. Pure — safe on the server, in a
// route handler and in the admin UI.

import type { PageContent, PageKind, PageSpec } from "@/types";

export const PAGE_KINDS: PageKind[] = ["detail", "custom"];

/** The public path of a page on the booking host, without a leading slash. */
export function pagePath(businessSlug: string, pageSlug: string): string {
  return `${businessSlug}/${pageSlug}`;
}

const MAX_BODY = 20000;
const MAX_SPECS = 30;
const MAX_IMAGES = 40;

/**
 * Strip anything that could execute if the string ever reached a dangerouslySet
 * sink. Bodies are stored as markdown-lite / plain text; the renderer escapes
 * again on the way out. Two layers, because this is the only free text on the
 * product's public pages.
 */
function plainText(raw: unknown, max = MAX_BODY): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/<\/?[a-z][^>]*>/gi, "")   // tags
    .replace(/&lt;\s*script/gi, "")      // pre-escaped script openers
    .slice(0, max)
    .trim();
  return cleaned || null;
}

function stringList(raw: unknown, max: number): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw.filter((v): v is string => typeof v === "string" && !!v.trim()).slice(0, max);
  return out.length ? out : null;
}

function specList(raw: unknown): PageSpec[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PageSpec[] = [];
  for (const item of raw.slice(0, MAX_SPECS)) {
    if (!item || typeof item !== "object") continue;
    const label = plainText((item as PageSpec).label, 80);
    const value = plainText((item as PageSpec).value, 200);
    if (label && value) out.push({ label, value });
  }
  return out.length ? out : null;
}

/** Accept only known keys, in known shapes, at known sizes. */
export function sanitizePageContent(raw: unknown): PageContent {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    body:           plainText(c.body),
    body_he:        plainText(c.body_he),
    images:         stringList(c.images, MAX_IMAGES),
    hero_image_url: plainText(c.hero_image_url, 500),
    specs:          specList(c.specs),
    specs_he:       specList(c.specs_he),
    cta_label:      plainText(c.cta_label, 60),
    cta_label_he:   plainText(c.cta_label_he, 60),
  };
}
