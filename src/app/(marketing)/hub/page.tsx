import type { Metadata } from "next";
import { Navigation } from "@/components/hub/navigation";
import { Hero } from "@/components/hub/hero";
import { ProductTabs } from "@/components/hub/product-tabs";
import { HowItWorks } from "@/components/hub/how-it-works";
import { Features } from "@/components/hub/features";
import { Pricing } from "@/components/hub/pricing";
import { FAQ } from "@/components/hub/faq";
import { Connect } from "@/components/hub/connect";
import { Footer } from "@/components/hub/footer";

/**
 * The v3 Hub suite page, demoted (Batch 3b).
 *
 * bapita.com now sells one product to a wider audience, so the four-tool story
 * is no longer the pitch — but it is still the clearest artefact we have of
 * where Book sits in the roadmap, and it is what people who were shown the
 * suite deck expect to find. It stays reachable and stays out of the index:
 * noindex here, `Disallow: /hub` in robots.ts, absent from the sitemap.
 *
 * Deliberately unchanged from the hub app it was lifted from apart from the
 * mechanical port (import paths, namespaced tokens, logical properties). If the
 * suite ever comes back it comes back from here.
 */
export const metadata: Metadata = {
  title: "The Bapita suite | Bapita",
  description:
    "Book, Social, Bots and Reach — the full Bapita suite for local service businesses in Israel.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/hub" },
};

export default function HubSuitePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <ProductTabs />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <Connect />
      </main>
      <Footer />
    </>
  );
}
