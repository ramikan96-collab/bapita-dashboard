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

const FALLBACK_HERO = "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80";

const D = {
  bg:      "#0D0D0D",
  surface: "#181818",
  raised:  "#222222",
  text:    "#F0F0F0",
  muted:   "#888888",
  border:  "rgba(255,255,255,0.08)",
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

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

function useCountUp(target: number | null, durationMs: number, enabled: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled || target == null) return;
    let current = 0;
    const steps = Math.floor(durationMs / 16);
    const inc = target / steps;
    const id = setInterval(() => {
      current = Math.min(current + inc, target);
      setValue(Math.round(current));
      if (current >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [enabled, target, durationMs]);
  return value;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IgIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
}
function WaIcon({ size = 20, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
}
function FbIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
}

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

// ─── Stats chip with count-up ─────────────────────────────────────────────────

function StatChip({ value, suffix, label, accent, delay, enabled }: {
  value: number | null;
  suffix?: string;
  label: string;
  accent: string;
  delay: number;
  enabled: boolean;
}) {
  const counted = useCountUp(value, 1400, enabled);
  return (
    <div style={{
      flex: "1 1 100px",
      background: D.surface,
      border: `1px solid ${accent}30`,
      borderRadius: 2,
      padding: "28px 16px 22px",
      textAlign: "center",
      opacity: enabled ? 1 : 0,
      transform: enabled ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 44, fontWeight: 700, color: accent, lineHeight: 1, letterSpacing: "-0.01em" }}>
        {value != null ? counted : "—"}{suffix}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: D.muted, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
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

      {/* Film grain overlay — SVG feTurbulence, zero performance cost */}
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

      {/* Lang toggle — physically top-right always */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", borderRadius: 9999, padding: "4px", display: "flex", border: "1px solid rgba(255,255,255,0.12)" }}>
        {(["en", "he"] as Lang[]).map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ background: lang === l ? "rgba(255,255,255,0.16)" : "none", border: "none", borderRadius: 9999, padding: "3px 11px", cursor: "pointer", fontSize: 12, fontWeight: lang === l ? 700 : 400, color: "#fff", fontFamily: "inherit", transition: "background 0.2s" }}>
            {l === "en" ? "EN" : "עב"}
          </button>
        ))}
      </div>

      {/* Sticky header */}
      {stickyVisible && (
        <div className="dk-sticky" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 150, height: 56, background: "rgba(13,13,13,0.92)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${accent}25`, display: "flex", alignItems: "center", paddingLeft: 24, paddingRight: 128 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: D.text, letterSpacing: "0.08em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{displayName}</span>
          <button onClick={openFromCTA}
            style={{ fontFamily: "'Oswald', sans-serif", position: "absolute", right: 128, top: "50%", transform: "translateY(-50%)", height: 34, padding: "0 20px", borderRadius: 2, background: accent, color: D.bg, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", transition: "background 0.2s", whiteSpace: "nowrap" }}
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
        {/* Multi-stop gradient: dark bottom, dark top bar, deep vignette */}
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
                <span style={{ display: "flex", gap: 2, color: accent }}>{[0,1,2,3,4].map(i => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{t.social.happyClients}</span>
              </a>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: `1px solid ${accent}40`, borderRadius: 9999, padding: "6px 16px" }}>
                <span style={{ display: "flex", gap: 2, color: accent }}>{[0,1,2,3,4].map(i => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{t.social.happyClients}</span>
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
              {[0,1,2,3,4].map(i => <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{t.social.happyClients}</span>
          </div>
        );
        return business.google_review_link ? <a href={business.google_review_link} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none", position: "relative", zIndex: 1 }}>{bar}</a> : <div style={{ position: "relative", zIndex: 1 }}>{bar}</div>;
      })()}

      {/* Stats row with count-up */}
      {business.show_stats !== false && hasStats && (
        <div ref={statsRef} style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
            {business.stat_years != null && (
              <StatChip value={business.stat_years} suffix="+" label={isRtl ? "שנות ניסיון" : "Years Exp."} accent={accent} delay={0} enabled={statsVisible} />
            )}
            {business.stat_clients != null && (
              <StatChip value={business.stat_clients} suffix="+" label={isRtl ? "לקוחות" : "Clients Served"} accent={accent} delay={120} enabled={statsVisible} />
            )}
            {business.stat_rating != null && (
              <div style={{
                flex: "1 1 100px",
                background: D.surface,
                border: `1px solid ${accent}30`,
                borderRadius: 2,
                padding: "28px 16px 22px",
                textAlign: "center",
                opacity: statsVisible ? 1 : 0,
                transform: statsVisible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.6s ease 240ms, transform 0.6s ease 240ms`,
              }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 44, fontWeight: 700, color: accent, lineHeight: 1, letterSpacing: "-0.01em" }}>
                  ⭐ {business.stat_rating}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: D.muted, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{isRtl ? "גוגל" : "Google Rating"}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 140px", position: "relative", zIndex: 1 }}>

        {/* Services */}
        {business.show_services !== false && (<>
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
                    borderRadius: 2,
                    padding: "18px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: servicesVisible ? 1 : 0,
                    transform: servicesVisible
                      ? "translateX(0)"
                      : fromInlineStart ? "translateX(-36px)" : "translateX(36px)",
                    transition: [
                      `opacity 0.55s ease ${i * 75}ms`,
                      `transform 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 75}ms`,
                      "background 0.2s",
                      "border-color 0.2s",
                    ].join(", "),
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
                      onMouseLeave={e => {
                        e.currentTarget.style.background = hovered ? accent : "transparent";
                        e.currentTarget.style.color = hovered ? D.bg : accent;
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {t.services.book}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </>)}

        {/* About */}
        {business.show_about !== false && displayAbout && (
          <>
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
          </>
        )}

        {/* Gallery */}
        {business.show_gallery !== false && business.gallery_images && business.gallery_images.length > 0 && (
          <>
            <GoldDivider accent={accent} />
            <DarkSectionTitle title={t.gallery.title} accent={accent} isRtl={isRtl} />
            <SectionGallery photos={business.gallery_images} layout="grid" borderRadius={2} initialCount={4} />
          </>
        )}

        {/* Hours */}
        {business.show_hours !== false && business.business_hours && (
          <>
            <GoldDivider accent={accent} />
            <DarkSectionTitle title={t.hours.title} accent={accent} isRtl={isRtl} />
            <div style={{ background: D.surface, borderRadius: 2, padding: "8px 4px", border: `1px solid ${D.border}` }}>
              <SectionHours hours={business.business_hours} darkColor={D.text} accentColor={accent} dayLabels={t.days} closedLabel={t.hours.closed} />
            </div>
          </>
        )}

        {/* Location */}
        {business.show_location !== false && business.address && (
          <>
            <GoldDivider accent={accent} />
            <DarkSectionTitle title={t.location.title} accent={accent} isRtl={isRtl} />
            <div style={{ background: D.surface, borderRadius: 2, padding: "20px", border: `1px solid ${D.border}` }}>
              <SectionLocation address={business.address} darkColor={D.text} accentColor={accent} directionsLabel={t.location.directions} />
            </div>
          </>
        )}

        {/* Footer */}
        <footer style={{ marginTop: 64, paddingTop: 32, borderTop: `1px solid ${D.border}`, textAlign: "center" }}>
          {business.phone && <a href={`tel:${business.phone}`} style={{ display: "block", fontSize: 13, color: D.muted, textDecoration: "none", marginBottom: 14 }}>{business.phone}</a>}
          {(business.instagram_url || business.whatsapp_number || business.facebook_url) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
              {business.instagram_url && <a href={business.instagram_url} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.opacity="0.75";}} onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}><IgIcon size={16} color={D.bg}/></a>}
              {business.whatsapp_number && <a href={`https://wa.me/${business.whatsapp_number.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.opacity="0.75";}} onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}><WaIcon size={16} color={D.bg}/></a>}
              {business.facebook_url && <a href={business.facebook_url} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.opacity="0.75";}} onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}><FbIcon size={16} color={D.bg}/></a>}
            </div>
          )}
          <div style={{ fontSize: 12, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", color: D.muted, textTransform: "uppercase" }}>
            {t.footer.poweredBy}{" "}<a href="https://bapita.com" style={{ color: accent, textDecoration: "none" }}>{t.footer.brand}</a>
          </div>
        </footer>
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
