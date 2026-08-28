import Link from "next/link";
import { BrandMark } from "@/components/hub/ui/brand-mark";
import { getDict, type Locale } from "@/lib/marketing/i18n";

/**
 * Footer for the marketing home — the shipped book.bapita.com footer, in the v3
 * design language.
 *
 * Four columns, same as the page that is live today: who we are, where to go on
 * this page, who it is built for, and how to start. The v3 port had replaced it
 * with two thin columns and a list of audience anchors that pointed at a
 * section which no longer exists.
 *
 * The "Built for" column is the one thing that changed on purpose. It listed
 * ten appointment trades, all of them variations on a salon, because that was
 * the whole audience when it shipped. The relaunch sells to stays, clinics and
 * nail & lash studios as well, so the list carries all four rooms — and it stays
 * a list of plain words, not links, because these are not pages we have.
 *
 * "Log in" lives here as well as in the nav: bapita.com and the app are one
 * origin now, and an existing client landing on the marketing page should not
 * have to hunt for the way in.
 */

const SITE_LINKS = [
  { id: "problem", href: "#problem" },
  { id: "how", href: "#how-it-works" },
  { id: "product", href: "#product" },
  { id: "addons", href: "#automations" },
  { id: "pricing", href: "#pricing" },
  { id: "faq", href: "#faq" },
] as const;

const BUILT_FOR = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;

const LEGAL = [
  { href: "/accessibility", id: "accessibility" },
  { href: "/privacy", id: "privacy" },
  { href: "/terms", id: "terms" },
] as const;

function Social({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-clay/15 text-clay/55 transition-colors hover:border-clay/40 hover:text-clay"
    >
      {children}
    </a>
  );
}

export function MarketingFooter({ locale = "en" }: { locale?: Locale }) {
  const year = new Date().getFullYear();
  const t = getDict(locale);

  return (
    <footer id="about" style={{ background: "#16120d" }}>
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-[1.6fr_1fr_1.2fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <BrandMark className="text-clay opacity-90" />
            <p className="mt-3.5 max-w-[300px] text-[0.875rem] leading-relaxed text-clay/45">
              {t.footer.blurb}
            </p>
            <div className="mt-4 flex gap-2">
              <Social href="https://instagram.com/bapita" label="Instagram">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </Social>
              <Social href="https://www.facebook.com/bapita" label="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </Social>
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-clay/40">
              {t.footer.linksTitle}
            </p>
            <ul className="flex flex-col">
              {SITE_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    className="-mx-2 flex min-h-10 items-center rounded-hub-md px-2 text-[0.875rem] font-medium text-clay/50 transition-colors hover:text-clay"
                  >
                    {link.id === "faq" ? t.footer.faq : t.nav.links[link.id]}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="-mx-2 flex min-h-10 items-center rounded-hub-md px-2 text-[0.875rem] font-medium text-clay/50 transition-colors hover:text-clay"
                >
                  {t.nav.login}
                </Link>
              </li>
            </ul>
          </div>

          {/* Built for — words, not links: these are audiences, not pages. */}
          <div>
            <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-clay/40">
              {t.footer.builtForTitle}
            </p>
            <ul className="flex flex-col gap-2">
              {BUILT_FOR.map((id) => (
                <li key={id} className="text-[0.875rem] text-clay/50">
                  {t.footer.builtFor[id]}
                </li>
              ))}
            </ul>
          </div>

          {/* Get started */}
          <div>
            <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-clay/40">
              {t.footer.getStartedTitle}
            </p>
            <a
              href="#connect"
              data-cta="footer"
              className="-mx-2 inline-flex min-h-10 items-center gap-1.5 rounded-hub-md px-2 text-[0.875rem] font-bold text-cinnamon transition-colors hover:text-[#f0a838]"
            >
              {t.nav.cta}
              <span aria-hidden="true">→</span>
            </a>
            <a
              href="mailto:info.bapita@gmail.com"
              className="-mx-2 mt-1 flex min-h-10 items-center rounded-hub-md px-2 text-[0.875rem] text-clay/50 transition-colors hover:text-clay"
            >
              info.bapita@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-clay/[0.08] pt-8">
          <p className="text-xs text-clay/40">
            © {year} Bapita. {t.footer.rights}
          </p>
          <div className="-mx-2 flex flex-wrap gap-3">
            {LEGAL.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center px-2 text-xs text-clay/40 transition-colors hover:text-clay/70"
              >
                {t.footer.legal[link.id]}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
