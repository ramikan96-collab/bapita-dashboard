"use client";

import type { StaffMember } from "@/types";

interface Props {
  staff: StaffMember[];
  onSelect: (staffId: string | null) => void;
  accentColor: string;
  darkColor: string;
  bgColor: string;
  stepTitle: string;
  anyLabel: string;
}

export function StaffStep({ staff, onSelect, accentColor, darkColor, bgColor, stepTitle, anyLabel }: Props) {
  const isDark    = /^#[01]/.test(bgColor);
  const cardBg    = isDark ? "rgba(255,255,255,0.07)" : "#fff";
  const borderClr = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";

  const cardStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: `1.5px solid ${borderClr}`, background: cardBg, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 12,
    textAlign: "start", transition: "border-color 0.15s ease", fontFamily: "inherit",
  };
  const hoverOn  = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = accentColor; };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = borderClr; };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: darkColor }}>{stepTitle}</div>

      {/* Any available */}
      <button onClick={() => onSelect(null)} style={cardStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        <span style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
          fontSize: 18, color: darkColor,
        }}>✨</span>
        <div style={{ fontSize: 15, fontWeight: 700, color: darkColor }}>{anyLabel}</div>
      </button>

      {staff.map(m => (
        <button key={m.id} onClick={() => onSelect(m.id)} style={cardStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          {m.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.photo_url} alt={m.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <span style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: m.color || accentColor, color: "#fff", fontSize: 16, fontWeight: 800,
            }}>{m.name.trim().charAt(0).toUpperCase() || "?"}</span>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: m.color || accentColor }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: darkColor }}>{m.name}</span>
            </div>
            {m.role ? <span style={{ fontSize: 13, color: darkColor, opacity: 0.5 }}>{m.role}</span> : null}
          </div>
        </button>
      ))}
    </div>
  );
}
