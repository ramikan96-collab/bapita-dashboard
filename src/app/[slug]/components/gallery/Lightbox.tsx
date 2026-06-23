"use client";

import { useEffect, useRef } from "react";

export interface LightboxProps {
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

export function Lightbox({ photos, index, onIndexChange, onClose }: LightboxProps) {
  const touchX = useRef<number | null>(null);
  const swiped = useRef<boolean>(false);

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < photos.length) onIndexChange(next);
  };

  const handleBackdropClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length]);

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    [side]: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.4)",
    border: "none",
    color: "#fff",
    fontSize: 28,
    lineHeight: 1,
    width: 48,
    height: 48,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const atStart = index === 0;
  const atEnd = index === photos.length - 1;

  return (
    <div
      onClick={handleBackdropClick}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) {
          swiped.current = true;
          go(dx < 0 ? 1 : -1);
        }
        touchX.current = null;
      }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 999,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#fff", fontSize: 32, cursor: "pointer", lineHeight: 1, padding: "4px 10px" }}>×</button>

      <div style={{ position: "absolute", top: 24, left: 24, color: "#fff", fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>
        {index + 1} / {photos.length}
      </div>

      {!atStart && (
        <button aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }} style={arrowStyle("left")}>‹</button>
      )}
      {!atEnd && (
        <button aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }} style={arrowStyle("right")}>›</button>
      )}

      <img
        src={photos[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 4 }}
      />
    </div>
  );
}
