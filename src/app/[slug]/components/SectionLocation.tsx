"use client";

import { useEffect, useRef, useState } from "react";

function isSafeUrl(u?: string | null): u is string {
  if (!u) return false;
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:" || p.protocol === "waze:";
  } catch { return false; }
}

interface Props {
  address: string;
  darkColor: string;
  accentColor: string;
  directionsLabel?: string;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
}

export function SectionLocation({ address, darkColor, accentColor, directionsLabel = "Get Directions →", googleMapsUrl, wazeUrl }: Props) {
  const fallbackMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  const mapsUrl = isSafeUrl(googleMapsUrl) ? googleMapsUrl : fallbackMapsUrl;

  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

  // The Maps embed iframe pulls in ~350KB of Maps JS on connect; native loading="lazy"
  // doesn't defer it enough since this section usually sits several screens down but
  // still within the browser's eager-load margin. Gate it on a real IntersectionObserver
  // instead so it stays off the initial-load window entirely.
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 15, color: darkColor, lineHeight: 1.6 }}>{address}</div>

      <div ref={containerRef} style={{ position: "relative", borderRadius: 12, overflow: "hidden", width: "100%", aspectRatio: "16/9" }}>
        {shouldLoad && (
          <iframe
            src={embedSrc}
            width="100%"
            height="100%"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location map"
          />
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ position: "absolute", inset: 0 }}
          aria-label="Open in Google Maps"
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Google Maps button */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 9999, border: `1.5px solid ${accentColor}44`, color: accentColor, textDecoration: "none", fontSize: 13, fontWeight: 700, transition: "background 0.15s, border-color 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accentColor + "12"; (e.currentTarget as HTMLElement).style.borderColor = accentColor; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = accentColor + "44"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {directionsLabel}
        </a>

        {/* Waze button — only if wazeUrl is a safe http(s) URL */}
        {isSafeUrl(wazeUrl) && (
          <a
            href={wazeUrl!}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 9999, border: `1.5px solid ${accentColor}44`, color: accentColor, textDecoration: "none", fontSize: 13, fontWeight: 700, transition: "background 0.15s, border-color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accentColor + "12"; (e.currentTarget as HTMLElement).style.borderColor = accentColor; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = accentColor + "44"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            Waze
          </a>
        )}
      </div>
    </div>
  );
}
