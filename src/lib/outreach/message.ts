import type { Segment } from "./segment";

export type Channel = "whatsapp" | "instagram";

/** Hard cap on the LLM-authored opener. Beyond this it stops reading as a
 *  personal note and starts reading as a pitch deck. */
const OPENER_MAX = 180;

const GREETING  = "היי, יום טוב.";
const SOFT_CTA  = "אם זה מעניין אתכם, אשמח לדבר ולספר עוד.";
const SIGNATURE = "רמי, Bapita";

/**
 * The fixed value line per segment. The segment changes the PITCH, not only the
 * wording:
 *  - no_web   you have no presence, here is one, free to look at.
 *  - ig_only  your Instagram is the storefront, this is the booking layer under
 *             it. Never imply they have nothing; they clearly invested there.
 *  - has_site their site exists, so the angle is bookings, not existence.
 */
const VALUE: Record<Segment, { intro: string; payoff: string }> = {
  no_web: {
    intro:  "בניתי לכם אתר תורים מוכן, אפשר לראות כאן:",
    payoff: "לקוחות קובעים תור לבד, בלי הודעות וטלפונים בשעות העבודה.",
  },
  ig_only: {
    intro:  "האינסטגרם שלכם עושה את העבודה, חסרה שם רק דרך לקבוע תור. בניתי לכם אתר תורים מוכן, אפשר לראות כאן:",
    payoff: "הלקוחות ממשיכים להגיע מהאינסטגרם, רק קובעים תור לבד.",
  },
  has_site: {
    intro:  "בניתי לכם גרסה עם קביעת תורים מובנית, אפשר לראות כאן:",
    payoff: "לקוחות קובעים תור לבד, בלי הודעות וטלפונים בשעות העבודה.",
  },
};

/**
 * Standing copy rule: no dashes or hyphens in customer facing copy, Hebrew and
 * English alike. Enforced twice, in the prompt and here, because the prompt
 * alone will not hold.
 *
 * Applied to the OPENER ONLY. The composed message carries the site URL, whose
 * slug legitimately contains hyphens; stripping those breaks the link.
 */
export function stripDashes(text: string): string {
  return text
    .replace(/[-–—‑‒−]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Truncate at a word boundary rather than mid-word. */
export function capOpener(text: string): string {
  const t = text.trim();
  if (t.length <= OPENER_MAX) return t;
  const cut = t.slice(0, OPENER_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
}

/**
 * Places returns international_phone_number like "+972 54-123-4567".
 * wa.me needs digits only, country code included: "972541234567".
 * A local "054…" form drops the leading zero and gains a 972 prefix.
 */
export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0"))   return `972${digits.slice(1)}`;
  if (digits.length === 9)      return `972${digits}`;
  return "";
}

/** Prefill works on mobile and on WhatsApp Web: one click, message already typed. */
export function waLink(phone972: string, message: string): string {
  return `https://wa.me/${phone972}?text=${encodeURIComponent(message)}`;
}

/** Phone wins, then Instagram. Neither means the row is `needs_channel`. */
export function routeChannel(phone972: string, instagram: string): Channel | null {
  if (phone972) return "whatsapp";
  if ((instagram || "").trim()) return "instagram";
  return null;
}

export interface OpenerInput {
  name: string;
  segment: Segment;
  rating: number | null;
  reviewsCount: number | null;
  notes: string;
  lang: "he" | "en";
}

/**
 * The opener is the ONLY generated part of the message, and it reaches a real
 * business owner under Rami's name. The prompt is therefore mostly a list of
 * things the model may not do.
 */
export function buildOpenerPrompt(input: OpenerInput): { system: string; user: string } {
  const system = `You write the opening line of a short outbound message from Rami, who builds booking websites for small Israeli businesses. You write ONE or TWO sentences and nothing else.

Hard rules:
- Write in ${input.lang === "he" ? "Hebrew" : "English"}. No other language.
- Reference EXACTLY ONE real fact from the data you are given.
- You may use ONLY the fields given below. Never invent services, prices, an owner's name, staff, years in business, or any claim about the business.
- NEVER use a dash or a hyphen of any kind. Not "-", not "–", not "—". Use a comma or a full stop.
- Maximum ${OPENER_MAX} characters. Shorter is better.
- No greeting, no sign off, no link, no call to action. Those are added around you.
- Warm and plain. Not salesy, no exclamation marks, no emoji.
- Output ONLY a JSON object: {"opener": string}`;

  const facts = [
    `name: ${input.name}`,
    input.rating       !== null ? `google rating: ${input.rating}` : "",
    input.reviewsCount !== null ? `google reviews: ${input.reviewsCount}` : "",
    `segment: ${input.segment}${input.segment === "no_web" ? " (no website at all)" : input.segment === "ig_only" ? " (instagram is their only web presence, never imply they have nothing)" : " (they already have a website, do not say they lack one)"}`,
    input.notes ? `note: ${input.notes}` : "",
  ].filter(Boolean).join("\n");

  return { system, user: facts };
}

/**
 * The six parts. The LLM writes exactly one of them (the opener); everything
 * else is fixed, which is what keeps a batch of forty messages safe to send.
 */
export function composeMessage(input: { opener: string; segment: Segment; siteUrl: string }): string {
  const v = VALUE[input.segment];
  return [
    GREETING,
    capOpener(stripDashes(input.opener)),
    v.intro,
    input.siteUrl,
    v.payoff,
    SOFT_CTA,
    SIGNATURE,
  ].join("\n");
}
