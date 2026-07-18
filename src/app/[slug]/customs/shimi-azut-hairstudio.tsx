"use client";

import { useState, useEffect } from "react";
import type { Business, Service } from "@/types";
import { getSocialProof } from "@/lib/social-proof";
import { FloatingCTA }    from "../components/FloatingCTA";
import { SectionGallery }  from "../components/gallery/SectionGallery";
import { SectionHours }    from "../components/SectionHours";
import { SectionLocation } from "../components/SectionLocation";
import { SectionReviews }  from "../components/SectionReviews";
import { BookingOverlay }  from "../booking/BookingOverlay";
import { translations, type Lang } from "../translations";
import { getOpenStatus } from "../utils/openStatus";
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
  const [currentSlide,    setCurrentSlide]    = useState(0);

  const t      = translations[lang];
  const isRtl  = lang === "he";

  // Shimi-only label overrides (do not touch shared translations)
  const L = {
    heroCta:      isRtl ? "זימון תור" : t.hero.cta,
    serviceBook:  isRtl ? "לזימון"    : t.services.book,
    aboutTitle:   isRtl ? "קצת עלינו" : "About Us",
    staffTitle:   isRtl ? "הצוות שלנו" : "Our Team",
    galleryTitle: isRtl ? "אינסטגרם"  : "Instagram",
  };

  const { ref: servicesRef, visible: servicesVisible } = useFadeInOnEnter();

  // Get carousel images - use gallery if available, otherwise single hero image
  const carouselImages = (Array.isArray(business.gallery_images) && business.gallery_images.length > 0)
    ? business.gallery_images
    : [business.hero_image_url || FALLBACK_HERO];

  useEffect(() => {
    const onScroll = () => setShowWa(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-slide effect for carousel
  useEffect(() => {
    if (carouselImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  const accent      = business.accent_color || C.gold;
  const heroImage   = business.hero_image_url || FALLBACK_HERO;
  const heroFocal   = business.image_focal?.[heroImage] || "center";
  const openStatus  = getOpenStatus(business.business_hours, t.status, t.days, isRtl);
  const waNumber    = business.whatsapp_number?.replace(/\D/g, "");
  const displayName = (isRtl && business.name_he) ? business.name_he : business.name;
  const headingFont = resolveFont(business.heading_font, "'Heebo', sans-serif");
  const bodyFont    = resolveFont(business.body_font, "'Heebo', sans-serif");
  const showInstaGallery = business.show_gallery !== false && business.gallery_source === "instagram" && !!business.instagram_embed;
  const showImageGallery = business.show_gallery !== false && Array.isArray(business.gallery_images) && business.gallery_images.length > 0;

  const socialProofText = getSocialProof(business, isRtl, t.social.happyClients);
  // Hero title/tagline stay fixed across languages (single brand mark, matches logo)
  const heroTitle   = business.name;
  const heroTagline = business.tagline;
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

  // Navigation functions for carousel
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

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
        /* Carousel dot animation */
        .c-dot-active {
          animation: dotPulse 0.3s ease-out;
        }
        @keyframes dotPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1.2); }
        }
      `}</style>

      <LangToggle lang={lang} setLang={setLang} />

      {/* Open status pill — fixed top-left, always visible on scroll (mirrors lang toggle) */}
      {(business.show_open_status !== false && openStatus) && (
        <div className="c-pill" style={{ position: "fixed", top: 16, left: 16, zIndex: 200 }}>
          <span style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.92)", borderRadius: 9999, padding: "5px 14px", fontSize: 11.5, fontWeight: 500, letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: openStatus.open ? "#22c55e" : "#bbb", display: "inline-block" }} />
            {openStatus.text}
          </span>
        </div>
      )}

      {/* Hero — with carousel support */}
      <section style={{ position: "relative", height: "100svh", overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        {/* Carousel images container */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          {carouselImages.map((img, index) => {
            const isActive = index === currentSlide;
            const focal = business.image_focal?.[img] || "center";
            
            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  inset: 0,
                  transition: "transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  transform: isActive ? "translateX(0) scale(1)" : "translateX(100%) scale(0.98)",
                  opacity: isActive ? 1 : 0.6,
                  zIndex: isActive ? 1 : 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt=""
                  className="c-hero-img"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: focal,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            );
          })}
        </div>
        
        {/* Soft bottom-weighted scrim — keeps the photo bright and airy */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(34,21,16,0.14) 0%, rgba(34,21,16,0.30) 40%, rgba(34,21,16,0.90) 100%)", zIndex: 2 }} />
        
        {/* Faint warm mocha wash — flat tint */}
        <div style={{ position: "absolute", inset: 0, background: accent, opacity: 0.12, pointerEvents: "none", zIndex: 2 }} />

        {/* Slide navigation controls - show only if multiple images */}
        {carouselImages.length > 1 && (
          <>
            {/* Left arrow */}
            <button
              onClick={goToPrevSlide}
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 4,
                background: "rgba(0,0,0,0.3)",
                border: "none",
                borderRadius: "50%",
                width: 44,
                height: 44,
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, transform 0.2s",
                padding: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.5)"; e.currentTarget.style.transform = "translateY(-50%) scale(1.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.3)"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
              aria-label="Previous slide"
            >
              ←
            </button>
            
            {/* Right arrow */}
            <button
              onClick={goToNextSlide}
              style={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 4,
                background: "rgba(0,0,0,0.3)",
                border: "none",
                borderRadius: "50%",
                width: 44,
                height: 44,
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, transform 0.2s",
                padding: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.5)"; e.currentTarget.style.transform = "translateY(-50%) scale(1.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.3)"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
              aria-label="Next slide"
            >
              →
            </button>

            {/* Dots indicator - moved to bottom-right */}
            <div style={{
              position: "absolute",
              bottom: "calc(28px + env(safe-area-inset-bottom))",
              right: 28,
              zIndex: 3,
              display: "flex",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 20,
              background: "rgba(0,0,0,0.3)",
              backdropFilter: "blur(8px)",
            }}>
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  style={{
                    width: index === currentSlide ? 10 : 8,
                    height: index === currentSlide ? 10 : 8,
                    borderRadius: "50%",
                    border: "none",
                    background: index === currentSlide ? "#fff" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    transition: "background 0.3s ease, transform 0.3s ease, width 0.3s ease, height 0.3s ease",
                    padding: 0,
                    transform: index === currentSlide ? "scale(1.2)" : "scale(1)",
                    boxShadow: index === currentSlide ? "0 0 12px rgba(255,255,255,0.3)" : "none",
                  }}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Hero content overlay */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 28px", paddingBottom: "calc(28px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 620 }}>
          <h1 className="c-name" style={{ fontFamily: headingFont, fontWeight: 300, fontSize: "clamp(2.3rem, 8vw, 4.6rem)", color: "#fff", lineHeight: 1.06, letterSpacing: "0.16em", textTransform: "uppercase", margin: 0, textShadow: "0 2px 26px rgba(0,0,0,0.62)" }}>
            {heroTitle}
          </h1>
          {heroTagline && (
            <div className="c-sub" style={{ marginTop: 10, color: "rgba(255,255,255,0.78)", fontSize: "clamp(0.7rem, 1.6vw, 0.82rem)", fontWeight: 400, letterSpacing: "0.24em", textTransform: "uppercase", textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}>
              {heroTagline}
            </div>
          )}
          <div className="c-tagline" style={{ width: 64, height: 1, background: "rgba(255,255,255,0.4)", margin: "20px auto 0" }} />
          <button className="c-hero-cta" onClick={openFromCTA}
            style={{ marginTop: 22, background: accent, border: "none", color: "#fff", padding: "16px 46px", borderRadius: 9999, fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.14em", textTransform: "uppercase", transition: "background 0.25s, transform 0.2s", fontFamily: "inherit", boxShadow: "0 6px 22px rgba(0,0,0,0.28)" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.dark; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = accent; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {L.heroCta}
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
                              {L.serviceBook}
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
                  <SectionTitle title={L.aboutTitle} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div className="about-row" style={{ marginTop: 20 }}>
                    {(business.profile_image_url || business.hero_image_url) && (
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  <SectionTitle title={L.staffTitle} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div className="c-staff-grid" style={{ marginTop: 24 }}>
                    {business.staff_members.map(member => {
                      // Focal point: dashboard-set image_focal wins; else a uniform
                      // upper-biased crop so every face is centered the same way and
                      // no one's head is cut off (these portraits sit high in frame).
                      const memberFocal =
                        (member.photo_url && business.image_focal?.[member.photo_url]) ||
                        "center 15%";
                      return (
                      <div key={member.id} style={{ background: "#fff", borderRadius: 10, padding: "18px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", boxShadow: "0 1px 4px rgba(34,21,16,0.06)", borderInlineStart: `3px solid ${accent}` }}>
                        <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: C.cream2, border: `2px solid ${accent}`, flexShrink: 0 }}>
                          {member.photo_url
                            /* eslint-disable-next-line @next/next/no-img-element */
                            ? <img src={member.photo_url} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: memberFocal }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: C.dark, opacity: 0.4 }}>👤</div>
                          }
                        </div>
                        <div>
                          <div style={{ fontFamily: headingFont, fontSize: 15, fontWeight: 700, color: C.dark }}>{member.name}</div>
                          {member.role && <div style={{ fontSize: 12, color: C.dark, opacity: 0.75, marginTop: 3 }}>{member.role}</div>}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </section>
              ) : null;
            case "gallery":
              return (showInstaGallery || showImageGallery) ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={L.galleryTitle} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
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
                      showMoreLabel={t.reviews.showMore}
                      showLessLabel={t.reviews.showLess}
                    />
                  </div>
                </section>
              ) : null;
            case "hours":
              return business.show_hours !== false && business.business_hours ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.hours.title} accentColor={accent} darkColor={C.dark} fontFamily={headingFont} />
                  <div style={{ marginTop: 20 }}>
                    <SectionHours hours={business.business_hours} darkColor={C.dark} accentColor={accent} mutedColor="rgba(34,21,16,0.45)" dayLabels={t.days} closedLabel={t.hours.closed} use24h={isRtl} />
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
          colors={{ text: C.dark, muted: "rgba(34,21,16,0.75)", surface: C.cream2, border: "transparent" }}
          socialShape="circle"
          socialBg={C.cream2}
          iconColor={C.dark}
          footerLabel={t.footer.poweredBy}
          brandLabel={t.footer.brand}
          footerLabelStyle={{ color: "rgba(34,21,16,0.7)" }}
        />
      </div>

      <FloatingCTA shopName="" bookLabel={L.heroCta} onBook={openFromCTA} bgColor={accent} textColor="#fff" />

      {waNumber && (
        <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
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
