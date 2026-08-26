"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/hub/ui/brand-mark";
import { Button } from "@/components/hub/ui/button";
import {
  getDict,
  otherLocale,
  pathFor,
  type Locale,
} from "@/lib/marketing/i18n";
import { cn } from "@/lib/hub/cn";

// The shipped page's four (Problem / Solution / Add ons / Pricing), with "What
// we build" standing in for the retired "Who it's for" — that section's job now
// belongs to the Booking Website card. FAQ is deliberately not here: five links
// is already the most a 375px header can carry without the CTA shrinking.
const NAV_LINKS = [
  { id: "problem", href: "#problem" },
  { id: "how", href: "#how-it-works" },
  { id: "product", href: "#product" },
  { id: "addons", href: "#automations" },
  { id: "pricing", href: "#pricing" },
] as const;

/**
 * Same nav as the Hub's, with one addition that matters: bapita.com and the app
 * are now the same Next app on the same origin, so "Log in" is an internal
 * <Link> rather than a jump to another host. Everything else is unchanged —
 * one CTA, repeated, and no second competing call to action.
 */
export function MarketingNav({ locale = "en" }: { locale?: Locale }) {
  const [open, setOpen] = useState(false);
  const t = getDict(locale);

  return (
    <header className="sticky top-0 z-50 border-b border-espresso/[0.08] bg-paper-warm/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href={pathFor(locale)}
          aria-label={t.nav.home}
          className="-ms-1 flex min-h-11 items-center px-1 text-espresso"
        >
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="text-sm font-medium text-espresso/55 transition-colors hover:text-espresso"
            >
              {t.nav.links[link.id]}
            </a>
          ))}
          <Link
            href="/login"
            className="text-sm font-medium text-espresso/55 transition-colors hover:text-espresso"
          >
            {t.nav.login}
          </Link>
          <LangToggle locale={locale} />
          <Button href="#connect" size="sm">
            {t.nav.cta}
          </Button>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <LangToggle locale={locale} />
          <Button href="#connect" size="sm">
            {t.nav.ctaShort}
          </Button>
          <button
            className="-me-2 flex h-11 w-11 items-center justify-center text-espresso"
            onClick={() => setOpen(!open)}
            aria-label={t.nav.menu}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-espresso/[0.08] transition-all duration-300 md:hidden",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <nav className="flex flex-col gap-1 px-5 py-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-hub-md px-3 text-sm font-medium text-espresso/60 transition-colors hover:bg-espresso/[0.05] hover:text-espresso"
            >
              {t.nav.links[link.id]}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-hub-md px-3 text-sm font-medium text-espresso/60 transition-colors hover:bg-espresso/[0.05] hover:text-espresso"
          >
            {t.nav.login}
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * The language switch.
 *
 * A plain <Link> to the other language's URL, not a button that swaps strings
 * in place: /he is a real page with its own metadata and its own entry in the
 * sitemap, and a toggle that only changed React state would leave the Hebrew
 * page invisible to search — which for a business selling in Israel is the
 * whole point of having one.
 *
 * It shows the language you would GET, not the one you are on, because a
 * control labelled with the current state reads as a status, not a switch.
 */
function LangToggle({ locale }: { locale: Locale }) {
  const other = otherLocale(locale);
  const t = getDict(locale);
  return (
    <Link
      href={pathFor(other)}
      hrefLang={other}
      aria-label={t.meta.switchLabel}
      data-cta="lang_toggle"
      className="flex min-h-11 min-w-11 items-center justify-center rounded-pill px-2 text-[0.8125rem] font-bold text-espresso/50 transition-colors hover:bg-espresso/[0.06] hover:text-espresso"
    >
      {t.meta.switchTo}
    </Link>
  );
}
