"use client";

import { useState, useEffect, useRef } from "react";
import type { Business, Service } from "@/types";
import { FloatingCTA }    from "../../components/FloatingCTA";
import { SectionGallery } from "../../components/SectionGallery";
import { SectionHours }   from "../../components/SectionHours";
import { SectionLocation } from "../../components/SectionLocation";
import { BookingOverlay }  from "../../booking/BookingOverlay";
import { translations, type Lang } from "../../translations";
import { getOpenStatus, getInstagramHandle, getCityFromAddress } from "../../utils/openStatus";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80";

const P = { bg: "#FFFFFF", text: "#111111", muted: "#6B7280", surface: "#F9F9F9", border: "#E5E5E5", panel: "#141414" };
const DEFAULT_SECTION_ORDER = ["services", "gallery", "about", "hours", "location"];

function useFadeInOnEnter(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function SectionTitle({ title, accent }: { title: string; accent: string }) {
  const { ref, visible } = useFadeInOnEnter();
  return (
    <div ref={ref} style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: P.text, letterSpacing: "-0.02em", marginBottom: 10 }}>{title}</h2>
      <div style={{ height: 2, borderRadius: 2, background: accent, width: visible ? 28 : 0, transition: "width 0.55s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

function IgIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
}
function WaIcon({ size = 20, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
}
function FbIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
}

interface Props { business: Business; services: Service[]; }

export function CleanPage({ business, services }: Props) {
  const [overlayOpen,     setOverlayOpen]     = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hoveredCard,     setHoveredCard]     = useState<string | null>(null);
  const [showWa,          setShowWa]          = useState(false);
  const [stickyVisible,   setStickyVisible]   = useState(false);
  const [lang,            setLang]            = useState<Lang>((business.default_lang as Lang) || "en");

  const t     = translations[lang];
  const isRtl = lang === "he";

  const { ref: servicesRef, visible: servicesVisible } = useFadeInOnEnter();
  const { ref: statsRef,    visible: statsVisible }    = useFadeInOnEnter(0.3);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowWa(y > window.innerHeight * 0.7);
      setStickyVisible(y > window.innerHeight * 0.82);
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
  const hasStats     = business.stat_years != null || business.stat_clients != null || business.stat_rating != null;
  const displayName  = (isRtl && business.name_he) ? business.name_he : business.name;
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

      {/* Lang toggle — always top-right, never flips */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200, background: "rgba(0,0,0,0.48)", backdropFilter: "blur(8px)", borderRadius: 9999, padding: "4px", display: "flex" }}>
        {(["en", "he"] as Lang[]).map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ background: lang === l ? "rgba(255,255,255,0.22)" : "none", border: "none", borderRadius: 9999, padding: "3px 11px", cursor: "pointer", fontSize: 12, fontWeight: lang === l ? 700 : 400, color: "#fff", fontFamily: "inherit", transition: "background 0.2s" }}>
            {l === "en" ? "EN" : "עב"}
          </button>
        ))}
      </div>

      {/* Sticky header — fixed positioning, no logical properties */}
      {stickyVisible && (
        <div className="cl-sticky" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 150, height: 56, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", paddingLeft: 24, paddingRight: 140 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: P.text, letterSpacing: "-0.02em", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
          <button onClick={openFromCTA}
            style={{ position: "absolute", right: 140, top: "50%", transform: "translateY(-50%)", height: 36, padding: "0 18px", borderRadius: 9999, background: accent, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >{t.hero.cta}</button>
        </div>
      )}

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
                <span style={{ display: "flex", gap: 2, color: accent || "#F59E0B" }}>{[0,1,2,3,4].map(i => <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{t.social.happyClients}</span>
              </a>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.1)", borderRadius: 9999, padding: "6px 14px" }}>
                <span style={{ display: "flex", gap: 2, color: accent || "#F59E0B" }}>{[0,1,2,3,4].map(i => <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{t.social.happyClients}</span>
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

      {/* Stats row */}
      {business.show_stats !== false && hasStats && (
        <div ref={statsRef} style={{ padding: "40px 20px 0", maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {business.stat_years != null && (
              <div className="cl-stat-card" style={{ flex: "1 1 120px", maxWidth: 180, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, padding: "20px 16px", textAlign: "center", opacity: statsVisible ? 1 : 0, transform: statsVisible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.55s ease 0s, transform 0.55s ease 0s, box-shadow 0.18s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: P.text, letterSpacing: "-0.04em", lineHeight: 1 }}>{business.stat_years}+</div>
                <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isRtl ? "שנות ניסיון" : "Years Exp."}</div>
              </div>
            )}
            {business.stat_clients != null && (
              <div className="cl-stat-card" style={{ flex: "1 1 120px", maxWidth: 180, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, padding: "20px 16px", textAlign: "center", opacity: statsVisible ? 1 : 0, transform: statsVisible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.55s ease 0.1s, transform 0.55s ease 0.1s, box-shadow 0.18s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: P.text, letterSpacing: "-0.04em", lineHeight: 1 }}>{business.stat_clients}+</div>
                <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isRtl ? "לקוחות מרוצים" : "Happy Clients"}</div>
              </div>
            )}
            {business.stat_rating != null && (
              <div className="cl-stat-card" style={{ flex: "1 1 120px", maxWidth: 180, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, padding: "20px 16px", textAlign: "center", opacity: statsVisible ? 1 : 0, transform: statsVisible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.55s ease 0.2s, transform 0.55s ease 0.2s, box-shadow 0.18s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#F59E0B", letterSpacing: "-0.04em", lineHeight: 1 }}>⭐ {business.stat_rating}</div>
                <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isRtl ? "גוגל" : "Google"}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 140px" }}>

        {/* Sections — ordered by business.section_order */}
        {(business.section_order || DEFAULT_SECTION_ORDER).map(key => {
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
            case "hours":
              return business.show_hours !== false && business.business_hours ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.hours.title} accent={accent} />
                  <SectionHours hours={business.business_hours} darkColor={P.text} accentColor={accent} dayLabels={t.days} closedLabel={t.hours.closed} />
                </section>
              ) : null;
            case "location":
              return business.show_location !== false && business.address ? (
                <section key={key} style={{ paddingTop: 56 }}>
                  <SectionTitle title={t.location.title} accent={accent} />
                  <SectionLocation address={business.address} darkColor={P.text} accentColor={accent} directionsLabel={t.location.directions} />
                </section>
              ) : null;
            default:
              return null;
          }
        })}

        {/* Footer */}
        <footer style={{ marginTop: 64, paddingTop: 32, borderTop: `1px solid ${P.border}`, textAlign: "center" }}>
          {business.phone && <a href={`tel:${business.phone}`} style={{ display: "block", fontSize: 13, color: P.muted, textDecoration: "none", marginBottom: 14 }}>{business.phone}</a>}
          {(business.instagram_url || business.whatsapp_number || business.facebook_url) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
              {business.instagram_url && <a href={business.instagram_url} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: "50%", background: P.surface, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}><IgIcon size={16} color={P.text}/></a>}
              {business.whatsapp_number && <a href={`https://wa.me/${business.whatsapp_number.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: "50%", background: P.surface, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}><WaIcon size={16} color={P.text}/></a>}
              {business.facebook_url && <a href={business.facebook_url} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: "50%", background: P.surface, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}><FbIcon size={16} color={P.text}/></a>}
            </div>
          )}
          <div style={{ fontSize: 12, color: P.muted }}>{t.footer.poweredBy}{" "}<a href="https://bapita.com" style={{ color: accent, textDecoration: "none", fontWeight: 700 }}>{t.footer.brand}</a></div>
        </footer>
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
