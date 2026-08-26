import type { FAQEntry } from "@/components/hub/faq";
import { getDict, type Locale } from "@/lib/marketing/i18n";

/**
 * The homepage FAQ — the six questions from the shipped book.bapita.com page,
 * copy unchanged, plus one added for the audience the relaunch brings in:
 * hosts renting out a property, for whom "appointment" is the wrong word and
 * who otherwise have no way to tell from this page that stays are supported.
 *
 * Mirrored into the FAQPage JSON-LD on the homepage; keep the two in step, and
 * keep every answer self-contained so an AI answer engine can quote one alone.
 */
/** The order they are asked in. Kept here because it is a sequence, not copy. */
const ORDER = [
  "cost",
  "speed",
  "whatsapp",
  "willBook",
  "stays",
  "effort",
  "tech",
] as const;

/**
 * The homepage FAQ in one language. The words live in the locale files; this
 * only decides which questions appear and in what order, which is the same in
 * both languages.
 */
export function homeFaqs(locale: Locale): FAQEntry[] {
  const t = getDict(locale).faq.items;
  return ORDER.map((id) => ({ q: t[id].q, a: t[id].a }));
}
