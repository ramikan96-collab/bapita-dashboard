"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/hub/ui/brand-mark";
import { Button } from "@/components/hub/ui/button";
import { cn } from "@/lib/hub/cn";

const NAV_LINKS = [
  { label: "Products", href: "#products" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

/**
 * One CTA, everywhere. The previous nav and hero each offered "Book a free call"
 * and "See what we offer" side by side, splitting intent at the moment the
 * visitor was deciding. The secondary path is now a quiet text link in the hero.
 */
export function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-espresso/[0.08] bg-paper-warm/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* -ms-1 px-1 keeps the mark optically flush with the page gutter while
            giving the link a 44px target. */}
        <Link
          href="/"
          aria-label="Bapita home"
          className="-ms-1 flex min-h-11 items-center px-1 text-espresso"
        >
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-espresso/55 transition-colors hover:text-espresso"
            >
              {link.label}
            </a>
          ))}
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
          open ? "max-h-80" : "max-h-0",
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
        </nav>
      </div>
    </header>
  );
}
