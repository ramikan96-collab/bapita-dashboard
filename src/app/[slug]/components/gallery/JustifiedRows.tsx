"use client";

import { useCallback, useRef, useState } from "react";
import { packRows } from "./justify";
import { useImageRatios } from "./useImageRatios";
import { imgStyle, focalPos } from "./tileStyles";

export interface JustifiedRowsProps {
  photos: string[];
  gap: number;
  borderRadius: number;
  targetHeight: number;
  focal?: Record<string, string>;
  altLabel?: string;
  onPhotoClick: (i: number) => void;
}

export function JustifiedRows({ photos, gap, borderRadius, targetHeight, focal, altLabel, onPhotoClick }: JustifiedRowsProps) {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);
  const ratios = useImageRatios(photos);

  const setNode = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (node) {
      const update = () => setWidth(node.clientWidth);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(node);
      observerRef.current = ro;
    }
  }, []);

  const allMeasured = photos.every((p) => ratios[p]);
  const ready = width > 0 && allMeasured;

  // Skeleton until measured: one full-width block at target height.
  if (!ready) {
    return (
      <div ref={setNode}>
        <div style={{ display: "flex", gap, flexWrap: "wrap" }}>
          {photos.slice(0, 6).map((_, i) => (
            <div key={i} style={{ flex: "1 1 30%", height: targetHeight, borderRadius, background: "#eee", animation: "sgPulse 1.4s ease-in-out infinite" }} />
          ))}
        </div>
        <style>{`@keyframes sgPulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  const rows = packRows(photos.map((p) => ratios[p]), width, targetHeight, gap);

  return (
    <div ref={setNode} style={{ display: "flex", flexDirection: "column", gap }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap }}>
          {row.indices.map((idx) => (
            <div
              key={idx}
              style={{ width: row.height * ratios[photos[idx]], height: row.height, borderRadius, overflow: "hidden", position: "relative", flex: "0 0 auto" }}
            >
              <img
                src={photos[idx]}
                alt={`${altLabel ?? "Gallery"} — photo ${idx + 1}`}
                style={{ ...imgStyle, objectPosition: focalPos(focal, photos[idx]) }}
                onClick={() => onPhotoClick(idx)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1.0)"; }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
