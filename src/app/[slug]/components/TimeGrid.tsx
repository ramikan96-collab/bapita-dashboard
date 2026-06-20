"use client";

interface Props {
  slots: string[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  accentColor: string;
  darkColor: string;
  bgColor?: string;
  loading: boolean;
}

export function TimeGrid({ slots, selectedTime, onSelect, accentColor, darkColor, bgColor, loading }: Props) {
  const isDark = /^#[01]/.test(bgColor ?? "");
  if (loading) {
    return (
      <div style={{ display:"flex", justifyContent:"center", padding:"32px 0" }}>
        <div style={{
          width:24, height:24, borderRadius:"50%",
          border:`2px solid ${accentColor}`, borderTopColor:"transparent",
          animation:"spin 0.7s linear infinite",
        }} />
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div style={{ textAlign:"center", padding:"32px 0", fontSize:14, color:darkColor, opacity:0.45 }}>
        No available times
      </div>
    );
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
      {slots.map(slot => {
        const sel = slot === selectedTime;
        return (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            style={{
              padding:"12px 0", borderRadius:10,
              border:`2px solid ${sel ? accentColor : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
              background: sel ? accentColor : isDark ? "rgba(255,255,255,0.07)" : "#fff",
              color: sel ? (isDark ? "#111" : "#fff") : darkColor,
              fontSize:14, fontWeight:700,
              cursor:"pointer", transition:"all 0.15s ease",
            }}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}
