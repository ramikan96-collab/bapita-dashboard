import type { Metadata } from "next";

import { MarketingHome } from "@/components/marketing/home";
import { homeMetadata } from "@/lib/marketing/metadata";

/**
 * bapita.com — the marketing home, in English.
 *
 * The page itself is `<MarketingHome>`, shared with `/he`. This file is the
 * English route: its metadata, its canonical, and nothing else. Everything that
 * used to live here — the JSON-LD, the section order, the analytics tag — moved
 * into the shared component when the Hebrew route was added, because two copies
 * of a page argument drift within a week.
 *
 * The CONTENT is the shipped book.bapita.com homepage: same argument, same
 * sections, same prices. The DESIGN is the v3 Hub's — one warm page spine,
 * two-tone chapter headlines, framed product surfaces, the `fx-*` clip loops.
 * The original page is archived verbatim at /legacy (noindex).
 */
export const metadata: Metadata = homeMetadata("en");

export default function MarketingHomePage() {
  return <MarketingHome locale="en" />;
}
