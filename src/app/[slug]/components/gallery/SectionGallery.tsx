"use client";

import { useState, useEffect } from "react";
import { UniformGrid } from "./UniformGrid";
import { FeaturedHero } from "./FeaturedHero";
import { JustifiedRows } from "./JustifiedRows";
import { Lightbox } from "./Lightbox";

interface Props {
  photos: string[];
  layout?: "featured" | "masonry" | "grid";
  borderRadius?: number;
  initialCount?: number;
  desktopInitialCount?: number;
  desktopBreakpoint?: number;
  focal?: Record<string, string>;
}

export function SectionGallery({
  photos,
  layout = "featured",
  borderRadius = 10,
  initialCount,
  desktopInitialCount,
  desktopBreakpoint = 680,
  focal,
}: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= desktopBreakpoint);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, [desktopBreakpoint]);

  if (!photos.length) return null;

  const effectiveCount = (desktopInitialCount && isDesktop) ? desktopInitialCount : initialCount;
  const limit = (effectiveCount && !expanded) ? effectiveCount : photos.length;
  const visible = photos.slice(0, limit);
  const hiddenCount = photos.length - limit;

  // Column counts per engine + breakpoint.
  const gridCols = isDesktop ? 2 : 1;          // dark "grid"
  const restCols = isDesktop ? 3 : 2;          // classic featured rest

  let galleryNode: React.ReactNode;

  if (layout === "masonry") {
    galleryNode = (
      <JustifiedRows
        photos={visible}
        gap={12}
        borderRadius={borderRadius}
        targetHeight={isDesktop ? 200 : 160}
        focal={focal}
        onPhotoClick={setLightboxIdx}
      />
    );
  } else if (layout === "grid") {
    galleryNode = (
      <UniformGrid
        photos={visible}
        cols={gridCols}
        aspect="4 / 3"
        gap={8}
        borderRadius={borderRadius}
        focal={focal}
        onPhotoClick={setLightboxIdx}
      />
    );
  } else {
    // featured (classic): hero + uniform rest grid
    const rest = visible.slice(1);
    galleryNode = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FeaturedHero photo={visible[0]} borderRadius={borderRadius} focal={focal} onClick={() => setLightboxIdx(0)} />
        {rest.length > 0 && (
          <UniformGrid
            photos={rest}
            cols={restCols}
            aspect="4 / 3"
            gap={10}
            borderRadius={borderRadius}
            focal={focal}
            onPhotoClick={(i) => setLightboxIdx(i + 1)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {galleryNode}

      {effectiveCount && photos.length > effectiveCount && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 12, width: "100%", height: 44, borderRadius,
            border: "1.5px solid #E5E5E5", background: "transparent",
            fontSize: 13, fontWeight: 700, color: "#6B7280",
            cursor: "pointer", transition: "border-color 0.2s, color 0.2s", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.color = "#111"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; e.currentTarget.style.color = "#6B7280"; }}
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more photo${hiddenCount !== 1 ? "s" : ""}`}
        </button>
      )}

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIdx}
          onIndexChange={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}
