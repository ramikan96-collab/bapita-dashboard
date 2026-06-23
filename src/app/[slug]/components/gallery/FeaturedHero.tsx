"use client";

import { imgStyle, focalPos } from "./tileStyles";

export interface FeaturedHeroProps {
  photo: string;
  borderRadius: number;
  focal?: Record<string, string>;
  onClick: () => void;
}

export function FeaturedHero({ photo, borderRadius, focal, onClick }: FeaturedHeroProps) {
  return (
    <div style={{ borderRadius, overflow: "hidden", aspectRatio: "16 / 9", position: "relative" }}>
      <img
        src={photo}
        alt=""
        style={{ ...imgStyle, objectPosition: focalPos(focal, photo) }}
        onClick={onClick}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1.0)"; }}
      />
    </div>
  );
}
