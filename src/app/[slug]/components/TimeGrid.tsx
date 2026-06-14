"use client";

interface Props {
  slots: string[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  accentColor: string;
  darkColor: string;
  loading: boolean;
}

export function TimeGrid({ slots, selectedTime, onSelect, accentColor, darkColor, loading }: Props) {
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
              border:`2px solid ${sel ? accentColor : "rgba(0,0,0,0.1)"}`,
              background: sel ? accentColor : "#fff",
              color: sel ? "#fff" : darkColor,
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
