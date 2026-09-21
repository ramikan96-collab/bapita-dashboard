"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Business, Service } from "@/types";
import { PageLink } from "../_shared/PageLink";
import { unitPhotos } from "@/lib/stay";
import { amenityLabels } from "@/lib/amenities";
import type { Translations } from "../translations";

export interface UnitCardTokens {
  /** card background */
  surface: string;
  /** card background on hover */
  raised: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  /** corner radius — themes disagree: dark is near-square, clean is rounded */
  radius: number;
  /** font for the price and the CTA */
  displayFont?: string;
  /** uppercase, letterspaced CTA (dark theme) vs plain (clean/classic) */
  ctaUppercase?: boolean;
}

/** Cards stay scannable: a few amenities up front, the full list on the unit page. */
const MAX_CARD_AMENITIES = 4;

interface Props {
  business: Business;
  units: Service[];
  t: Translations;
  isRtl: boolean;
  tokens: UnitCardTokens;
  onSelect: (unit: Service) => void;
  /** Href of this unit's own page, when the business has one. */
  hrefForUnit?: (unitId: string) => string | null;
}

/**
 * Stay-mode replacement for the services list: one card per rentable unit.
 *
 * A unit card is a product, not a line item — cover photo, nightly rate, what it
 * sleeps. That difference is the whole reason a property owner would use this
 * over a barber booking page, so it gets a photo even when the theme's service
 * list does not.
 */
export function SectionUnits({ business, units, t, isRtl, tokens, onSelect, hrefForUnit }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { surface, raised, border, text, muted, accent, radius } = tokens;
  const displayFont = tokens.displayFont ?? "inherit";

  return (
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
      {units.map((unit) => {
        const photos = unitPhotos(business, unit.id);
        const cover = photos[0] ?? business.hero_image_url ?? null;
        const name = isRtl && unit.name_he ? unit.name_he : unit.name;
        const desc = isRtl && unit.description_he ? unit.description_he : unit.description;
        const amenities = amenityLabels(unit.amenities, isRtl ? "he" : "en");
        const shownAmenities = amenities.slice(0, MAX_CARD_AMENITIES);
        const hiddenAmenities = amenities.length - shownAmenities.length;
        const isHover = hovered === unit.id;
        // A unit with its own page: the photo and the name go to that page, and
        // only the CTA opens booking. Without a page, the photo opens booking too.
        // Never nest the two — one click must do exactly one thing.
        const href = hrefForUnit?.(unit.id) ?? null;

        const coverImage = cover ? (
          <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: raised }}>
            <Image
              src={cover}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              style={{
                objectFit: "cover",
                objectPosition: business.image_focal?.[cover] || "center",
                transform: isHover ? "scale(1.04)" : "scale(1)",
                transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
            {photos.length > 1 && (
              <div style={{
                position: "absolute", bottom: 10, insetInlineEnd: 10,
                background: "rgba(0,0,0,0.55)", color: "#fff",
                fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 20,
                backdropFilter: "blur(4px)",
              }}>
                {t.stay.photos(photos.length)}
              </div>
            )}
          </div>
        ) : null;

        return (
          <div
            key={unit.id}
            onMouseEnter={() => setHovered(unit.id)}
            onMouseLeave={() => setHovered(null)}
            // Keyboard users get the same highlighted state as the mouse.
            onFocus={() => setHovered(unit.id)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(null); }}
            style={{
              display: "flex",
              flexDirection: "column",
              textAlign: isRtl ? "right" : "left",
              background: isHover ? raised : surface,
              border: `1px solid ${isHover ? accent + "55" : border}`,
              borderRadius: radius,
              overflow: "hidden",
              transition: "background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s",
              transform: isHover ? "translateY(-3px)" : "none",
              boxShadow: isHover ? `0 10px 30px ${accent}1F` : "none",
            }}
          >
            {coverImage && (href ? (
              <Link href={href} tabIndex={-1} aria-hidden style={{ display: "block" }}>
                {coverImage}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(unit)}
                aria-label={`${t.stay.check}: ${name}`}
                style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer" }}
              >
                {coverImage}
              </button>
            ))}

            <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: text }}>
                <PageLink href={href} inline>{name}</PageLink>
              </div>

              {desc && (
                <div style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>{desc}</div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: muted }}>
                {unit.max_guests ? <span>{t.stay.sleeps(unit.max_guests)}</span> : null}
                {unit.min_nights && unit.min_nights > 1 ? <span>· {t.stay.minNights(unit.min_nights)}</span> : null}
              </div>

              {shownAmenities.length > 0 && (
                <ul
                  aria-label={t.stay.amenities}
                  style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}
                >
                  {shownAmenities.map((label) => (
                    <li
                      key={label}
                      style={{
                        fontSize: 11, color: text, border: `1px solid ${border}`,
                        borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </li>
                  ))}
                  {hiddenAmenities > 0 && (
                    <li style={{ fontSize: 11, color: muted, padding: "3px 4px", whiteSpace: "nowrap" }}>
                      {t.stay.moreAmenities(hiddenAmenities)}
                    </li>
                  )}
                </ul>
              )}

              <div style={{
                marginTop: "auto", paddingTop: 12,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}>
                <span style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 700, color: accent, whiteSpace: "nowrap" }}>
                  ₪{unit.price}
                  <span style={{ fontSize: 12, fontWeight: 500, color: muted }}> / {t.stay.perNight}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onSelect(unit)}
                  style={{
                    fontFamily: displayFont,
                    background: isHover ? accent : "transparent",
                    color: isHover ? surface : accent,
                    border: `1.5px solid ${accent}`,
                    borderRadius: radius,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    letterSpacing: tokens.ctaUppercase ? "0.06em" : undefined,
                    textTransform: tokens.ctaUppercase ? "uppercase" : undefined,
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  {t.stay.check}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
