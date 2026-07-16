import Link from "next/link";

// Shared chrome for the marketing site (book.bapita.com). Every public
// marketing page (homepage today; pricing/about/etc. later) renders inside
// this layout. Root layout (src/app/layout.tsx) already sets <html>/<body>
// and the Heebo font, so this layout only supplies header + footer.
//
// Nav (in-page section anchors + hamburger mobile menu) and footer content
// are ported from public/home.html (nav ~L1946-1985, footer ~L2922-2995).
// The EN/HE language toggle (`.lang-toggle`, `data-i18n`) is restored too —
// it's a deliberate product decision for the Israeli-owner audience. The
// actual toggle mechanism (I18N dictionary, applyLang/initLang, localStorage
// persistence, dir flip) lives in the inline <script> rendered by
// `InteractivityScript` in page.tsx, not here: this layout has no
// "use client" boundary (it exports shared server-rendered chrome for every
// marketing page, present and future), and per the scoping for this change
// (layout.tsx + page.tsx only) there's no separate client-component file to
// put React state in. Because the script runs `document.querySelectorAll`
// against the whole document (not scoped to <main>), it finds and drives
// these header/footer elements identically to how it drives the page body,
// exactly like the original single-page home.html did.

function BapitaLogo({ className = "h-7 w-auto shrink-0" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 110 90"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 16 Q8 86 55 86 Q102 86 102 16 Z" fill="#E8920A" />
      <rect x="8" y="6" width="94" height="14" rx="7" fill="#B86800" />
      <path
        d="M18 34 Q55 52 92 34"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 56 Q55 72 86 56"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity=".55"
      />
    </svg>
  );
}

const SECTION_LINKS: Array<{ href: string; key: string; label: string }> = [
  { href: "#problem", key: "nav.problem", label: "Problem" },
  { href: "#how-it-works", key: "nav.solution", label: "Solution" },
  { href: "#automations", key: "nav.addons", label: "Add-ons" },
  { href: "#faq", key: "nav.faq", label: "FAQ" },
];

const BUILT_FOR: Array<{ key: string; label: string }> = [
  { key: "footer.for.barber", label: "Barber" },
  { key: "footer.for.salon", label: "Hair Salon" },
  { key: "footer.for.nail", label: "Nail Salon" },
  { key: "footer.for.spa", label: "Spa & MedSpa" },
  { key: "footer.for.massage", label: "Massage" },
  { key: "footer.for.lash", label: "Lash Studio" },
  { key: "footer.for.pilates", label: "Pilates & Yoga" },
  { key: "footer.for.trainer", label: "Personal Trainer" },
  { key: "footer.for.physio", label: "Physiotherapy" },
  { key: "footer.for.tattoo", label: "Tattoo Studio" },
];

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col bg-[#FBF9F4] text-[#1E1A14]">
      <header
        id="nav"
        className="sticky top-0 z-50 border-b border-black/[.06] bg-[#FAF5EC]/85 backdrop-blur-md"
      >
        <div className="mx-auto flex h-[68px] max-w-[1160px] items-center justify-between px-6">
          <Link
            href="/"
            aria-label="Bapita home"
            className="flex shrink-0 items-center gap-2 no-underline"
          >
            <BapitaLogo />
            <span className="text-2xl font-extrabold tracking-tight text-[#1E1A14]">
              bapita
            </span>
          </Link>

          <nav aria-label="Section navigation" className="hidden items-center gap-8 md:flex">
            {SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                data-i18n={link.key}
                className="text-sm font-semibold text-[#1E1A14]/70 no-underline transition-colors hover:text-[#1E1A14]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <button
              type="button"
              className="lang-toggle rounded-full border border-black/10 px-3 py-1.5 text-sm font-semibold text-[#1E1A14]/70 transition-colors hover:border-[#E8920A] hover:bg-[#E8920A]/[.06] hover:text-[#1E1A14]"
              aria-label="Switch language"
            >
              עברית
            </button>
            <Link
              href="/login"
              data-cta="nav_login"
              data-i18n="nav.login"
              className="text-sm font-semibold text-[#1E1A14]/70 no-underline transition-colors hover:text-[#1E1A14]"
            >
              Login
            </Link>
            <a
              href="#"
              data-cta="nav_desktop"
              data-i18n="cta.talk"
              className="rounded-full bg-[#E8920A] px-4 py-2 text-sm font-bold text-white no-underline transition-colors hover:bg-[#D4822A]"
            >
              Let&apos;s talk
            </a>
          </div>

          <button
            id="hamburger"
            type="button"
            aria-label="Open menu"
            aria-expanded="false"
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] md:hidden"
          >
            <span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-[#1E1A14]" />
            <span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-[#1E1A14]" />
            <span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-[#1E1A14]" />
          </button>
        </div>

        <div
          id="mobile-menu"
          role="navigation"
          style={{ display: "none" }}
          className="flex-col gap-1 border-t border-black/[.06] bg-[#FAF5EC] px-6 py-4 md:hidden"
        >
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              data-i18n={link.key}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#1E1A14] no-underline transition-colors hover:bg-black/[.04]"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-black/[.06] pt-3">
            <a
              href="#"
              data-cta="nav_mobile"
              data-i18n="cta.talk"
              className="rounded-full bg-[#E8920A] px-4 py-2.5 text-center text-sm font-bold text-white no-underline"
            >
              Let&apos;s talk
            </a>
            <Link
              href="/login"
              data-cta="nav_login_mobile"
              data-i18n="nav.login"
              className="rounded-full border border-black/10 px-4 py-2.5 text-center text-sm font-semibold text-[#1E1A14] no-underline"
            >
              Login
            </Link>
          </div>
          <div className="mt-3 border-t border-black/[.06] pt-3">
            <button
              type="button"
              className="lang-toggle lang-toggle-mob text-sm font-semibold text-[#1E1A14]/70"
              aria-label="Switch language"
            >
              עברית
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-black/[.06] bg-[#16120d] px-6 py-14">
        <div className="mx-auto max-w-[1160px]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <Link
                href="/"
                aria-label="Bapita home"
                className="flex items-center gap-2 no-underline"
              >
                <BapitaLogo className="h-[26px] w-8 shrink-0" />
                <span className="text-xl font-extrabold tracking-tight text-white">bapita</span>
              </Link>
              <p data-i18n="footer.tagline" className="mt-3 text-sm text-white/50">
                Built for you. Runs without you.
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  href="https://instagram.com/bapita"
                  target="_blank"
                  rel="noopener"
                  aria-label="Instagram"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
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
                </a>
                <a
                  href="https://www.facebook.com/bapita"
                  target="_blank"
                  rel="noopener"
                  aria-label="Facebook"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links column */}
            <div>
              <p
                data-i18n="footer.col.links"
                className="text-xs font-semibold uppercase tracking-wide text-white/40"
              >
                Links
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {SECTION_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    data-i18n={link.key}
                    className="text-sm text-white/60 no-underline transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Built for column */}
            <div>
              <p
                data-i18n="footer.col.for"
                className="text-xs font-semibold uppercase tracking-wide text-white/40"
              >
                Built for
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {BUILT_FOR.map((item) => (
                  <span key={item.key} data-i18n={item.key} className="text-sm text-white/60">
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Get started column */}
            <div>
              <p
                data-i18n="footer.col.contact"
                className="text-xs font-semibold uppercase tracking-wide text-white/40"
              >
                Get started
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                <a
                  href="https://calendly.com/info-bapita/30min"
                  target="_blank"
                  rel="noopener"
                  data-cta="footer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E8920A] no-underline transition-colors hover:text-[#D4822A]"
                >
                  <span data-i18n="cta.book">Book a free call</span>
                  <span aria-hidden="true" className="dir-arrow">
                    →
                  </span>
                </a>
                <a
                  href="mailto:info.bapita@gmail.com"
                  className="text-sm text-white/60 no-underline transition-colors hover:text-white"
                >
                  info.bapita@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <p data-i18n="footer.copy" className="text-sm text-white/40">
              © {new Date().getFullYear()} Bapita. All rights reserved.
            </p>
            <p className="text-sm text-white/40">bapita.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
