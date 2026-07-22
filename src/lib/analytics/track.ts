// First-party analytics tracker for the public booking pages.
// Fires fire-and-forget events to /api/public/track keyed by an anonymous
// browser session id. No PII, no cookies — session id lives in localStorage.

const SID_KEY = "bp_sid";
const SRC_KEY = "bp_src"; // first-touch source + utm, captured once per browser

export type TrackEvent =
  | "page_view"
  | "booking_started"
  | "step_reached"
  | "no_slots"
  | "booking_completed";

interface FirstTouch {
  source: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

function normalizeSource(referrer: string, utmSource?: string): string {
  const ref = (utmSource || referrer || "").toLowerCase();
  if (!ref) return "direct";
  if (ref.includes("instagram") || ref.includes("ig")) return "instagram";
  if (ref.includes("google")) return "google";
  if (ref.includes("whatsapp") || ref.includes("wa.me")) return "whatsapp";
  if (ref.includes("facebook") || ref.includes("fb")) return "facebook";
  if (ref.includes("tiktok")) return "tiktok";
  // Same-origin referrer (internal navigation) counts as direct.
  try {
    if (referrer && new URL(referrer).host === window.location.host) return "direct";
  } catch {}
  return "other";
}

/** Read (or lazily create) the anonymous session id for this browser. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
}

/** First-touch source + utm, captured once and reused for the browser's lifetime. */
function getFirstTouch(): FirstTouch {
  if (typeof window === "undefined") return { source: "direct" };
  try {
    const stored = localStorage.getItem(SRC_KEY);
    if (stored) return JSON.parse(stored) as FirstTouch;

    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get("utm_source") || undefined;
    const utm_medium = params.get("utm_medium") || undefined;
    const utm_campaign = params.get("utm_campaign") || undefined;
    const source = normalizeSource(document.referrer, utm_source);

    const first: FirstTouch = { source, utm_source, utm_medium, utm_campaign };
    localStorage.setItem(SRC_KEY, JSON.stringify(first));
    return first;
  } catch {
    return { source: "direct" };
  }
}

function deviceType(): string {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

interface TrackContext {
  businessId: string;
  slug?: string | null;
  status?: string | null; // skip tracking on draft/preview pages
  lang?: string | null;
}

interface TrackProps {
  step?: string;
  meta?: Record<string, unknown>;
}

/** Fire an analytics event. No-op on the server, on draft pages, or without a business id. */
export function track(event: TrackEvent, ctx: TrackContext, props: TrackProps = {}): void {
  if (typeof window === "undefined") return;
  if (!ctx.businessId || ctx.status === "draft") return;

  try {
    const first = getFirstTouch();
    const payload = {
      business_id: ctx.businessId,
      slug: ctx.slug ?? null,
      session_id: getSessionId(),
      event,
      step: props.step ?? null,
      referrer: document.referrer || null,
      source: first.source,
      utm_source: first.utm_source ?? null,
      utm_medium: first.utm_medium ?? null,
      utm_campaign: first.utm_campaign ?? null,
      device: deviceType(),
      lang: ctx.lang ?? null,
      meta: props.meta ?? null,
    };

    const body = JSON.stringify(payload);
    const url = "/api/public/track";
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // analytics must never break the booking flow
  }
}
