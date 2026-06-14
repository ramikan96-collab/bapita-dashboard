"use client";

import { useState, useEffect } from "react";

interface Props {
  photos: string[];
  layout?: "featured" | "masonry" | "grid";
  borderRadius?: number;
}

export function SectionGallery({ photos, layout = "featured", borderRadius = 10 }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

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
    const col1 = photos.filter((_, i) => i % 2 === 0);
    const col2 = photos.filter((_, i) => i % 2 === 1);
    const h1 = [220, 160, 220, 160, 220];
    const h2 = [160, 220, 160, 220, 160];
    galleryNode = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {col1.map((photo, i) => {
            const idx = i * 2;
            return (
              <div key={i} style={{ height: h1[i % h1.length], borderRadius, overflow: "hidden" }}>
                <img src={photo} alt="" style={imgStyle} onClick={() => setLightboxIdx(idx)} onMouseEnter={onEnter} onMouseLeave={onLeave} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {col2.map((photo, i) => {
            const idx = i * 2 + 1;
            return (
              <div key={i} style={{ height: h2[i % h2.length], borderRadius, overflow: "hidden" }}>
                <img src={photo} alt="" style={imgStyle} onClick={() => setLightboxIdx(idx)} onMouseEnter={onEnter} onMouseLeave={onLeave} />
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (layout === "grid") {
    galleryNode = (
      <>
        <style>{`.sg-grid{display:grid;grid-template-columns:1fr;gap:8px}@media(min-width:600px){.sg-grid{grid-template-columns:1fr 1fr}}`}</style>
        <div className="sg-grid">
          {photos.map((photo, i) => (
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
    // featured: 2fr main + 1fr stack
    const [main, ...rest] = photos;
    galleryNode = (
      <div style={{ display: "grid", gridTemplateColumns: rest.length ? "2fr 1fr" : "1fr", gap: 8 }}>
        <div style={{ borderRadius, overflow: "hidden", aspectRatio: "4/3" }}>
          <img src={main} alt="" style={imgStyle} onClick={() => setLightboxIdx(0)} onMouseEnter={onEnter} onMouseLeave={onLeave} />
        </div>
        {rest.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rest.map((photo, i) => (
              <div key={i} style={{ borderRadius, overflow: "hidden", flex: 1, minHeight: 80 }}>
                <img src={photo} alt="" style={{ ...imgStyle, height: "100%" }} onClick={() => setLightboxIdx(i + 1)} onMouseEnter={onEnter} onMouseLeave={onLeave} />
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
              position: "absolute", top: 20, insetInlineEnd: 20,
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
