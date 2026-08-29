import type { Metadata } from "next";

import { getDict, pathFor, type Locale } from "@/lib/marketing/i18n";
import { homeFaqs } from "@/lib/marketing/faqs";

const SITE_URL = "https://bapita.com";
const OG_IMAGE = `${SITE_URL}/img/og-image.png?v=2`;

/** Absolute URL of a locale's homepage. */
function urlFor(locale: Locale): string {
  return locale === "en" ? SITE_URL : `${SITE_URL}${pathFor(locale)}`;
}

/**
 * Head tags for one language's homepage.
 *
 * The `alternates` block is what makes this two pages rather than one page with
 * a switch: each declares its own canonical and points at the other with
 * hreflang, so Google indexes the Hebrew page for Hebrew queries instead of
 * treating it as a duplicate of the English one. `x-default` goes to English
 * because that is what an unmatched locale should land on.
 */
export function homeMetadata(locale: Locale): Metadata {
  const t = getDict(locale).meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: t.title,
    description: t.description,
    alternates: {
      canonical: pathFor(locale),
      languages: {
        en: SITE_URL,
        he: `${SITE_URL}/he`,
        "x-default": SITE_URL,
      },
    },
    openGraph: {
      type: "website",
      url: urlFor(locale),
      siteName: "Bapita",
      locale: locale === "he" ? "he_IL" : "en_US",
      title: t.title,
      description: t.ogDescription,
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.title,
      description: t.ogDescription,
      images: [OG_IMAGE],
    },
    robots: { index: true, follow: true },
  };
}

/**
 * SoftwareApplication + Organization + FAQPage, in the page's own language.
 *
 * The FAQ answers are already written to stand alone, and this is what puts
 * them in AI answers and in the "People also ask" box — so the Hebrew page
 * carries the Hebrew answers, not a translation of the page wrapped around
 * English structured data.
 */
export function homeJsonLd(locale: Locale) {
  const t = getDict(locale);
  const url = urlFor(locale);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Bapita",
        url,
        inLanguage: locale,
        description: t.meta.description,
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
        description: t.footer.blurb,
        areaServed: "IL",
        knowsLanguage: ["en", "he"],
        sameAs: [
          "https://instagram.com/bapita.real",
          "https://www.facebook.com/bapita.real",
          "https://share.google/48ibWfuNRfxhsZOk8",
        ],
      },
      {
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: homeFaqs(locale).map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };
}
