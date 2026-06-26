"use client";

import { useState, useEffect } from "react";
import type { Business, Service } from "@/types";
import { FloatingCTA }    from "../components/FloatingCTA";
import { SectionGallery }  from "../components/gallery/SectionGallery";
import { SectionHours }    from "../components/SectionHours";
import { SectionLocation } from "../components/SectionLocation";
import { SectionReviews }  from "../components/SectionReviews";
import { BookingOverlay }  from "../booking/BookingOverlay";
import { translations, type Lang } from "../translations";
import { getOpenStatus, getInstagramHandle, getCityFromAddress } from "../utils/openStatus";
import { WaIcon, StarIcon } from "../_shared/icons";
import { useFadeInOnEnter } from "../_shared/useFadeInOnEnter";
import { LangToggle } from "../_shared/LangToggle";
import { ThemeFooter } from "../_shared/ThemeFooter";
import { resolveFont } from "../_shared/fonts";
import { FontLoader } from "../_shared/FontLoader";
import { InstagramFeed } from "../_shared/InstagramFeed";

const C = { bg: "#F8F2E8", dark: "#221510", gold: "#B8862A", cream2: "#F0E8D8" };
const DEFAULT_SECTION_ORDER = ["services", "gallery", "about", "staff", "hours", "location", "reviews"];
const FALLBACK_HERO = "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=80";

function SectionTitle({ title, accentColor, darkColor, fontFamily }: { title: string; accentColor: string; darkColor: string; fontFamily?: string }) {
  const { ref, visible } = useFadeInOnEnter();
  return (
    <div ref={ref}>
      <h2 style={{ fontFamily, fontSize: 22, fontWeight: 600, color: darkColor, marginBottom: 10, letterSpacing: "0.02em" }}>{title}</h2>
      <div style={{ height: 3, borderRadius: 2, background: accentColor, width: visible ? 32 : 0, transition: "width 0.5s ease" }} />
    </div>
  );
}

interface Props { business: Business; services: Service[]; }

export function ShimiAzutHairstudioPage({ business, services }: Props) {
  const [overlayOpen,     setOverlayOpen]     = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hoveredCard,     setHoveredCard]     = useState<string | null>(null);
  const [showWa,          setShowWa]          = useState(false);
  const [lang,            setLang]            = useState<Lang>((business.default_lang as Lang) || "en");

  const t      = translations[lang];
  const isRtl  = lang === "he";

  const { ref: servicesRef, visible: servicesVisible } = useFadeInOnEnter();

  useEffect(() => {
    const onScroll = () => setShowWa(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accent      = business.accent_color || C.gold;
  const heroImage   = business.hero_image_url || FALLBACK_HERO;
  const heroFocal   = business.image_focal?.[heroImage] || "center";
  const openStatus  = getOpenStatus(business.business_hours, t.status, t.days);
  const igHandle    = getInstagramHandle(business.instagram_url);
  const cityLabel   = getCityFromAddress(business.address);
  const waNumber    = business.whatsapp_number?.replace(/\D/g, "");
  const displayName = (isRtl && business.name_he) ? business.name_he : business.name;
  const headingFont = resolveFont(business.heading_font, "'Heebo', sans-serif");
  const bodyFont    = resolveFont(business.body_font, "'Heebo', sans-serif");
  const secondaryName = (isRtl ? business.name : business.name_he) || null;
  const showInstaGallery = business.show_gallery !== false && business.gallery_source === "instagram" && !!business.instagram_embed;
  const showImageGallery = business.show_gallery !== false && Array.isArray(business.gallery_images) && business.gallery_images.length > 0;

  const socialProofText = (() => {
    if (business.stat_rating && business.stat_clients)
      return isRtl ? `${business.stat_rating} · ${business.stat_clients}+ לקוחות מרוצים` : `${business.stat_rating} · ${business.stat_clients}+ happy clients`;
    if (business.stat_rating)
      return isRtl ? `${business.stat_rating} ⭐ גוגל` : `${business.stat_rating} Google rating`;
    if (business.stat_clients)
      return isRtl ? `${business.stat_clients}+ לקוחות מרוצים` : `${business.stat_clients}+ happy clients`;
    return t.social.happyClients;
  })();
  const displayTag  = (isRtl && business.tagline_he) ? business.tagline_he : business.tagline;
  const displayAbout= (isRtl && business.about_text_he) ? business.about_text_he : business.about_text;

  const bookingUrl = business.external_booking_url?.trim() || null;

  function openFromService(s: Service) {
    if (bookingUrl) { window.open(bookingUrl, "_blank", "noopener,noreferrer"); return; }
    setSelectedService(s); setOverlayOpen(true);
  }
  function openFromCTA() {
    if (bookingUrl) { window.open(bookingUrl, "_blank", "noopener,noreferrer"); return; }
    setSelectedService(null); setOverlayOpen(true);
  }
  function closeOverlay() { setOverlayOpen(false); setSelectedService(null); }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} style={{ background: C.bg, minHeight: "100svh", fontFamily: bodyFont, color: C.dark }}>
      <FontLoader fonts={[business.heading_font, business.body_font]} />
      <style>{`
        @keyframes heroReveal { from{transform:scale(1.06)} to{transform:scale(1)} }
        @keyframes fadeUpLoad { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .c-hero-img { animation: heroReveal 1.4s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .c-hero-img, .c-eyebrow, .c-pill, .c-name, .c-sub, .c-tagline, .c-ig, .c-hero-cta { animation: none !important; }
        }
        .c-eyebrow  { animation: fadeUpLoad 0.6s ease-out 0.2s both; }
        .c-pill     { animation: fadeUpLoad 0.5s ease-out 0.25s both; }
        .c-name     { animation: fadeUpLoad 0.7s ease-out 0.35s both; }
        .c-sub      { animation: fadeUpLoad 0.7s ease-out 0.45s both; }
        .c-tagline  { animation: fadeUpLoad 0.6s ease-out 0.55s both; }
        .c-ig       { animation: fadeUpLoad 0.6s ease-out 0.6s both; }
        .c-hero-cta { animation: fadeUpLoad 0.6s ease-out 0.65s both; }
        .about-row  { display:flex; flex-direction:column; align-items:center; gap:20px; }
        @media(min-width:480px) { .about-row { flex-direction:row; align-items:flex-start; } }
        .c-staff-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 600px) { .c-staff-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <LangToggle lang={lang} setLang={setLang} />

      {/* Hero — clean / minimal / editorial (IG-matched) */}
      <section style={{ position: "relative", height: "100svh", overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <img src={heroImage} alt="" className="c-hero-img" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: heroFocal, transformOrigin: "center center" }} />
        </div>
        {/* Soft bottom-weighted scrim — keeps the photo bright and airy */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(34,21,16,0.14) 0%, rgba(34,21,16,0.28) 42%, rgba(34,21,16,0.82) 100%)" }} />
        {/* Faint warm mocha wash — flat tint (cheap, no blend recompute) */}
        <div style={{ position: "absolute", inset: 0, background: accent, opacity: 0.12, pointerEvents: "none" }} />

        {/* Open status pill — top corner, opposite the lang toggle */}
        {(business.show_open_status !== false && openStatus) && (
          <div className="c-pill" style={{ position: "absolute", top: 18, left: 16, zIndex: 2 }}>
            <span style={{ background: "rgba(255,255,255,0.14)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.92)", borderRadius: 9999, padding: "5px 14px", fontSize: 11.5, fontWeight: 500, letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: openStatus.open ? "#22c55e" : "#bbb", display: "inline-block" }} />
              {openStatus.text}
            </span>
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 28px", paddingBottom: "calc(40px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 620 }}>
          {/* Wordmark — thin, tracked, bilingual lockup like his logo */}
          <h1 className="c-name" style={{ fontFamily: headingFont, fontWeight: 300, fontSize: "clamp(2.3rem, 8vw, 4.6rem)", color: "#fff", lineHeight: 1.06, letterSpacing: isRtl ? "0.02em" : "0.16em", textTransform: isRtl ? "none" : "uppercase", margin: 0 }}>
            {displayName}
          </h1>
          {secondaryName && (
            <div className="c-sub" style={{ marginTop: 14, color: "rgba(255,255,255,0.7)", fontSize: "clamp(0.7rem, 1.6vw, 0.82rem)", fontWeight: 400, letterSpacing: isRtl ? "0.22em" : "0.05em", textTransform: isRtl ? "uppercase" : "none" }}>
              {secondaryName}
            </div>
          )}

          {displayTag && (
            <p className="c-tagline" style={{ fontSize: "clamp(0.95rem, 2.4vw, 1.12rem)", color: "rgba(255,255,255,0.8)", fontWeight: 300, lineHeight: 1.6, margin: "20px auto 0", maxWidth: 420 }}>
              {displayTag}
            </p>
          )}

          {/* CTA — thin outline, tracked */}
          <button className="c-hero-cta" onClick={openFromCTA}
            style={{ marginTop: 30, background: "transparent", border: "1px solid rgba(255,255,255,0.75)", color: "#fff", padding: "15px 42px", borderRadius: 9999, fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "0.16em", textTransform: "uppercase", transition: "background 0.25s, border-color 0.25s, color 0.25s", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.75)"; e.currentTarget.style.color = "#fff"; }}
          >
            {t.hero.cta}
          </button>

        </div>
      </section>

      {/* Social proof strip — moved off the hero fold */}
      {business.show_stats !== false && (
        <div style={{ background: C.dark, padding: "16px 20px", display: "flex", justifyContent: "center" }}>
          {business.google_review_link ? (
            <a href={business.google_review_link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
              <span style={{ display: "flex", gap: 2, color: accent }}>{[0,1,2,3,4].map(i => <StarIcon key={i} size={14} color="currentColor" />)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(248,242,232,0.92)", letterSpacing: "0.02em" }}>{socialProofText}</span>
            </a>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
              <span style={{ display: "flex", gap: 2, color: accent }}>{[0,1,2,3,4].map(i => <StarIcon key={i} size={14} color="currentColor" />)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(248,242,232,0.92)", letterSpacing: "0.02em" }}>{socialProofText}</span>
            </div>
          )}
        </div>
      )}

      {/* Sections — ordered by business.section_order */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 140px" }}>
        {(() => {
          const base = business.section_order || DEFAULT_SECTION_ORDER;
          const missing = DEFAULT_SECTION_ORDER.filter(k => !base.includes(k));
          return missing.length ? [...base, ...missing] : base;
        })().map(key => {
          switch (key) {
            case "services":
              return business.show_services !== false ? (
                <section key={key} ref={servicesRef} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.services.title} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
                    {services.map((s, i) => {
                      const hovered = hoveredCard === s.id;
                      const sName = (isRtl && s.name_he) ? s.name_he : s.name;
                      const sDesc = (isRtl && s.description_he) ? s.description_he : s.description;
                      return (
                        <div key={s.id}
                          onMouseEnter={() => setHoveredCard(s.id)} onMouseLeave={() => setHoveredCard(null)}
                          style={{ background: "#fff", borderRadius: 10, boxShadow: hovered ? "0 4px 16px rgba(34,21,16,0.10)" : "0 1px 4px rgba(34,21,16,0.06)", padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderInlineStart: `3px solid ${hovered ? accent : "transparent"}`, opacity: servicesVisible ? 1 : 0, transform: servicesVisible ? (hovered ? "translateY(-2px)" : "translateY(0)") : "translateY(20px)", transition: [`opacity 0.5s ease ${i*80}ms`, `transform 0.5s ease ${i*80}ms`, "box-shadow 0.2s", "border-color 0.2s"].join(", ") }}
                        >
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 2 }}>{sName}</div>
                            {sDesc && <div style={{ fontSize: 13, color: C.dark, opacity: 0.55, marginBottom: 2, lineHeight: 1.4 }}>{sDesc}</div>}
                            <div style={{ fontSize: 13, color: C.dark, opacity: 0.55 }}>{s.duration} {t.min}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, marginInlineStart: 12 }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: C.dark }}>₪{s.price}</div>
                            <button onClick={() => openFromService(s)}
                              style={{ height: 36, padding: "0 16px", borderRadius: 9999, background: C.dark, color: C.bg, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.2s", fontFamily: "inherit" }}
                              onMouseEnter={e => { e.currentTarget.style.background = accent; }}
                              onMouseLeave={e => { e.currentTarget.style.background = C.dark; }}
                            >
                              {t.services.book}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null;
            case "about":
              return business.show_about !== false && displayAbout ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.about.title} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div className="about-row" style={{ marginTop: 20 }}>
                    {(business.profile_image_url || business.hero_image_url) && (
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <img src={business.profile_image_url || business.hero_image_url || ""} alt={displayName} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `3px solid ${accent}`, display: "block", margin: "0 auto 6px" }} />
                        <span style={{ fontSize: 11, fontVariant: "small-caps", color: accent, fontWeight: 700, letterSpacing: "0.06em" }}>{displayName}</span>
                      </div>
                    )}
                    <p style={{ fontSize: 16, lineHeight: 1.8, color: C.dark, opacity: 0.82, margin: 0 }}>{displayAbout}</p>
                  </div>
                </section>
              ) : null;
            case "staff":
              return business.show_staff !== false && business.staff_members && business.staff_members.length > 0 ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.staff.title} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div className="c-staff-grid" style={{ marginTop: 24 }}>
                    {business.staff_members.map(member => (
                      <div key={member.id} style={{ background: "#fff", borderRadius: 10, padding: "18px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", boxShadow: "0 1px 4px rgba(34,21,16,0.06)", borderInlineStart: `3px solid ${accent}` }}>
                        <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: C.cream2, border: `2px solid ${accent}`, flexShrink: 0 }}>
                          {member.photo_url
                            ? <img src={member.photo_url} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: C.dark, opacity: 0.4 }}>👤</div>
                          }
                        </div>
                        <div>
                          <div style={{ fontFamily: headingFont, fontSize: 15, fontWeight: 700, color: C.dark }}>{member.name}</div>
                          {member.role && <div style={{ fontSize: 12, color: C.dark, opacity: 0.55, marginTop: 3 }}>{member.role}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;
            case "gallery":
              return (showInstaGallery || showImageGallery) ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.gallery.title} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div style={{ marginTop: 28 }}>
                    {showInstaGallery
                      ? <InstagramFeed embed={business.instagram_embed!} radius={10} />
                      : <SectionGallery photos={business.gallery_images!} mobileCols={2} desktopCols={2} initialCount={4} desktopInitialCount={4} focal={business.image_focal ?? undefined} altLabel={displayName} />}
                  </div>
                </section>
              ) : null;
            case "reviews":
              return business.show_reviews !== false && ((business.google_reviews && business.google_reviews.length > 0) || !!business.google_review_link) ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.reviews.title} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div style={{ marginTop: 20 }}>
                    <SectionReviews
                      reviews={business.google_reviews ?? []}
                      accentColor={accent}
                      darkColor={C.dark}
                      bgColor="#fff"
                      borderColor={`${accent}22`}
                      reviewLink={business.google_review_link}
                      leaveReviewLabel={t.reviews.leaveReview}
                    />
                  </div>
                </section>
              ) : null;
            case "hours":
              return business.show_hours !== false && business.business_hours ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.hours.title} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div style={{ marginTop: 20 }}>
                    <SectionHours hours={business.business_hours} darkColor={C.dark} accentColor={accent} mutedColor="rgba(34,21,16,0.45)" dayLabels={t.days} closedLabel={t.hours.closed} />
                  </div>
                </section>
              ) : null;
            case "location":
              return business.show_location !== false && business.address ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.location.title} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div style={{ marginTop: 20 }}>
                    <SectionLocation address={business.address} darkColor={C.dark} accentColor={accent} directionsLabel={t.location.directions} googleMapsUrl={business.google_maps_url} wazeUrl={business.waze_url} />
                  </div>
                </section>
              ) : null;
            default:
              return null;
          }
        })}

        <ThemeFooter
          business={business}
          accent={accent}
          colors={{ text: C.dark, muted: "rgba(34,21,16,0.5)", surface: C.cream2, border: "transparent" }}
          socialShape="circle"
          socialBg={C.cream2}
          iconColor={C.dark}
          footerLabel={t.footer.poweredBy}
          brandLabel={t.footer.brand}
          footerLabelStyle={{ color: "rgba(34,21,16,0.38)" }}
        />
      </div>

      <FloatingCTA shopName={displayName} bookLabel={t.hero.cta} onBook={openFromCTA} bgColor={accent} textColor="#fff" />

      {waNumber && (
        <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 90, insetInlineStart: 20, width: 52, height: 52, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.22)", zIndex: 50, transform: showWa ? "translateY(0) scale(1)" : "translateY(20px) scale(0.85)", opacity: showWa ? 1 : 0, transition: "transform 0.35s ease, opacity 0.35s ease", pointerEvents: showWa ? "auto" : "none" }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px) scale(1.06)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform=showWa?"translateY(0) scale(1)":"translateY(20px) scale(0.85)";}}
        >
          <WaIcon size={22} color="#fff" />
        </a>
      )}

      {!bookingUrl && overlayOpen && (
        <BookingOverlay business={business} services={services} initialService={selectedService} onClose={closeOverlay} accentColor={accent} darkColor={C.dark} bgColor={C.bg} lang={lang} />
      )}
    </div>
  );
}
