"use client";

import { imgStyle, focalPos } from "./tileStyles";

export interface UniformGridProps {
  photos: string[];
  cols: number;
  aspect: string;          // e.g. "4 / 3" or "1 / 1"
  gap: number;
  borderRadius: number;
  focal?: Record<string, string>;
  onPhotoClick: (i: number) => void;
}

export function UniformGrid({ photos, cols, aspect, gap, borderRadius, focal, onPhotoClick }: UniformGridProps) {
  const remainder = cols > 1 ? photos.length % cols : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {photos.map((photo, i) => {
        const isLast = i === photos.length - 1;
        // Fill a ragged final row: the last tile widens to close the gap.
        const span = isLast && remainder !== 0 ? cols - remainder + 1 : 1;
        return (
          <div
            key={i}
            style={{
              borderRadius,
              overflow: "hidden",
              aspectRatio: span > 1 ? undefined : aspect,
              gridColumn: span > 1 ? `span ${span}` : undefined,
              position: "relative",
              minHeight: span > 1 ? 0 : undefined,
            }}
          >
            <img
              src={photo}
              alt=""
              style={{ ...imgStyle, objectPosition: focalPos(focal, photo) }}
              onClick={() => onPhotoClick(i)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1.0)"; }}
            />
          </div>
        );
      })}
    </div>
  );
}
