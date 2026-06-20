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

const FALLBACK_HERO = "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80";

const P = { bg: "#FFFFFF", text: "#111111", muted: "#6B7280", surface: "#F9F9F9", border: "#E5E5E5", panel: "#141414" };
const DEFAULT_SECTION_ORDER = ["services", "gallery", "about", "hours", "location", "reviews"];

function SectionTitle({ title, accent }: { title: string; accent: string }) {
  const { ref, visible } = useFadeInOnEnter();
  return (
    <div ref={ref} style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: P.text, letterSpacing: "-0.02em", marginBottom: 10 }}>{title}</h2>
      <div style={{ height: 2, borderRadius: 2, background: accent, width: visible ? 28 : 0, transition: "width 0.55s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

interface Props { business: Business; services: Service[]; }

export function CleanPage({ business, services }: Props) {
  const [overlayOpen,     setOverlayOpen]     = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hoveredCard,     setHoveredCard]     = useState<string | null>(null);
  const [showWa,          setShowWa]          = useState(false);
  const [lang,            setLang]            = useState<Lang>((business.default_lang as Lang) || "en");

  const t     = translations[lang];
  const isRtl = lang === "he";

  const { ref: servicesRef, visible: servicesVisible } = useFadeInOnEnter();
  const { ref: statsRef,    visible: statsVisible }    = useFadeInOnEnter(0.3);

  useEffect(() => {
    const onScroll = () => {
      setShowWa(window.scrollY > window.innerHeight * 0.7);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accent       = business.accent_color || "#111111";
  const heroImage    = business.hero_image_url || FALLBACK_HERO;
  const waNumber     = business.whatsapp_number?.replace(/\D/g, "");
  const openStatus   = getOpenStatus(business.business_hours, t.status, t.days);
  const igHandle     = getInstagramHandle(business.instagram_url);
  const cityLabel    = getCityFromAddress(business.address);
  const hasStats     = business.stat_clients != null || business.stat_rating != null;
  const displayName  = (isRtl && business.name_he) ? business.name_he : business.name;

  const socialProofText = (() => {
    if (business.stat_rating && business.stat_clients)
      return isRtl ? `${business.stat_rating} · ${business.stat_clients}+ לקוחות מרוצים` : `${business.stat_rating} · ${business.stat_clients}+ happy clients`;
    if (business.stat_rating)
      return isRtl ? `${business.stat_rating} ⭐ גוגל` : `${business.stat_rating} Google rating`;
    if (business.stat_clients)
      return isRtl ? `${business.stat_clients}+ לקוחות מרוצים` : `${business.stat_clients}+ happy clients`;
    return t.social.happyClients;
  })();
  const displayTag   = (isRtl && business.tagline_he) ? business.tagline_he : business.tagline;
  const displayAbout = (isRtl && business.about_text_he) ? business.about_text_he : business.about_text;

  function openFromService(s: Service) { setSelectedService(s); setOverlayOpen(true); }
  function openFromCTA()               { setSelectedService(null); setOverlayOpen(true); }
  function closeOverlay()              { setOverlayOpen(false); setSelectedService(null); }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} style={{ background: P.bg, minHeight: "100svh", fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
        @keyframes imgReveal { from{transform:scale(1.06)} to{transform:scale(1)} }
        .cl-name    { animation: fadeUp 0.65s ease-out 0.2s both; }
        .cl-pill    { animation: fadeUp 0.5s ease-out 0.3s both; }
        .cl-tag     { animation: fadeUp 0.65s ease-out 0.38s both; }
        .cl-stars   { animation: fadeUp 0.5s ease-out 0.48s both; }
        .cl-cta     { animation: fadeUp 0.6s ease-out 0.55s both; }
        .cl-ig      { animation: fadeUp 0.5s ease-out 0.6s both; }
        .cl-sticky  { animation: slideDown 0.3s ease-out both; }
        .cl-hero-img { animation: imgReveal 1.2s ease-out both; }
        .cl-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important; }
        /* Split hero */
        .cl-hero { display: flex; height: 100svh; }
        .cl-hero-panel { width: 50%; background: ${P.panel}; display: flex; flex-direction: column; justify-content: center; padding: 60px 52px 60px 52px; box-sizing: border-box; position: relative; overflow: hidden; }
        .cl-hero-photo { width: 50%; position: relative; overflow: hidden; }
        @media (max-width: 767px) {
          .cl-hero { flex-direction: column; }
          .cl-hero-panel { width: 100%; padding: 44px 28px 52px; justify-content: flex-end; min-height: 48svh; }
          .cl-hero-photo { width: 100%; height: 52svh; }
        }
      `}</style>

      <LangToggle lang={lang} setLang={setLang} />

      {/* Sticky header */}
      <div className="cl-sticky" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 150, height: 56, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", gap: 12, paddingInlineStart: 24, paddingInlineEnd: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: P.text, letterSpacing: "-0.02em", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
        <button onClick={openFromCTA}
          style={{ flexShrink: 0, height: 36, padding: "0 18px", borderRadius: 9999, background: accent, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >{t.hero.cta}</button>
      </div>

      {/* Split hero */}
      <section className="cl-hero">
        {/* Left — dark text panel */}
        <div className="cl-hero-panel">
          {/* Subtle grain overlay */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <filter id="cl-grain"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
            <rect width="100%" height="100%" filter="url(#cl-grain)"/>
          </svg>

          {/* Open status / city pill */}
          <div className="cl-pill" style={{ marginBottom: 20 }}>
            {openStatus ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", borderRadius: 9999, padding: "5px 13px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: openStatus.open ? "#4ade80" : "#9CA3AF", flexShrink: 0 }} />
                {openStatus.text}
              </span>
            ) : cityLabel ? (
              <span style={{ display: "inline-flex", background: "rgba(255,255,255,0.1)", borderRadius: 9999, padding: "5px 13px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>📍 {cityLabel}</span>
            ) : null}
          </div>

          {/* Name */}
          <h1 className="cl-name" style={{ fontWeight: 800, fontSize: "clamp(2.4rem, 5vw, 4.2rem)", color: "#fff", lineHeight: 0.95, letterSpacing: "-0.03em", marginBottom: 16, marginTop: 0 }}>
            {displayName}
          </h1>

          {/* Tagline */}
          {displayTag && (
            <p className="cl-tag" dir="auto" style={{ fontWeight: 400, fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)", color: "rgba(255,255,255,0.62)", lineHeight: 1.55, marginBottom: 24, maxWidth: 340 }}>
              {displayTag}
            </p>
          )}

          {/* Stars strip */}
          <div className="cl-stars" style={{ marginBottom: 28 }}>
            {business.google_review_link ? (
              <a href={business.google_review_link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.1)", borderRadius: 9999, padding: "6px 14px", textDecoration: "none" }}>
                <span style={{ display: "flex", gap: 2, color: accent || "#F59E0B" }}>{[0,1,2,3,4].map(i => <StarIcon key={i} size={13} color="currentColor" />)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{socialProofText}</span>
              </a>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.1)", borderRadius: 9999, padding: "6px 14px" }}>
                <span style={{ display: "flex", gap: 2, color: accent || "#F59E0B" }}>{[0,1,2,3,4].map(i => <StarIcon key={i} size={13} color="currentColor" />)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{socialProofText}</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <button className="cl-cta" onClick={openFromCTA}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "none", borderRadius: 9999, color: P.panel, fontSize: 15, fontWeight: 800, padding: "15px 32px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.02em", transition: "background 0.2s, color 0.2s, transform 0.15s", marginBottom: 20, whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = P.panel; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {t.hero.cta}
          </button>

          {/* IG handle */}
          {igHandle && (
            <div className="cl-ig">
              <a href={business.instagram_url ?? "#"} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
              >
                <IgIcon size={14} color="currentColor" />{igHandle}
              </a>
            </div>
          )}
        </div>

        {/* Right — photo */}
        <div className="cl-hero-photo">
          <img src={heroImage} alt="" className="cl-hero-img" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </section>

      {/* Stats strip */}
      {business.show_stats !== false && hasStats && (
        <div ref={statsRef} style={{ padding: "32px 20px 0", maxWidth: 640, margin: "0 auto",
          opacity: statsVisible ? 1 : 0, transform: statsVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.55s ease, transform 0.55s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            {business.stat_clients != null && <>
              <div style={{ textAlign: "center", padding: "0 20px" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: P.text, letterSpacing: "-0.04em", lineHeight: 1 }}>{business.stat_clients}+</div>
                <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isRtl ? "לקוחות" : "Clients"}</div>
              </div>
              {business.stat_rating != null && <div style={{ width: 1, height: 32, background: P.border, flexShrink: 0 }} />}
            </>}
            {business.stat_rating != null && (
              <div style={{ textAlign: "center", padding: "0 20px" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#F59E0B", letterSpacing: "-0.04em", lineHeight: 1 }}>⭐ {business.stat_rating}</div>
                <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isRtl ? "גוגל" : "Google"}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 140px" }}>

        {/* Sections — ordered by business.section_order, missing keys appended */}
        {(() => {
          const base = business.section_order || DEFAULT_SECTION_ORDER;
          const missing = DEFAULT_SECTION_ORDER.filter(k => !base.includes(k));
          return missing.length ? [...base, ...missing] : base;
        })().map(key => {
          switch (key) {
            case "services":
              return business.show_services !== false ? (
                <section key={key} ref={servicesRef} style={{ paddingTop: (business.show_stats !== false && hasStats) ? 44 : 52 }}>
                  <SectionTitle title={t.services.title} accent={accent} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {services.map((s, i) => {
                      const hovered = hoveredCard === s.id;
                      const sName = (isRtl && s.name_he) ? s.name_he : s.name;
                      const sDesc = (isRtl && s.description_he) ? s.description_he : s.description;
                      return (
                        <div key={s.id} onMouseEnter={() => setHoveredCard(s.id)} onMouseLeave={() => setHoveredCard(null)}
                          style={{ background: hovered ? P.surface : P.bg, border: `1px solid ${hovered ? accent : P.border}`, borderRadius: 10, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: servicesVisible ? 1 : 0, transform: servicesVisible ? "translateY(0)" : "translateY(16px)", transition: [`opacity 0.45s ease ${i * 60}ms`, `transform 0.45s ease ${i * 60}ms`, "background 0.2s", "border-color 0.2s", "box-shadow 0.2s"].join(", "), boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.06)" : "none" }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 3 }}>{sName}</div>
                            {sDesc && <div style={{ fontSize: 13, color: P.muted, marginBottom: 5, lineHeight: 1.4 }}>{sDesc}</div>}
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: P.muted }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              {s.duration} {t.min}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginInlineStart: 14 }}>
                            <span style={{ fontSize: 17, fontWeight: 800, color: P.text, letterSpacing: "-0.02em" }}>₪{s.price}</span>
                            <button onClick={() => openFromService(s)}
                              style={{ height: 36, padding: "0 18px", borderRadius: 9999, background: hovered ? accent : P.text, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s, transform 0.15s", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}
                              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
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
                  <SectionTitle title={t.about.title} accent={accent} />
                  {business.hero_image_url && (
                    <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
                      <img src={business.hero_image_url} alt={displayName} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${P.border}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{displayName}</span>
                    </div>
                  )}
                  <p style={{ fontSize: 16, lineHeight: 1.85, color: P.muted }}>{displayAbout}</p>
                </section>
              ) : null;
            case "gallery":
              return business.show_gallery !== false && business.gallery_images && business.gallery_images.length > 0 ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.gallery.title} accent={accent} />
                  <SectionGallery photos={business.gallery_images} layout="masonry" borderRadius={10} initialCount={4} />
                </section>
              ) : null;
            case "reviews":
              return business.show_reviews !== false && ((business.google_reviews && business.google_reviews.length > 0) || !!business.google_review_link) ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.reviews.title} accent={accent} />
                  <div style={{ marginTop: 20 }}>
                    <SectionReviews
                      reviews={business.google_reviews ?? []}
                      accentColor={accent}
                      darkColor={P.text}
                      bgColor={P.surface}
                      borderColor={P.border}
                      reviewLink={business.google_review_link}
                      leaveReviewLabel={t.reviews.leaveReview}
                    />
                  </div>
                </section>
              ) : null;
            case "hours":
              return business.show_hours !== false && business.business_hours ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.hours.title} accent={accent} />
                  <SectionHours hours={business.business_hours} darkColor={P.text} accentColor={accent} mutedColor={P.muted} dayLabels={t.days} closedLabel={t.hours.closed} />
                </section>
              ) : null;
            case "location":
              return business.show_location !== false && business.address ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.location.title} accent={accent} />
                  <SectionLocation address={business.address} darkColor={P.text} accentColor={accent} directionsLabel={t.location.directions} googleMapsUrl={business.google_maps_url} wazeUrl={business.waze_url} />
                </section>
              ) : null;
            default:
              return null;
          }
        })}

        <ThemeFooter
          business={business}
          accent={accent}
          colors={{ text: P.text, muted: P.muted, surface: P.surface, border: P.border }}
          socialShape="circle"
          socialBg={P.surface}
          iconColor={P.text}
          footerLabel={t.footer.poweredBy}
          brandLabel={t.footer.brand}
          topBorder
        />
      </div>

      <FloatingCTA shopName={displayName} bookLabel={t.hero.cta} onBook={openFromCTA} bgColor={accent} textColor="#fff" />

      {waNumber && (
        <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 90, left: 20, width: 52, height: 52, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 50, transform: showWa ? "translateY(0) scale(1)" : "translateY(20px) scale(0.85)", opacity: showWa ? 1 : 0, transition: "transform 0.35s ease, opacity 0.35s ease", pointerEvents: showWa ? "auto" : "none" }}>
          <WaIcon size={22} color="#fff" />
        </a>
      )}

      {overlayOpen && <BookingOverlay business={business} services={services} initialService={selectedService} onClose={closeOverlay} accentColor={accent} darkColor={P.text} bgColor={P.bg} lang={lang} />}
    </div>
  );
}
