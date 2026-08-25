import type { Metadata } from "next";
import Script from "next/script";

import { MarketingNav } from "@/components/marketing/nav";
import { Hero, ProofBar } from "@/components/marketing/hero";
import { Proof } from "@/components/marketing/proof";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { WhatWeBuild } from "@/components/marketing/what-we-build";
import { Addons } from "@/components/marketing/addons";
import { Testimonials } from "@/components/marketing/testimonials";
import { Pricing } from "@/components/marketing/pricing";
import { MarketingFooter } from "@/components/marketing/footer";
import { FAQ } from "@/components/hub/faq";
import { Connect } from "@/components/hub/connect";
import { HOME_FAQS } from "@/lib/marketing/faqs";

/**
 * bapita.com — the marketing home (Batch 3b).
 *
 * Two things merged here. The CONTENT is the shipped book.bapita.com homepage:
 * same argument, same sections, same copy, same prices. The DESIGN is the v3
 * Hub's — one warm page spine, two-tone chapter headlines, framed product
 * surfaces, the `fx-*` clip loops — which was the best asset the retired suite
 * page had and is now what this product is dressed in.
 *
 * What changed in the port, beyond the visual language:
 *  - The old page was 3,028 lines in one file with ~1,100 lines of scoped CSS
 *    and a hand-rolled DOM script for every interaction. It is section
 *    components now, and every interaction is React. The original is archived
 *    verbatim at /legacy (noindex) until nobody needs to diff against it.
 *  - Audience widened from "barbers, salons & coaches" to salons, short term
 *    rentals, clinics and restaurants — the point of the relaunch. That claim
 *    started life as its own <Audiences> section and now lives inside the
 *    Booking Website card, which cycles through all four on its own: the mock
 *    visibly becomes each business, which is a stronger version of the same
 *    argument for a third of the page height. One added FAQ covers stays.
 *  - The EN/HE toggle is gone with the script that drove it. This page is
 *    English; the tenant booking pages it sells are already bilingual.
 *
 * Reading order is the argument: what it is → what it costs you today → how you
 * get it → what we build → what you can add to it → what it costs → who's
 * already running it → objections → close. Add-ons follow the
 * build directly because the third thing we build IS the add-ons: splitting
 * them with the proof rail made the reader meet the same idea twice, ten
 * screens apart.
 *
 * The scroll-driven set pieces are the Hub's, not re-creations of them: the
 * pinned pita hero (with the four kinds of business falling in instead of the
 * four products), the "Work smarter" display band, the sticky three-card deck,
 * the animated stat rail, and the pita pricing calculator (filled with add-ons
 * instead of tools).
 */

const SITE_URL = "https://bapita.com";
const TITLE = "Bapita | Your business online. Built for you.";
const DESCRIPTION =
  "Bapita builds your booking website, owner dashboard and automations, then keeps them running. For salons, short term rentals, clinics and restaurants in Israel. No tech needed.";
const OG_DESCRIPTION =
  "A booking website, owner dashboard, and automations, built for your business and kept running. No tech needed.";
const OG_IMAGE = `${SITE_URL}/img/og-image.png?v=2`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
    languages: { en: SITE_URL, he: SITE_URL, "x-default": SITE_URL },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Bapita",
    title: TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

// SoftwareApplication + Organization as before, plus FAQPage: the answers are
// already written to stand alone, and this is what puts them in AI answers and
// in the "People also ask" box. Keep in step with HOME_FAQS.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Bapita",
      url: SITE_URL,
      description:
        "Bapita builds a booking website, owner dashboard, and automations for businesses that take bookings: salons, short term rentals, clinics and restaurants. No tech skills needed.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        priceCurrency: "ILS",
        price: "200",
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@type": "Organization",
      name: "Bapita",
      url: SITE_URL,
      logo: `${SITE_URL}/bapita-icon.svg`,
      email: "info.bapita@gmail.com",
      description:
        "Done for you booking websites for salons, short term rentals, clinics and restaurants in Israel.",
      areaServed: "IL",
      knowsLanguage: ["en", "he"],
      sameAs: ["https://instagram.com/bapita", "https://www.facebook.com/bapita"],
    },
    {
      "@type": "FAQPage",
      mainEntity: HOME_FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ],
};

export default function MarketingHomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        defer
        data-domain="bapita.com"
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />

      <MarketingNav />
      <main>
        <Hero />
        <ProofBar />
        <Proof />
        <HowItWorks />
        <WhatWeBuild />
        <Addons />
        <Pricing />
        <Testimonials />
        <FAQ
          items={HOME_FAQS}
          lead="Questions."
          trail="Straight answers."
          wash="wash-clay"
        />
        <Connect
          lead="Ready to go live?"
          trail="It starts with one call."
          blurb="Thirty minutes. Tell us what you sell, how you take bookings now and what you want to fix, and you leave with a straight number. No pressure, no commitment."
        />
      </main>
      <MarketingFooter />
    </>
  );
}
