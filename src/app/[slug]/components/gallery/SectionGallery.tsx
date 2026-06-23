"use client";

import { useState, useEffect } from "react";
import { UniformGrid } from "./UniformGrid";
import { FeaturedHero } from "./FeaturedHero";
import { Lightbox } from "./Lightbox";

interface Props {
  photos: string[];
  // "grid" = uniform flex-row grid (Clean, Dark). "featured" = hero + grid (Classic).
  layout?: "featured" | "grid";
  borderRadius?: number;
  initialCount?: number;
  desktopInitialCount?: number;
  desktopBreakpoint?: number;
  mobileCols?: number;
  desktopCols?: number;
  focal?: Record<string, string>;
  altLabel?: string;
  ui?: GalleryUi;
}

// "Show more" button colors — defaults suit light themes; Dark overrides.
interface GalleryUi {
  btnBorder: string;
  btnBorderHover: string;
  btnText: string;
  btnTextHover: string;
}

const DEFAULT_UI: GalleryUi = {
  btnBorder: "#E5E5E5",
  btnBorderHover: "#111",
  btnText: "#6B7280",
  btnTextHover: "#111",
};

export function SectionGallery({
  photos,
  layout = "featured",
  borderRadius = 10,
  initialCount,
  desktopInitialCount,
  desktopBreakpoint = 680,
  mobileCols = 2,
  desktopCols = 3,
  focal,
  altLabel,
  ui = DEFAULT_UI,
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

  const cols = isDesktop ? desktopCols : mobileCols;

  let galleryNode: React.ReactNode;

  if (layout === "grid") {
    galleryNode = (
      <UniformGrid
        photos={visible}
        cols={cols}
        rowHeight={isDesktop ? 200 : 150}
        gap={10}
        borderRadius={borderRadius}
        focal={focal}
        altLabel={altLabel}
        onPhotoClick={setLightboxIdx}
      />
    );
  } else {
    // featured (classic): hero + uniform rest grid
    const rest = visible.slice(1);
    galleryNode = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FeaturedHero photo={visible[0]} borderRadius={borderRadius} focal={focal} altLabel={altLabel} onClick={() => setLightboxIdx(0)} />
        {rest.length > 0 && (
          <UniformGrid
            photos={rest}
            cols={cols}
            rowHeight={isDesktop ? 150 : 120}
            gap={10}
            borderRadius={borderRadius}
            focal={focal}
            altLabel={altLabel}
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
            border: `1.5px solid ${ui.btnBorder}`, background: "transparent",
            fontSize: 13, fontWeight: 700, color: ui.btnText,
            cursor: "pointer", transition: "border-color 0.2s, color 0.2s", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = ui.btnBorderHover; e.currentTarget.style.color = ui.btnTextHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = ui.btnBorder; e.currentTarget.style.color = ui.btnText; }}
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
          altLabel={altLabel}
        />
      )}
    </>
  );
}
