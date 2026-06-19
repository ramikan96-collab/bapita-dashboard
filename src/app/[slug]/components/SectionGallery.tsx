"use client";

import { useState, useEffect } from "react";

interface Props {
  photos: string[];
  layout?: "featured" | "masonry" | "grid";
  borderRadius?: number;
  initialCount?: number;
}

export function SectionGallery({ photos, layout = "featured", borderRadius = 10, initialCount }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const limit = (initialCount && !expanded) ? initialCount : photos.length;
  const visible = photos.slice(0, limit);
  const hiddenCount = photos.length - limit;

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxIdx(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx]);

  if (!photos.length) return null;

  const imgStyle: React.CSSProperties = {
    width: "100%", height: "100%", objectFit: "cover",
    transition: "transform 0.3s ease",
    cursor: "pointer",
    display: "block",
  };
  const onEnter = (e: React.MouseEvent<HTMLImageElement>) => { e.currentTarget.style.transform = "scale(1.04)"; };
  const onLeave = (e: React.MouseEvent<HTMLImageElement>) => { e.currentTarget.style.transform = "scale(1.0)"; };

  let galleryNode: React.ReactNode;

  if (layout === "masonry") {
    // True CSS-columns masonry: images keep their natural aspect ratio and tile
    // without fixed heights, so mixed portrait/landscape uploads never leave the
    // ragged empty gaps the old fixed-height columns produced.
    galleryNode = (
      <>
        <style>{`.sg-masonry{column-count:2;column-gap:8px}.sg-masonry>div{break-inside:avoid;-webkit-column-break-inside:avoid;margin-bottom:8px}`}</style>
        <div className="sg-masonry">
          {visible.map((photo, i) => (
            <div key={i} style={{ borderRadius, overflow: "hidden" }}>
              <img src={photo} alt="" style={{ ...imgStyle, height: "auto" }} onClick={() => setLightboxIdx(i)} onMouseEnter={onEnter} onMouseLeave={onLeave} />
            </div>
          ))}
        </div>
      </>
    );
  } else if (layout === "grid") {
    galleryNode = (
      <>
        <style>{`.sg-grid{display:grid;grid-template-columns:1fr;gap:8px}@media(min-width:600px){.sg-grid{grid-template-columns:1fr 1fr}}`}</style>
        <div className="sg-grid">
          {visible.map((photo, i) => (
            <div key={i} style={{ borderRadius, overflow: "hidden", aspectRatio: "4/3", position: "relative" }}>
              <img src={photo} alt="" style={{ ...imgStyle, position: "absolute", inset: 0 }}
                onClick={() => setLightboxIdx(i)}
                onMouseEnter={e => { e.currentTarget.style.filter = "brightness(0.8)"; e.currentTarget.style.transform = "scale(1.03)"; }}
                onMouseLeave={e => { e.currentTarget.style.filter = "brightness(1)"; e.currentTarget.style.transform = "scale(1.0)"; }}
              />
            </div>
          ))}
        </div>
      </>
    );
  } else {
    // featured: big main image + a matched-height column of thumbnails.
    // The aspectRatio lives on the grid container so the row gets one definite
    // height; both columns fill it. (A definite height on the main image alone
    // left the thumbnail column's percentage heights unresolved, so it grew to
    // the images' natural size and broke the layout.)
    const [main, ...rest] = visible;
    galleryNode = (
      <div style={{
        display: "grid",
        gridTemplateColumns: rest.length ? "2fr 1fr" : "1fr",
        gap: 8,
        aspectRatio: rest.length ? "16 / 10" : "4 / 3",
      }}>
        <div style={{ borderRadius, overflow: "hidden" }}>
          <img src={main} alt="" style={imgStyle} onClick={() => setLightboxIdx(0)} onMouseEnter={onEnter} onMouseLeave={onLeave} />
        </div>
        {rest.length > 0 && (
          <div style={{ display: "grid", gridTemplateRows: `repeat(${rest.length}, 1fr)`, gap: 8, minHeight: 0 }}>
            {rest.map((photo, i) => (
              <div key={i} style={{ borderRadius, overflow: "hidden", minHeight: 0 }}>
                <img src={photo} alt="" style={imgStyle} onClick={() => setLightboxIdx(i + 1)} onMouseEnter={onEnter} onMouseLeave={onLeave} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {galleryNode}

      {/* Show more / collapse */}
      {initialCount && photos.length > initialCount && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            marginTop: 12, width: "100%", height: 44, borderRadius: borderRadius,
            border: "1.5px solid #E5E5E5", background: "transparent",
            fontSize: 13, fontWeight: 700, color: "#6B7280",
            cursor: "pointer", transition: "border-color 0.2s, color 0.2s",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.color = "#111"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E5E5"; e.currentTarget.style.color = "#6B7280"; }}
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more photo${hiddenCount !== 1 ? "s" : ""}`}
        </button>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "none", border: "none", color: "#fff",
              fontSize: 32, cursor: "pointer", lineHeight: 1, padding: "4px 10px",
            }}
          >
            ×
          </button>
          <img
            src={photos[lightboxIdx]}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 4 }}
          />
        </div>
      )}
    </>
  );
}
