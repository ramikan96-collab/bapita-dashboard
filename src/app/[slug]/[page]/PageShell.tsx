"use client";

import { useState } from "react";
import Link from "next/link";
import type { Business, Page, Service } from "@/types";
import { SmartImg } from "@/components/SmartImg";
import { BookingOverlay } from "../booking/BookingOverlay";
import { StayOverlay } from "../booking/StayOverlay";
import { translations, type Lang } from "../translations";
import { LangToggle } from "../_shared/LangToggle";
import { ThemeFooter } from "../_shared/ThemeFooter";
import { FontLoader } from "../_shared/FontLoader";
import { resolveFont } from "../_shared/fonts";
import { useExternalCta } from "../_shared/useExternalCta";
import { pagePalette, themeKey } from "../_shared/pageTheme";
import { isStay } from "@/lib/stay";
import { amenityLabels } from "@/lib/amenities";
import type { PageSpec } from "@/types";

const DEFAULT_ORDER = ["hero", "body", "gallery", "specs", "related", "cta"];

interface Props {
  business: Business;
  page: Page;
  /** The service/unit this detail page describes, if it still exists. */
  service: Service | null;
  /** Every active service, so the booking overlay can offer the others. */
  services: Service[];
  /** The unit's own photo group — used when the page sets no images. */
  photos: string[];
  /** Other published pages of the same business, for the "related" section. */
  siblings: Pick<Page, "id" | "slug" | "title" | "title_he">[];
  /** Where the parent site lives from here — "/" on a custom domain, "/<slug>" otherwise. */
  homeHref: string;
}

/**
 * Renders a paragraph body from stored plain text. The stored value is already
 * stripped of tags at write time (lib/pages.ts); React escapes it again here.
 * There is deliberately no HTML path — not even a sanitised one.
 */
function Body({ text, color, font }: { text: string; color: string; font: string }) {
  return (
    <div style={{ fontFamily: font, color, fontSize: 16, lineHeight: 1.75, display: "grid", gap: 14 }}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} style={{ margin: 0, whiteSpace: "pre-line" }}>{para}</p>
      ))}
    </div>
  );
}

export function PageShell({ business, page, service, services, photos, siblings, homeHref }: Props) {
  const [lang, setLang] = useState<Lang>((business.default_lang as Lang) || "en");
  const [overlayOpen, setOverlayOpen] = useState(false);

  const t     = translations[lang];
  const isRtl = lang === "he";
  const stay  = isStay(business);

  const theme   = themeKey(business.template_style);
  const P       = pagePalette(theme);
  const accent  = business.accent_color || (theme === "dark" ? "#B8862A" : P.text);

  const headingFont = resolveFont(business.heading_font, "system-ui, sans-serif");
  const bodyFont    = resolveFont(business.body_font, "system-ui, sans-serif");

  // Anything the page leaves empty falls back to its unit, so a detail page is
  // complete the moment it is created and stays in step when the unit changes.
  const c = page.content || {};
  const unit = page.kind === "detail" ? service : null;
  const title = (isRtl && (page.title_he?.trim() || unit?.name_he?.trim())) || page.title;
  const body  =
    (isRtl && (c.body_he?.trim() || unit?.description_he?.trim())) ||
    c.body || unit?.description || null;
  const ownSpecs = ((isRtl && c.specs_he?.length ? c.specs_he : c.specs) || []) as PageSpec[];
  const unitSpecs: PageSpec[] = stay && unit
    ? [
        ...(unit.max_guests ? [{ label: t.stay.guests, value: t.stay.sleeps(unit.max_guests) }] : []),
        ...(unit.min_nights && unit.min_nights > 1
          ? [{ label: t.page.minStay, value: t.stay.minNights(unit.min_nights) }]
          : []),
      ]
    : [];
  const specs = ownSpecs.length ? ownSpecs : unitSpecs;
  const amenities = stay && unit ? amenityLabels(unit.amenities, isRtl ? "he" : "en") : [];
  const images = c.images?.length ? c.images : unit && photos.length ? photos : null;
  const hero   = c.hero_image_url || images?.[0] || business.hero_image_url || null;
  // The hero is already on screen — don't repeat it as the first gallery tile.
  const galleryImages = images ? images.filter((src) => src !== hero) : [];

  // The page's own label wins, then the business's, then the theme string —
  // resolveCta already handles the last two, so only the override goes in here.
  const pageLabel = (isRtl && c.cta_label_he?.trim()) || c.cta_label?.trim() || undefined;
  const { cta, handledExternally } = useExternalCta(business, t, lang, {
    stayMode: stay,
    ...(pageLabel ? { fallback: pageLabel } : {}),
  });
  const ctaLabel = pageLabel || cta.label;

  function openCta() {
    // External-CTA businesses hand off instead of booking — 5B's rule, unchanged here.
    if (handledExternally(service?.id)) return;
    setOverlayOpen(true);
  }

  const displayName = (isRtl && business.name_he) ? business.name_he : business.name;
  const order = page.section_order?.length ? page.section_order : DEFAULT_ORDER;

  const sections: Record<string, React.ReactNode> = {
    hero: hero ? (
      <div key="hero" style={{ borderRadius: P.radius, overflow: "hidden", background: P.surface, aspectRatio: "16/9" }}>
        <SmartImg
          src={hero}
          alt={title}
          maxWidth={820}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: business.image_focal?.[hero] || "center" }}
        />
      </div>
    ) : null,

    body: body ? <div key="body"><Body text={body} color={P.text} font={bodyFont} /></div> : null,

    gallery: galleryImages.length > 0 ? (
      <section key="gallery">
        <h2 style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: P.text, margin: "0 0 16px" }}>{t.page.gallery}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {galleryImages.map((src) => (
            <div key={src} style={{ borderRadius: P.radius, overflow: "hidden", background: P.surface, aspectRatio: "4/3" }}>
              <SmartImg src={src} alt={title} maxWidth={400} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      </section>
    ) : null,

    specs: specs.length || amenities.length ? (
      <section key="specs" style={{ display: "grid", gap: 28 }}>
        {specs.length > 0 && (
          <div>
            <h2 style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: P.text, margin: "0 0 16px" }}>{t.page.details}</h2>
            <dl style={{ margin: 0, display: "grid", gap: 0, border: `1px solid ${P.border}`, borderRadius: P.radius, overflow: "hidden" }}>
              {specs.map((s, i) => (
                <div
                  key={`${s.label}-${i}`}
                  style={{
                    display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 16px",
                    background: i % 2 ? P.surface : "transparent",
                    fontFamily: bodyFont, fontSize: 15,
                  }}
                >
                  <dt style={{ color: P.muted }}>{s.label}</dt>
                  <dd style={{ margin: 0, color: P.text, fontWeight: 600, textAlign: isRtl ? "left" : "right" }}>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {amenities.length > 0 && (
          <div>
            <h2 style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: P.text, margin: "0 0 16px" }}>{t.stay.amenities}</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: 10 }}>
              {amenities.map((label) => (
                <li
                  key={label}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    border: `1px solid ${P.border}`, borderRadius: P.radius, background: P.surface,
                    fontFamily: bodyFont, fontSize: 15, color: P.text,
                  }}
                >
                  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    ) : null,

    related: siblings.length ? (
      <section key="related">
        <h2 style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: P.text, margin: "0 0 16px" }}>{t.page.more}</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`${homeHref === "/" ? "" : homeHref}/${s.slug}`}
              style={{
                display: "block", padding: "14px 16px", borderRadius: P.radius,
                border: `1px solid ${P.border}`, background: P.surface,
                color: P.text, textDecoration: "none", fontFamily: bodyFont, fontWeight: 600, fontSize: 15,
              }}
            >
              {(isRtl && s.title_he?.trim()) || s.title}
            </Link>
          ))}
        </div>
      </section>
    ) : null,

    cta: (
      <div key="cta" style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
        <button
          onClick={openCta}
          style={{
            background: accent, color: P.onAccent, border: "none", borderRadius: 999,
            padding: "15px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            fontFamily: headingFont, letterSpacing: "0.01em",
          }}
        >
          {ctaLabel}
        </button>
      </div>
    ),
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={{ background: P.bg, color: P.text, minHeight: "100vh", fontFamily: bodyFont }}
    >
      <FontLoader fonts={[business.heading_font, business.body_font]} />
      <LangToggle lang={lang} setLang={setLang} {...(P.dark ? { variant: "bordered" as const } : {})} />

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "72px 20px 64px", display: "grid", gap: 36 }}>
        <div>
          <Link
            href={homeHref}
            style={{ color: P.muted, textDecoration: "none", fontSize: 14, fontFamily: bodyFont }}
          >
            {t.page.back(displayName)}
          </Link>
          <h1 style={{ fontFamily: headingFont, fontSize: 34, fontWeight: 800, color: P.text, letterSpacing: "-0.02em", margin: "14px 0 0" }}>
            {title}
          </h1>
          {service && !stay && service.price > 0 && (
            <div style={{ marginTop: 8, color: accent, fontWeight: 700, fontSize: 18 }}>₪{service.price}</div>
          )}
          {service && stay && service.price > 0 && (
            <div style={{ marginTop: 8, color: accent, fontWeight: 700, fontSize: 18 }}>
              ₪{service.price} / {t.stay.perNight}
            </div>
          )}
        </div>

        {order.map((key) => sections[key]).filter(Boolean)}
      </main>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px 40px" }}>
        <ThemeFooter
          business={business}
          accent={accent}
          colors={{ text: P.text, muted: P.muted, surface: P.surface, border: P.border }}
          socialShape="circle"
          socialBg={P.surface}
          iconColor={P.text}
          footerLabel={t.footer.poweredBy}
          brandLabel={t.footer.brand}
          privacyLabel={t.footer.privacy}
          termsLabel={t.footer.terms}
          topBorder
        />
      </div>

      {cta.mode === "native" && overlayOpen && (
        stay ? (
          <StayOverlay
            business={business}
            units={services}
            unit={service}
            onClose={() => setOverlayOpen(false)}
            accentColor={accent}
            darkColor={P.text}
            bgColor={P.bg}
            lang={lang}
          />
        ) : (
          <BookingOverlay
            business={business}
            services={services}
            initialService={service}
            onClose={() => setOverlayOpen(false)}
            accentColor={accent}
            darkColor={P.text}
            bgColor={P.bg}
            lang={lang}
          />
        )
      )}
    </div>
  );
}
