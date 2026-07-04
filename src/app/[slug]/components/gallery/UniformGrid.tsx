"use client";

import { imgStyle, focalPos } from "./tileStyles";

export interface UniformGridProps {
  photos: string[];
  cols: number;
  rowHeight: number;       // fixed px height per row tile
  gap: number;
  borderRadius: number;
  focal?: Record<string, string>;
  altLabel?: string;
  onPhotoClick: (i: number) => void;
}

export function UniformGrid({ photos, cols, rowHeight, gap, borderRadius, focal, altLabel, onPhotoClick }: UniformGridProps) {
  // Chunk into rows of `cols`. Each row is a flexbox with `flex: 1 1 0`
  // tiles, so a ragged final row stretches its tiles to fill the full
  // width at the same height — no leftover gaps, no collapsed tiles.
  const rows: string[][] = [];
  for (let i = 0; i < photos.length; i += cols) rows.push(photos.slice(i, i + cols));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap }}>
          {row.map((photo, ci) => {
            const idx = ri * cols + ci;
            return (
              <div
                key={idx}
                style={{ flex: "1 1 0", minWidth: 0, height: rowHeight, borderRadius, overflow: "hidden", position: "relative" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={`${altLabel ?? "Gallery"} — photo ${idx + 1}`}
                  style={{ ...imgStyle, objectPosition: focalPos(focal, photo) }}
                  onClick={() => onPhotoClick(idx)}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1.0)"; }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
