// The single source of truth for what the primary call-to-action on a public
// tenant page does and says.
//
// A business either takes bookings through Bapita ("native") or sends visitors
// to something else — EasyBuzy, Calendly, a WhatsApp chat ("external"). The mode
// is DERIVED from external_booking_url being set; there is deliberately no
// cta_mode column, because a URL that is present and a URL that is absent
// already say everything. That is the rule shimi-azut-hairstudio has run on in
// production since launch; this module generalises it so the three shared themes
// behave the same way.
//
// Pure — no I/O, no React. Themes call it once during render.

import type { Business } from "@/types";
import type { Translations } from "@/app/[slug]/translations";

export type CtaMode = "native" | "external";

export interface ResolvedCta {
  mode: CtaMode;
  /** The external destination. Always null in native mode. */
  url: string | null;
  /** What the button reads. Never empty. */
  label: string;
  /** Coarse classification of the destination, for analytics. Null in native mode. */
  targetKind: "whatsapp" | "external" | null;
}

// Schemes a CTA is allowed to open. Everything else — javascript:, data:, blob:,
// vbscript:, file: — is rejected.
//
// This is a real boundary, not a formality. Every public tenant page is served from
// book.bapita.com, and so is the owner dashboard. A `javascript:` link stored here
// would run script on that shared origin, in the browser of anyone who taps the
// button — including a logged-in owner of a DIFFERENT business who happens to open
// this page. One tenant would be able to reach another tenant's session. The value
// is owner-supplied and reaches the browser through a column-level anon grant, so
// it is untrusted input no matter who typed it.
const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Parse an owner-supplied CTA destination into something safe to hand to
 * window.open, or null if it cannot be made safe.
 *
 * A bare host ("wa.me/972501234567") gets https:// — owners type links without a
 * scheme constantly, and silently doing nothing looks like a broken feature.
 */
export function normalizeCtaUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  // No scheme at all → assume https. A string containing ":" before any "/" already
  // claims a scheme and must be judged on it, never rescued by prefixing.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol.toLowerCase())) return null;
  // http(s) with no host is not a destination ("https://" alone parses fine).
  if ((parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.host) return null;

  return parsed.toString();
}

/** True when the URL points at a WhatsApp conversation rather than a booking system. */
export function ctaTargetKind(url: string): "whatsapp" | "external" {
  try {
    const host = new URL(url).host.toLowerCase().replace(/^www\./, "");
    if (host === "wa.me" || host === "api.whatsapp.com" || host === "whatsapp.com") return "whatsapp";
  } catch {
    // Not an absolute URL — cannot be a wa.me link, so treat it as a plain external target.
  }
  return "external";
}

interface Options {
  /** Stay businesses rent units; their CTA says "check availability", not "book". */
  stayMode?: boolean;
  /** Hebrew page — prefer cta_label_he. */
  isRtl?: boolean;
  /**
   * Fallback label when the business has set none. Themes differ here:
   * Classic and Clean use t.hero.cta, Dark uses t.hero.bookNow. That copy
   * inconsistency is live today and is preserved deliberately.
   */
  fallback?: string;
}

export function resolveCta(business: Business, t: Translations, opts: Options = {}): ResolvedCta {
  const { stayMode = false, isRtl = false } = opts;

  // A destination that fails validation falls back to native booking. Failing open —
  // rendering a button that does nothing, or one that runs the string — would be worse
  // than quietly using the booking flow the business already has.
  const url = normalizeCtaUrl(business.external_booking_url);

  const custom = isRtl
    ? business.cta_label_he?.trim() || business.cta_label?.trim()
    : business.cta_label?.trim();

  const fallback = opts.fallback ?? (stayMode ? t.stay.heroCta : t.hero.cta);
  const label = custom || fallback;

  return url
    ? { mode: "external", url, label, targetKind: ctaTargetKind(url) }
    : { mode: "native", url: null, label, targetKind: null };
}
