"use client";

import { SectionGallery } from "./SectionGallery";
import type { PhotoGroup } from "@/lib/stay";

interface Props {
  groups: PhotoGroup[];
  borderRadius?: number;
  initialCount?: number;
  desktopInitialCount?: number;
  focal?: Record<string, string>;
  altLabel?: string;
  /** Colour + font tokens from the active theme. */
  headingColor: string;
  mutedColor: string;
  headingFont?: string;
  ui?: {
    btnBorder: string;
    btnBorderHover: string;
    btnText: string;
    btnTextHover: string;
  };
}

/**
 * The gallery section, split into one block per unit.
 *
 * Each block is an independent SectionGallery, so the existing lightbox,
 * "show more" behaviour and focal-point handling all carry over unchanged —
 * this only adds the headings and the split. The trailing untitled group holds
 * photos not assigned to any unit.
 *
 * A heading is only worth rendering when there is something to distinguish it
 * from: with a single group this degrades to a plain gallery on purpose.
 */
export function SectionGalleryGrouped({
  groups, borderRadius, initialCount, desktopInitialCount,
  focal, altLabel, headingColor, mutedColor, headingFont, ui,
}: Props) {
  const showHeadings = groups.length > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      {groups.map((group, i) => (
        <div key={group.unitId ?? `ungrouped-${i}`}>
          {showHeadings && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={{
                fontFamily: headingFont ?? "inherit",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.01em",
                color: headingColor,
              }}>
                {group.title ?? ""}
              </span>
              <span style={{ fontSize: 12, color: mutedColor }}>
                {group.photos.length}
              </span>
            </div>
          )}
          <SectionGallery
            photos={group.photos}
            borderRadius={borderRadius}
            initialCount={initialCount}
            desktopInitialCount={desktopInitialCount}
            focal={focal}
            altLabel={group.title ? `${altLabel ?? ""} ${group.title}`.trim() : altLabel}
            ui={ui}
          />
        </div>
      ))}
    </div>
  );
}
