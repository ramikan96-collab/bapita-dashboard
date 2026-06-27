"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { GoogleReview } from "@/types";

function Stars({ rating, color }: { rating: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= rating ? "#F59E0B" : color} opacity={i <= rating ? 1 : 0.25}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

interface Props {
  reviews: GoogleReview[];
  accentColor: string;
  darkColor: string;
  bgColor: string;
  borderColor: string;
  reviewLink?: string | null;
  leaveReviewLabel: string;
  showMoreLabel?: string;
  showLessLabel?: string;
}

const INITIAL_COUNT = 3;

function toggleBtnStyle(accentColor: string): CSSProperties {
  return {
    flex: 1, height: 40, borderRadius: 10,
    border: `1.5px solid ${accentColor}33`,
    background: "transparent", color: accentColor,
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
  };
}

export function SectionReviews({ reviews, accentColor, darkColor, bgColor, borderColor, reviewLink, leaveReviewLabel, showMoreLabel = "Show more", showLessLabel = "Show less" }: Props) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  if (!reviews.length && !reviewLink) return null;

  const visible = reviews.slice(0, visibleCount);
  const remaining = reviews.length - visibleCount;
  const expanded = visibleCount > INITIAL_COUNT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {visible.map((r, i) => (
        <div
          key={r.id}
          style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: accentColor + "22",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: accentColor, flexShrink: 0,
              }}>
                {r.author.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: darkColor, lineHeight: 1.2 }}>{r.author}</div>
                {r.date && <div style={{ fontSize: 11, color: darkColor, opacity: 0.45, marginTop: 1 }}>{r.date}</div>}
              </div>
            </div>
            <Stars rating={r.rating} color={darkColor} />
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: darkColor, opacity: 0.78, margin: 0 }}>{r.text}</p>
        </div>
      ))}

      {(remaining > 0 || expanded) && (
        <div style={{ display: "flex", gap: 10 }}>
          {remaining > 0 && (
            <button
              onClick={() => setVisibleCount(c => c + INITIAL_COUNT)}
              style={toggleBtnStyle(accentColor)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accentColor + "12"; (e.currentTarget as HTMLElement).style.borderColor = accentColor; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = accentColor + "33"; }}
            >
              {showMoreLabel}
            </button>
          )}
          {expanded && (
            <button
              onClick={() => setVisibleCount(INITIAL_COUNT)}
              style={toggleBtnStyle(accentColor)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accentColor + "12"; (e.currentTarget as HTMLElement).style.borderColor = accentColor; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = accentColor + "33"; }}
            >
              {showLessLabel}
            </button>
          )}
        </div>
      )}

      {reviewLink && (
        <a
          href={reviewLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            height: 44, borderRadius: 11,
            border: `1.5px solid ${accentColor}44`,
            color: accentColor, textDecoration: "none",
            fontSize: 13, fontWeight: 700,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accentColor + "12"; (e.currentTarget as HTMLElement).style.borderColor = accentColor; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = accentColor + "44"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {leaveReviewLabel}
        </a>
      )}
    </div>
  );
}
