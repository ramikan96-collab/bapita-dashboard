"use client";

import { useState, useEffect } from "react";
import type { Business, Service } from "@/types";
import { FloatingCTA }    from "../../components/FloatingCTA";
import { SectionGallery }  from "../../components/SectionGallery";
import { SectionHours }    from "../../components/SectionHours";
import { SectionLocation } from "../../components/SectionLocation";
import { SectionReviews }  from "../../components/SectionReviews";
import { BookingOverlay }  from "../../booking/BookingOverlay";
import { translations, type Lang } from "../../translations";
import { getOpenStatus, getInstagramHandle, getCityFromAddress } from "../../utils/openStatus";
import { IgIcon, WaIcon, StarIcon } from "../../_shared/icons";
import { useFadeInOnEnter } from "../../_shared/useFadeInOnEnter";
import { LangToggle } from "../../_shared/LangToggle";
import { ThemeFooter } from "../../_shared/ThemeFooter";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80";
const DEFAULT_SECTION_ORDER = ["services", "gallery", "about", "reviews", "hours", "location"];

const D = {
  bg:      "#0D0D0D",
  surface: "#181818",
  raised:  "#222222",
  text:    "#F0F0F0",
  muted:   "#888888",
  border:  "rgba(255,255,255,0.08)",
};

// ─── Gold ornamental divider ──────────────────────────────────────────────────

function GoldDivider({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 56, marginBottom: 0, paddingInlineStart: 0, paddingInlineEnd: 0 }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to inline-end, transparent, ${accent}50)` }} />
      <span style={{ color: accent, fontSize: 10, opacity: 0.6, letterSpacing: "0.1em" }}>✦</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to inline-start, transparent, ${accent}50)` }} />
    </div>
  );
}

// ─── Section heading with wipe reveal ────────────────────────────────────────

function DarkSectionTitle({ title, accent, isRtl }: { title: string; accent: string; isRtl: boolean }) {
  const { ref, visible } = useFadeInOnEnter(0.2);
  return (
    <div ref={ref} style={{ marginBottom: 28, paddingTop: 44 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: 3, height: 20, background: accent, borderRadius: 2, flexShrink: 0 }} />
        <h2
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: visible ? "0.07em" : "0.01em",
            textTransform: "uppercase",
            color: D.text,
            margin: 0,
            transition: "letter-spacing 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.6s ease",
            opacity: visible ? 1 : 0,
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ height: 1, background: `linear-gradient(to ${isRtl ? "left" : "right"}, ${accent}60, transparent)`, width: visible ? "100%" : "0%", transition: "width 0.7s cubic-bezier(0.4,0,0.2,1) 0.15s" }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props { business: Business; services: Service[]; }

export function DarkPage({ business, services }: Props) {
  const [overlayOpen,     setOverlayOpen]     = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hoveredCard,     setHoveredCard]     = useState<string | null>(null);
  const [showWa,          setShowWa]          = useState(false);
  const [stickyVisible,   setStickyVisible]   = useState(false);
  const [lang,            setLang]            = useState<Lang>((business.default_lang as Lang) || "en");

  const t     = translations[lang];
  const isRtl = lang === "he";

  const { ref: servicesRef, visible: servicesVisible } = useFadeInOnEnter();
  const { ref: statsRef,    visible: statsVisible }    = useFadeInOnEnter(0.25);

  const socialProofText = (() => {
    if (business.stat_rating && business.stat_clients)
      return isRtl ? `${business.stat_rating} · ${business.stat_clients}+ לקוחות מרוצים` : `${business.stat_rating} · ${business.stat_clients}+ happy clients`;
    if (business.stat_rating)
      return isRtl ? `${business.stat_rating} ⭐ גוגל` : `${business.stat_rating} Google rating`;
    if (business.stat_clients)
      return isRtl ? `${business.stat_clients}+ לקוחות מרוצים` : `${business.stat_clients}+ happy clients`;
    return t.social.happyClients;
  })();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowWa(y > window.innerHeight * 0.7);
      setStickyVisible(y > window.innerHeight * 0.85);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accent       = business.accent_color || "#C9A24A";
  const heroImage    = business.hero_image_url || FALLBACK_HERO;
  const waNumber     = business.whatsapp_number?.replace(/\D/g, "");
  const openStatus   = getOpenStatus(business.business_hours, t.status, t.days);
  const igHandle     = getInstagramHandle(business.instagram_url);
  const cityLabel    = getCityFromAddress(business.address);
  const hasStats     = business.stat_years != null || business.stat_clients != null || business.stat_rating != null;
  const displayName  = (isRtl && business.name_he) ? business.name_he : business.name;
  const displayTag   = (isRtl && business.tagline_he) ? business.tagline_he : business.tagline;
  const displayAbout = (isRtl && business.about_text_he) ? business.about_text_he : business.about_text;

  function openFromService(s: Service) { setSelectedService(s); setOverlayOpen(true); }
  function openFromCTA()               { setSelectedService(null); setOverlayOpen(true); }
  function closeOverlay()              { setOverlayOpen(false); setSelectedService(null); }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} style={{ background: D.bg, minHeight: "100svh", color: D.text, fontFamily: "'Inter', system-ui, sans-serif", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap');
        @keyframes kenBurns   { 0%{transform:scale(1.0)} 100%{transform:scale(1.07)} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown  { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse  { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .dk-hero-img  { animation: kenBurns 14s ease-in-out infinite alternate; }
        .dk-pill      { animation: fadeUp 0.55s ease-out 0.15s both; }
        .dk-name      { animation: fadeUp 0.75s ease-out 0.28s both; }
        .dk-tag       { animation: fadeUp 0.65s ease-out 0.42s both; }
        .dk-ig        { animation: fadeUp 0.65s ease-out 0.52s both; }
        .dk-cta       { animation: fadeUp 0.65s ease-out 0.6s both; }
        .dk-sticky    { animation: slideDown 0.28s ease-out both; }
      `}</style>

      {/* Film grain overlay */}
      <svg
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", opacity: 0.045 }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <filter id="dk-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dk-grain)" />
      </svg>

      <LangToggle lang={lang} setLang={setLang} variant="bordered" />

      {/* Sticky header */}
      {stickyVisible && (
        <div className="dk-sticky" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 150, height: 56, background: "rgba(13,13,13,0.92)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${accent}25`, display: "flex", alignItems: "center", gap: 12, paddingInlineStart: 24, paddingInlineEnd: 20 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: D.text, letterSpacing: "0.08em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{displayName}</span>
          <button onClick={openFromCTA}
            style={{ fontFamily: "'Oswald', sans-serif", flexShrink: 0, height: 34, padding: "0 20px", borderRadius: 2, background: accent, color: D.bg, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", transition: "background 0.2s", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = accent; }}
          >{t.hero.bookNow}</button>
        </div>
      )}

      {/* Hero */}
      <section style={{ position: "relative", height: "100svh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <img src={heroImage} alt="" className="dk-hero-img" style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: "center center" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(13,13,13,0.6) 0%, rgba(13,13,13,0.1) 30%, rgba(13,13,13,0.1) 55%, rgba(13,13,13,0.88) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 28px", width: "100%", maxWidth: 720 }}>
          <div className="dk-pill" style={{ marginBottom: 22, display: "flex", justifyContent: "center" }}>
            {openStatus ? (
              <span style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", color: "#fff", borderRadius: 9999, padding: "5px 16px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid rgba(255,255,255,0.14)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: openStatus.open ? "#4ade80" : "#555", display: "inline-block" }} />
                {openStatus.text}
              </span>
            ) : cityLabel ? (
              <span style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", color: "#fff", borderRadius: 9999, padding: "5px 16px", fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.14)" }}>📍 {cityLabel}</span>
            ) : null}
          </div>
          <h1 className="dk-name" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "clamp(3rem, 11vw, 7rem)", color: "#fff", lineHeight: 0.92, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 18 }}>
            {displayName}
          </h1>
          {displayTag && (
            <p className="dk-tag" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 400, fontSize: "clamp(0.9rem, 2.2vw, 1.1rem)", color: accent, lineHeight: 1.5, letterSpacing: "0.1em", marginBottom: 24, textTransform: "uppercase" }}>
              {displayTag}
            </p>
          )}
          {igHandle && (
            <div className="dk-ig" style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
              <a href={business.instagram_url ?? "#"} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.color = accent; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}>
                <IgIcon size={14} color="currentColor" />{igHandle}
              </a>
            </div>
          )}
          {/* Stars strip in hero */}
          <div className="dk-cta" style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
            {business.google_review_link ? (
              <a href={business.google_review_link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: `1px solid ${accent}40`, borderRadius: 9999, padding: "6px 16px", textDecoration: "none" }}>
                <span style={{ display: "flex", gap: 2, color: accent }}>{[0,1,2,3,4].map(i => <StarIcon key={i} size={12} color="currentColor" />)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{socialProofText}</span>
              </a>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: `1px solid ${accent}40`, borderRadius: 9999, padding: "6px 16px" }}>
                <span style={{ display: "flex", gap: 2, color: accent }}>{[0,1,2,3,4].map(i => <StarIcon key={i} size={12} color="currentColor" />)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{socialProofText}</span>
              </div>
            )}
          </div>
          <button className="dk-cta" onClick={openFromCTA}
            style={{ fontFamily: "'Oswald', sans-serif", background: accent, border: `2px solid ${accent}`, color: D.bg, padding: "15px 48px", borderRadius: 2, fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase", transition: "background 0.2s, color 0.2s, transform 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = D.bg; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {t.hero.bookNow}
          </button>
        </div>
      </section>

      {/* Social proof */}
      {(() => {
        const bar = (
          <div style={{ background: D.surface, padding: "15px 20px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, borderBottom: `1px solid ${D.border}`, position: "relative", zIndex: 1 }}>
            <span style={{ display: "flex", gap: 2, color: accent }}>
              {[0,1,2,3,4].map(i => <StarIcon key={i} size={15} color="currentColor" />)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{socialProofText}</span>
          </div>
        );
        return business.google_review_link ? <a href={business.google_review_link} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none", position: "relative", zIndex: 1 }}>{bar}</a> : <div style={{ position: "relative", zIndex: 1 }}>{bar}</div>;
      })()}

      {/* Stats strip */}
      {business.show_stats !== false && hasStats && (
        <div ref={statsRef} style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "20px 20px 0",
          opacity: statsVisible ? 1 : 0, transform: statsVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.6s ease, transform 0.6s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            {business.stat_years != null && <>
              <div style={{ textAlign: "center", padding: "0 20px" }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>{business.stat_years}+</div>
                <div style={{ fontSize: 10, color: D.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isRtl ? "שנות ניסיון" : "Years Exp."}</div>
              </div>
              {(business.stat_clients != null || business.stat_rating != null) && <div style={{ width: 1, height: 32, background: `${accent}35`, flexShrink: 0 }} />}
            </>}
            {business.stat_clients != null && <>
              <div style={{ textAlign: "center", padding: "0 20px" }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>{business.stat_clients}+</div>
                <div style={{ fontSize: 10, color: D.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isRtl ? "לקוחות" : "Clients"}</div>
              </div>
              {business.stat_rating != null && <div style={{ width: 1, height: 32, background: `${accent}35`, flexShrink: 0 }} />}
            </>}
            {business.stat_rating != null && (
              <div style={{ textAlign: "center", padding: "0 20px" }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, color: "#F59E0B", lineHeight: 1 }}>⭐ {business.stat_rating}</div>
                <div style={{ fontSize: 10, color: D.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isRtl ? "גוגל" : "Google"}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 140px", position: "relative", zIndex: 1 }}>

        {/* Sections — ordered by business.section_order, missing keys appended */}
        {(() => {
          const base = business.section_order || DEFAULT_SECTION_ORDER;
          const missing = DEFAULT_SECTION_ORDER.filter(k => !base.includes(k));
          return missing.length ? [...base, ...missing] : base;
        })().map(key => {
          switch (key) {
            case "services":
              return business.show_services !== false ? (
                <div key={key}>
                  <GoldDivider accent={accent} />
                  <section ref={servicesRef} style={{ paddingTop: 0 }}>
                    <DarkSectionTitle title={t.services.title} accent={accent} isRtl={isRtl} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {services.map((s, i) => {
                        const hovered = hoveredCard === s.id;
                        const fromInlineStart = i % 2 === 0;
                        const sName = (isRtl && s.name_he) ? s.name_he : s.name;
                        const sDesc = (isRtl && s.description_he) ? s.description_he : s.description;
                        return (
                          <div key={s.id} onMouseEnter={() => setHoveredCard(s.id)} onMouseLeave={() => setHoveredCard(null)}
                            style={{
                              background: hovered ? D.raised : D.surface,
                              border: `1px solid ${hovered ? accent + "55" : D.border}`,
                              borderInlineStart: `3px solid ${hovered ? accent : "transparent"}`,
                              borderRadius: 2, padding: "18px 20px", display: "flex",
                              justifyContent: "space-between", alignItems: "center",
                              opacity: servicesVisible ? 1 : 0,
                              transform: servicesVisible ? "translateX(0)" : fromInlineStart ? "translateX(-36px)" : "translateX(36px)",
                              transition: [`opacity 0.55s ease ${i * 75}ms`, `transform 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 75}ms`, "background 0.2s", "border-color 0.2s"].join(", "),
                              boxShadow: hovered ? `0 4px 24px ${accent}18` : "none",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 600, color: D.text, marginBottom: 3 }}>{sName}</div>
                              {sDesc && <div style={{ fontSize: 13, color: D.muted, marginBottom: 5, lineHeight: 1.4 }}>{sDesc}</div>}
                              <div style={{ fontSize: 12, color: D.muted }}>{s.duration} {t.min}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, marginInlineStart: 14 }}>
                              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, color: accent }}>₪{s.price}</span>
                              <button onClick={() => openFromService(s)}
                                style={{ fontFamily: "'Oswald', sans-serif", background: hovered ? accent : "transparent", color: hovered ? D.bg : accent, border: `1.5px solid ${accent}`, borderRadius: 2, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", transition: "background 0.2s, color 0.2s, transform 0.15s", whiteSpace: "nowrap" }}
                                onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = D.bg; e.currentTarget.style.transform = "scale(1.04)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = hovered ? accent : "transparent"; e.currentTarget.style.color = hovered ? D.bg : accent; e.currentTarget.style.transform = "scale(1)"; }}
                              >
                                {t.services.book}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              ) : null;
            case "about":
              return business.show_about !== false && displayAbout ? (
                <div key={key}>
                  <GoldDivider accent={accent} />
                  <DarkSectionTitle title={t.about.title} accent={accent} isRtl={isRtl} />
                  <div style={{ background: D.surface, borderRadius: 2, padding: "24px 22px", border: `1px solid ${D.border}`, borderInlineStart: `3px solid ${accent}60` }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
                      {business.hero_image_url && (
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <img src={business.hero_image_url} alt={displayName} style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${accent}`, flexShrink: 0 }} />
                          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: accent, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayName}</span>
                        </div>
                      )}
                      <p style={{ fontSize: 15, lineHeight: 1.85, color: D.muted, margin: 0 }}>{displayAbout}</p>
                    </div>
                  </div>
                </div>
              ) : null;
            case "gallery":
              return business.show_gallery !== false && business.gallery_images && business.gallery_images.length > 0 ? (
                <div key={key}>
                  <GoldDivider accent={accent} />
                  <DarkSectionTitle title={t.gallery.title} accent={accent} isRtl={isRtl} />
                  <SectionGallery photos={business.gallery_images} layout="grid" borderRadius={2} initialCount={4} />
                </div>
              ) : null;
            case "reviews":
              return business.show_reviews !== false && ((business.google_reviews && business.google_reviews.length > 0) || !!business.google_review_link) ? (
                <div key={key}>
                  <GoldDivider accent={accent} />
                  <DarkSectionTitle title={t.reviews.title} accent={accent} isRtl={isRtl} />
                  <SectionReviews
                    reviews={business.google_reviews ?? []}
                    accentColor={accent}
                    darkColor={D.text}
                    bgColor={D.surface}
                    borderColor={D.border}
                    reviewLink={business.google_review_link}
                    leaveReviewLabel={t.reviews.leaveReview}
                  />
                </div>
              ) : null;
            case "hours":
              return business.show_hours !== false && business.business_hours ? (
                <div key={key}>
                  <GoldDivider accent={accent} />
                  <DarkSectionTitle title={t.hours.title} accent={accent} isRtl={isRtl} />
                  <div style={{ background: D.surface, borderRadius: 2, padding: "8px 4px", border: `1px solid ${D.border}` }}>
                    <SectionHours hours={business.business_hours} darkColor={D.text} accentColor={accent} mutedColor={D.muted} dayLabels={t.days} closedLabel={t.hours.closed} />
                  </div>
                </div>
              ) : null;
            case "location":
              return business.show_location !== false && business.address ? (
                <div key={key}>
                  <GoldDivider accent={accent} />
                  <DarkSectionTitle title={t.location.title} accent={accent} isRtl={isRtl} />
                  <div style={{ background: D.surface, borderRadius: 2, padding: "20px", border: `1px solid ${D.border}` }}>
                    <SectionLocation address={business.address} darkColor={D.text} accentColor={accent} directionsLabel={t.location.directions} googleMapsUrl={business.google_maps_url} wazeUrl={business.waze_url} />
                  </div>
                </div>
              ) : null;
            default:
              return null;
          }
        })}

        <ThemeFooter
          business={business}
          accent={accent}
          colors={D}
          socialShape="square"
          socialBg={accent}
          iconColor={D.bg}
          footerLabel={t.footer.poweredBy}
          brandLabel={t.footer.brand}
          topBorder
          footerLabelStyle={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}
        />
      </div>

      <FloatingCTA shopName={displayName} bookLabel={t.hero.bookNow} onBook={openFromCTA} bgColor={accent} textColor={D.bg} />

      {waNumber && (
        <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 90, insetInlineStart: 20, width: 52, height: 52, borderRadius: 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 24px ${accent}44`, zIndex: 50, transform: showWa ? "translateY(0) scale(1)" : "translateY(20px) scale(0.85)", opacity: showWa ? 1 : 0, transition: "transform 0.35s ease, opacity 0.35s ease", pointerEvents: showWa ? "auto" : "none" }}>
          <WaIcon size={22} color={D.bg} />
        </a>
      )}

      {overlayOpen && <BookingOverlay business={business} services={services} initialService={selectedService} onClose={closeOverlay} accentColor={accent} darkColor={D.text} bgColor={D.surface} lang={lang} />}
    </div>
  );
}
