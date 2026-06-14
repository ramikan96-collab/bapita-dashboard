"use client";

import { useState, useEffect, useRef } from "react";
import type { Business, Service, BusinessHours, DayKey } from "@/types";
import { FloatingCTA }    from "../../components/FloatingCTA";
import { SectionGallery } from "../../components/SectionGallery";
import { SectionHours }   from "../../components/SectionHours";
import { SectionLocation } from "../../components/SectionLocation";
import { BookingOverlay }  from "../../booking/BookingOverlay";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80";

const DAYS: DayKey[] = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function getOpenStatus(hours?: BusinessHours): { open: boolean; text: string } | null {
  if (!hours) return null;
  const now = new Date();
  const todayIdx = now.getDay();
  const todayKey = DAYS[todayIdx];
  const todayH = hours[todayKey];
  const nowMins = now.getHours() * 60 + now.getMinutes();

  function fmt(t: string) {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  if (todayH.open) {
    const [sh, sm] = todayH.start.split(":").map(Number);
    const [eh, em] = todayH.end.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (nowMins >= startMins && nowMins < endMins) return { open: true, text: "Open now" };
    if (nowMins < startMins) return { open: false, text: `Closed · Opens today at ${fmt(todayH.start)}` };
  }

  for (let i = 1; i <= 7; i++) {
    const nextKey = DAYS[(todayIdx + i) % 7];
    const nextH = hours[nextKey];
    if (nextH.open) {
      const label = i === 1 ? "tomorrow" : nextKey.charAt(0).toUpperCase() + nextKey.slice(1);
      return { open: false, text: `Closed · Opens ${label} at ${fmt(nextH.start)}` };
    }
  }
  return { open: false, text: "Closed" };
}

function getInstagramHandle(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([^/?#]+)/);
  if (m) return `@${m[1].replace(/\/$/, "")}`;
  if (url.startsWith("@")) return url;
  return `@${url}`;
}

function getCityFromAddress(address?: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map(s => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || null;
}

function IgIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function WaIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function FbIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function useFadeInOnEnter() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

interface Props {
  business: Business;
  services: Service[];
}

export function CleanPage({ business, services }: Props) {
  const [overlayOpen,     setOverlayOpen]     = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hoveredCard,     setHoveredCard]     = useState<string | null>(null);
  const [showWa,          setShowWa]          = useState(false);

  const { ref: servicesRef, visible: servicesVisible } = useFadeInOnEnter();

  useEffect(() => {
    const onScroll = () => setShowWa(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accent    = business.accent_color || "#1D1D1D";
  const heroImage = business.hero_image_url || FALLBACK_HERO;
  const waNumber  = business.whatsapp_number?.replace(/\D/g, "");

  const openStatus = getOpenStatus(business.business_hours);
  const igHandle   = getInstagramHandle(business.instagram_url);
  const cityLabel  = getCityFromAddress(business.address);

  function openFromService(s: Service) { setSelectedService(s); setOverlayOpen(true); }
  function openFromCTA()               { setSelectedService(null); setOverlayOpen(true); }
  function closeOverlay()              { setOverlayOpen(false); setSelectedService(null); }

  const P = {
    bg:      "#FFFFFF",
    text:    "#111111",
    muted:   "#6B7280",
    surface: "#F9F9F9",
    border:  "#E5E5E5",
  };

  return (
    <div style={{ background: P.bg, minHeight: "100svh", fontFamily: "'Plus Jakarta Sans', sans-serif", color: P.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');

        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .cl-pill { animation: fadeUp 0.5s ease-out 0.2s both; }
        .cl-name { animation: fadeUp 0.6s ease-out 0.3s both; }
        .cl-tag  { animation: fadeUp 0.6s ease-out 0.4s both; }
        .cl-ig   { animation: fadeUp 0.6s ease-out 0.5s both; }
        .cl-cta  { animation: fadeUp 0.6s ease-out 0.55s both; }
      `}</style>

      {/* ─── Hero ─── */}
      <section style={{ position: "relative", height: "70svh", overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "flex-start" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img src={heroImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.62) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "0 32px 40px", width: "100%", maxWidth: 640 }}>
          {/* Status pill */}
          <div className="cl-pill" style={{ marginBottom: 16 }}>
            {openStatus ? (
              <span style={{
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
                color: "#fff", borderRadius: 9999, padding: "4px 12px",
                fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: openStatus.open ? "#22c55e" : "#9CA3AF", display: "inline-block" }} />
                {openStatus.text}
              </span>
            ) : cityLabel ? (
              <span style={{
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
                color: "#fff", borderRadius: 9999, padding: "4px 12px",
                fontSize: 12, fontWeight: 600,
              }}>
                📍 {cityLabel}
              </span>
            ) : null}
          </div>

          <h1 className="cl-name" style={{
            fontWeight: 800, fontSize: "clamp(2rem, 7vw, 3.5rem)",
            color: "#fff", lineHeight: 1.06, letterSpacing: "-0.03em", marginBottom: 10,
          }}>
            {business.name}
          </h1>

          {business.tagline && (
            <p className="cl-tag" style={{
              fontWeight: 400, fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)",
              color: "rgba(255,255,255,0.82)", lineHeight: 1.5, marginBottom: 16,
            }}>
              {business.tagline}
            </p>
          )}

          {igHandle && (
            <div className="cl-ig" style={{ marginBottom: 20 }}>
              <a href={business.instagram_url ?? "#"} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.72)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.72)"; }}
              >
                <IgIcon size={14} color="currentColor" />
                {igHandle}
              </a>
            </div>
          )}

          <button
            className="cl-cta"
            onClick={openFromCTA}
            style={{
              background: "#fff", border: "none", borderRadius: 9999,
              color: accent, fontSize: 15, fontWeight: 800,
              padding: "13px 32px", cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.2s, color 0.2s",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = accent; }}
          >
            Book Appointment
          </button>
        </div>
      </section>

      {/* ─── Social proof bar ─── */}
      {(() => {
        const bar = (
          <div style={{
            background: P.bg,
            borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
            padding: "14px 20px", textAlign: "center",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <span style={{ display: "flex", gap: 2, color: "#F59E0B" }}>
              {[0,1,2,3,4].map(i => (
                <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: P.text }}>4.9 · 340 happy clients</span>
          </div>
        );
        return business.google_review_link ? (
          <a href={business.google_review_link} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
            {bar}
          </a>
        ) : bar;
      })()}

      {/* ─── Content ─── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 140px" }}>

        {/* Services */}
        <section ref={servicesRef} style={{ paddingTop: 52 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: P.text, marginBottom: 24, letterSpacing: "-0.02em" }}>Services</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {services.map((s, i) => {
              const hovered = hoveredCard === s.id;
              return (
                <div
                  key={s.id}
                  onMouseEnter={() => setHoveredCard(s.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: hovered ? P.surface : P.bg,
                    border: `1px solid ${P.border}`,
                    borderInlineStart: `3px solid ${hovered ? accent : P.border}`,
                    borderRadius: 8,
                    padding: "14px 18px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    opacity: servicesVisible ? 1 : 0,
                    transform: servicesVisible ? "translateY(0)" : "translateY(16px)",
                    transition: [
                      `opacity 0.45s ease ${i * 60}ms`,
                      `transform 0.45s ease ${i * 60}ms`,
                      "background 0.2s",
                      "border-color 0.2s",
                    ].join(", "),
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 2 }}>{s.name}</div>
                    {s.description && (
                      <div style={{ fontSize: 13, color: P.muted, marginBottom: 2, lineHeight: 1.4 }}>{s.description}</div>
                    )}
                    <span style={{
                      display: "inline-block", fontSize: 12, fontWeight: 600, color: P.muted,
                      background: P.surface, border: `1px solid ${P.border}`,
                      borderRadius: 4, padding: "2px 8px",
                    }}>
                      {s.duration} min
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginInlineStart: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: accent }}>₪{s.price}</span>
                    <button
                      onClick={() => openFromService(s)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: 700, color: accent,
                        textDecoration: "underline", fontFamily: "inherit",
                        padding: 0,
                      }}
                    >
                      Book
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* About */}
        {business.show_about !== false && business.about_text && (
          <section style={{ paddingTop: 52 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: P.muted, display: "block", marginBottom: 8 }}>
              About
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: P.text, marginBottom: 16, letterSpacing: "-0.02em" }}>
              {business.name}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: P.muted }}>
              {business.about_text}
            </p>
          </section>
        )}

        {/* Gallery */}
        {business.show_gallery !== false && business.gallery_images && business.gallery_images.length > 0 && (
          <section style={{ paddingTop: 52 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: P.text, marginBottom: 20, letterSpacing: "-0.02em" }}>Gallery</h2>
            <SectionGallery photos={business.gallery_images} layout="masonry" borderRadius={8} />
          </section>
        )}

        {/* Hours */}
        {business.show_hours !== false && business.business_hours && (
          <section style={{ paddingTop: 52 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: P.text, marginBottom: 20, letterSpacing: "-0.02em" }}>Hours</h2>
            <SectionHours hours={business.business_hours} darkColor={P.text} accentColor={accent} />
          </section>
        )}

        {/* Location */}
        {business.show_location !== false && business.address && (
          <section style={{ paddingTop: 52 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: P.text, marginBottom: 20, letterSpacing: "-0.02em" }}>Location</h2>
            <SectionLocation address={business.address} darkColor={P.text} accentColor={accent} />
          </section>
        )}

        {/* Footer */}
        <footer style={{ marginTop: 64, textAlign: "center" }}>
          {business.phone && (
            <a href={`tel:${business.phone}`} style={{ display: "block", fontSize: 13, color: P.muted, textDecoration: "none", marginBottom: 14 }}>
              {business.phone}
            </a>
          )}
          {(business.instagram_url || business.whatsapp_number || business.facebook_url) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
              {business.instagram_url && (
                <a href={business.instagram_url} target="_blank" rel="noopener noreferrer"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: P.surface, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}
                >
                  <IgIcon size={16} color={P.text} />
                </a>
              )}
              {business.whatsapp_number && (
                <a href={`https://wa.me/${business.whatsapp_number.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: P.surface, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}
                >
                  <WaIcon size={16} color={P.text} />
                </a>
              )}
              {business.facebook_url && (
                <a href={business.facebook_url} target="_blank" rel="noopener noreferrer"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: P.surface, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}
                >
                  <FbIcon size={16} color={P.text} />
                </a>
              )}
            </div>
          )}
          <div style={{ fontSize: 12, color: P.muted }}>
            Powered by{" "}
            <a href="https://bapita.com" style={{ color: accent, textDecoration: "none", fontWeight: 700 }}>Bapita</a>
          </div>
        </footer>
      </div>

      {/* Floating CTA */}
      <FloatingCTA shopName={business.name} onBook={openFromCTA} bgColor={accent} textColor="#fff" />

      {/* WhatsApp button */}
      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}`}
          target="_blank" rel="noopener noreferrer"
          style={{
            position: "fixed", bottom: 90, insetInlineStart: 20,
            width: 52, height: 52, borderRadius: "50%",
            background: accent, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            zIndex: 50,
            transform: showWa ? "translateY(0) scale(1)" : "translateY(20px) scale(0.85)",
            opacity: showWa ? 1 : 0,
            transition: "transform 0.35s ease, opacity 0.35s ease",
            pointerEvents: showWa ? "auto" : "none",
          }}
        >
          <WaIcon size={22} color="#fff" />
        </a>
      )}

      {/* Booking overlay */}
      {overlayOpen && (
        <BookingOverlay
          business={business}
          services={services}
          initialService={selectedService}
          onClose={closeOverlay}
          accentColor={accent}
          darkColor={P.text}
          bgColor={P.bg}
        />
      )}
    </div>
  );
}
