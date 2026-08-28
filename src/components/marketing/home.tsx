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
import { homeFaqs } from "@/lib/marketing/faqs";
import { homeJsonLd } from "@/lib/marketing/metadata";
import { getDict, type Locale } from "@/lib/marketing/i18n";

/**
 * The bapita.com homepage, in one language.
 *
 * Both routes render this: `/` with locale "en", `/he` with locale "he". There
 * is one page, one argument and one set of scroll set pieces; the only thing
 * that differs between them is which dictionary the sections read from and
 * which direction the browser lays them out in.
 *
 * `dir` is NOT set here. It belongs on <html>, which a route segment cannot
 * reach, so the middleware sets `x-booking-locale` on a /he request and the
 * root layout puts lang and dir on the document — the same mechanism the
 * custom booking domains already use.
 *
 * Reading order is the argument: what it is → what it costs you today → how you
 * get it → what we build → what you can add to it → what it costs → who's
 * already running it → objections → close. Add-ons follow the build directly
 * because the third thing we build IS the add-ons: splitting them with the
 * proof rail made the reader meet the same idea twice, ten screens apart.
 */
export function MarketingHome({ locale }: { locale: Locale }) {
  const t = getDict(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd(locale)) }}
      />
      {/* lazyOnload, not afterInteractive: nothing on this page waits on the
          analytics beacon, and hydration is what the hero's scroll scene is
          waiting for. */}
      <Script
        defer
        data-domain="bapita.com"
        src="https://plausible.io/js/script.js"
        strategy="lazyOnload"
      />

      <MarketingNav locale={locale} />
      <main>
        <Hero locale={locale} />
        <ProofBar locale={locale} />
        <Proof locale={locale} />
        <HowItWorks locale={locale} />
        <WhatWeBuild locale={locale} />
        <Addons locale={locale} />
        <Pricing locale={locale} />
        <Testimonials locale={locale} />
        <FAQ
          items={homeFaqs(locale)}
          lead={t.faq.lead}
          trail={t.faq.trail}
          wash="wash-clay"
        />
        <Connect
          locale={locale}
          lead={t.connect.lead}
          trail={t.connect.trail}
          blurb={t.connect.blurb}
        />
      </main>
      <MarketingFooter locale={locale} />
    </>
  );
}
