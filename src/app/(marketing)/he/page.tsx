import type { Metadata } from "next";

import { MarketingHome } from "@/components/marketing/home";
import { homeMetadata } from "@/lib/marketing/metadata";

/**
 * bapita.com/he — the same homepage, in Hebrew.
 *
 * A real route rather than a client-side toggle, so it has its own canonical,
 * its own hreflang pair, its own entry in the sitemap and its own Hebrew
 * structured data. A business selling to Israel cannot afford its Hebrew page
 * to be invisible to search, and a toggle that only swapped React state would
 * be exactly that.
 *
 * `lang` and `dir` on <html> are set by the root layout from the
 * `x-booking-locale` header, which `src/middleware.ts` sets for this path.
 */
export const metadata: Metadata = homeMetadata("he");

export default function HebrewHomePage() {
  return <MarketingHome locale="he" />;
}
