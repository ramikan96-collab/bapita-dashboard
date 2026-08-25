"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/hub/ui/brand-mark";
import { Button } from "@/components/hub/ui/button";
import { cn } from "@/lib/hub/cn";

// The shipped page's four (Problem / Solution / Add ons / Pricing), with "What
// we build" standing in for the retired "Who it's for" — that section's job now
// belongs to the Booking Website card. FAQ is deliberately not here: five links
// is already the most a 375px header can carry without the CTA shrinking.
const NAV_LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "How it works", href: "#how-it-works" },
  { label: "What we build", href: "#product" },
  { label: "Add ons", href: "#automations" },
  { label: "Pricing", href: "#pricing" },
];

/**
 * Same nav as the Hub's, with one addition that matters: bapita.com and the app
 * are now the same Next app on the same origin, so "Log in" is an internal
 * <Link> rather than a jump to another host. Everything else is unchanged —
 * one CTA, repeated, and no second competing call to action.
 */
export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-espresso/[0.08] bg-paper-warm/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          aria-label="Bapita home"
          className="-ms-1 flex min-h-11 items-center px-1 text-espresso"
        >
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-espresso/55 transition-colors hover:text-espresso"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className="text-sm font-medium text-espresso/55 transition-colors hover:text-espresso"
          >
            Log in
          </Link>
          <Button href="#connect" size="sm">
            Book a free call
          </Button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Button href="#connect" size="sm">
            Book a call
          </Button>
          <button
            className="-me-2 flex h-11 w-11 items-center justify-center text-espresso"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
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
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-hub-md px-3 text-sm font-medium text-espresso/60 transition-colors hover:bg-espresso/[0.05] hover:text-espresso"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-hub-md px-3 text-sm font-medium text-espresso/60 transition-colors hover:bg-espresso/[0.05] hover:text-espresso"
          >
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}
