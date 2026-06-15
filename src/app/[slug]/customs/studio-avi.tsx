"use client";

import { useState, useEffect, useRef } from "react";
import type { Business, Service } from "@/types";
import { FloatingCTA }    from "../components/FloatingCTA";
import { SectionGallery } from "../components/SectionGallery";
import { SectionHours }   from "../components/SectionHours";
import { SectionLocation } from "../components/SectionLocation";
import { BookingOverlay }  from "../booking/BookingOverlay";

const C = {
  bg:   "#F8F2E8",
  dark: "#221510",
  gold: "#B8862A",
};

const FALLBACK_HERO = "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=80";

interface Props {
  business: Business;
  services: Service[];
}

function useFadeInOnEnter() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function SectionTitle({ title, accentColor, darkColor }: { title: string; accentColor: string; darkColor: string }) {
  const { ref, visible } = useFadeInOnEnter();
  return (
    <div ref={ref}>
      <h2 style={{ fontSize:22, fontWeight:800, color:darkColor, marginBottom:10, letterSpacing:"-0.01em" }}>{title}</h2>
      <div style={{
        height:3, borderRadius:2, background:accentColor,
        width: visible ? 32 : 0,
        transition:"width 0.5s ease",
      }} />
    </div>
  );
}

export function StudioAviPage({ business, services }: Props) {
  const [overlayOpen,      setOverlayOpen]      = useState(false);
  const [selectedService,  setSelectedService]  = useState<Service | null>(null);
  const [hoveredCard,      setHoveredCard]      = useState<string | null>(null);

  const { ref: servicesRef, visible: servicesVisible } = useFadeInOnEnter();

  const accent    = business.accent_color || C.gold;
  const heroImage = business.hero_image_url || FALLBACK_HERO;

  function openFromService(s: Service) { setSelectedService(s); setOverlayOpen(true); }
  function openFromCTA()               { setSelectedService(null); setOverlayOpen(true); }
  function closeOverlay()              { setOverlayOpen(false); setSelectedService(null); }

  return (
    <div style={{ background:C.bg, minHeight:"100svh", fontFamily:"'Heebo', sans-serif", color:C.dark }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');

        @keyframes kenBurns   { 0%{transform:scale(1.0)} 100%{transform:scale(1.06)} }
        @keyframes fadeUpLoad { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin       { to{transform:rotate(360deg)} }

        .c-hero-img  { animation: kenBurns 10s ease-in-out infinite alternate; }
        .c-name      { animation: fadeUpLoad 0.6s ease-out 0.3s both; }
        .c-tagline   { animation: fadeUpLoad 0.6s ease-out 0.45s both; }
        .c-hero-cta  { animation: fadeUpLoad 0.6s ease-out 0.5s both; }
      `}</style>

      {/* ─── Hero ─── */}
      <section style={{ position:"relative", height:"100svh", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
          <img src={heroImage} alt="" className="c-hero-img"
            style={{ width:"100%", height:"100%", objectFit:"cover", transformOrigin:"center center" }}
          />
        </div>
        <div style={{ position:"absolute", inset:0, background:"rgba(34,21,16,0.65)" }} />
        <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"0 28px", width:"100%", maxWidth:640 }}>
          <h1 className="c-name" style={{
            fontFamily:"'Playfair Display', serif",
            fontWeight:700,
            fontSize:"clamp(2.25rem, 8vw, 4.5rem)",
            color:"#fff", lineHeight:1.08, marginBottom:14,
          }}>
            {business.name}
          </h1>
          {business.tagline && (
            <p className="c-tagline" style={{
              fontSize:"clamp(1rem, 3vw, 1.2rem)",
              color:"rgba(255,255,255,0.78)", fontWeight:300,
              lineHeight:1.5, marginBottom:36,
            }}>
              {business.tagline}
            </p>
          )}
          <button
            className="c-hero-cta"
            onClick={openFromCTA}
            style={{
              background:"transparent", border:"2px solid #fff",
              color:"#fff", padding:"14px 36px", borderRadius:9999,
              fontSize:16, fontWeight:700, cursor:"pointer",
              letterSpacing:"0.02em", transition:"background 0.2s, color 0.2s",
              fontFamily:"inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color=C.dark; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#fff"; }}
          >
            Book Appointment
          </button>
        </div>
      </section>

      {/* ─── Sections ─── */}
      <div style={{ maxWidth:640, margin:"0 auto", padding:"0 20px 140px" }}>

        {/* Services */}
        <section ref={servicesRef} style={{ paddingTop:64 }}>
          <SectionTitle title="Services" accentColor={accent} darkColor={C.dark} />
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:28 }}>
            {services.map((s, i) => {
              const hovered = hoveredCard === s.id;
              return (
                <div
                  key={s.id}
                  onMouseEnter={() => setHoveredCard(s.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background:"#fff",
                    borderRadius:10,
                    boxShadow: hovered
                      ? "0 4px 16px rgba(34,21,16,0.10)"
                      : "0 1px 4px rgba(34,21,16,0.06)",
                    padding:"16px 18px",
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    borderInlineStart: `3px solid ${hovered ? accent : "transparent"}`,
                    opacity: servicesVisible ? 1 : 0,
                    transform: servicesVisible
                      ? (hovered ? "translateY(-2px)" : "translateY(0)")
                      : "translateY(20px)",
                    transition: [
                      `opacity 0.5s ease ${i * 80}ms`,
                      `transform 0.5s ease ${i * 80}ms`,
                      "box-shadow 0.2s ease",
                      "border-color 0.2s ease",
                    ].join(", "),
                  }}
                >
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:C.dark, marginBottom:4 }}>{s.name}</div>
                    <div style={{ fontSize:13, color:C.dark, opacity:0.55 }}>{s.duration} min</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ fontSize:18, fontWeight:900, color:C.dark }}>₪{s.price}</div>
                    <button
                      onClick={() => openFromService(s)}
                      style={{
                        height:36, padding:"0 16px", borderRadius:9999,
                        background:C.dark, color:C.bg,
                        fontSize:13, fontWeight:700, border:"none", cursor:"pointer",
                        whiteSpace:"nowrap", transition:"background 0.2s ease",
                        fontFamily:"inherit",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = accent; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.dark; }}
                    >
                      Book →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Gallery */}
        {business.show_gallery !== false &&
         business.gallery_images && business.gallery_images.length > 0 && (
          <section style={{ paddingTop:64 }}>
            <SectionTitle title="Gallery" accentColor={accent} darkColor={C.dark} />
            <div style={{ marginTop:28 }}>
              <SectionGallery photos={business.gallery_images} />
            </div>
          </section>
        )}

        {/* About */}
        {business.show_about !== false && business.about_text && (
          <section style={{ paddingTop:64 }}>
            <SectionTitle title="About" accentColor={accent} darkColor={C.dark} />
            <p style={{ marginTop:20, fontSize:16, lineHeight:1.8, color:C.dark, opacity:0.8 }}>
              {business.about_text}
            </p>
          </section>
        )}

        {/* Hours */}
        {business.show_hours !== false && business.business_hours && (
          <section style={{ paddingTop:64 }}>
            <SectionTitle title="Hours" accentColor={accent} darkColor={C.dark} />
            <div style={{ marginTop:20 }}>
              <SectionHours hours={business.business_hours} darkColor={C.dark} accentColor={accent} />
            </div>
          </section>
        )}

        {/* Location */}
        {business.show_location !== false && business.address && (
          <section style={{ paddingTop:64 }}>
            <SectionTitle title="Location" accentColor={accent} darkColor={C.dark} />
            <div style={{ marginTop:20 }}>
              <SectionLocation address={business.address} darkColor={C.dark} accentColor={accent} />
            </div>
          </section>
        )}

        {/* Footer */}
        <footer style={{ marginTop:64, textAlign:"center", fontSize:12, color:C.dark, opacity:0.38 }}>
          Powered by{" "}
          <a href="https://bapita.com" style={{ color:accent, textDecoration:"none", fontWeight:700 }}>
            Bapita
          </a>
        </footer>
      </div>

      {/* Floating CTA */}
      <FloatingCTA
        shopName={business.name}
        bookLabel="Book Appointment"
        onBook={openFromCTA}
        bgColor={accent}
        textColor="#fff"
      />

      {/* Booking overlay */}
      {overlayOpen && (
        <BookingOverlay
          business={business}
          services={services}
          initialService={selectedService}
          onClose={closeOverlay}
          accentColor={accent}
          darkColor={C.dark}
          bgColor={C.bg}
        />
      )}
    </div>
  );
}
