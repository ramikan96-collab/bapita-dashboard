import type { BusinessHours, DayKey } from "@/types";

const ORDER: DayKey[] = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

const EN_LABELS: Record<DayKey, string> = {
  sunday:"Sunday", monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday",
  thursday:"Thursday", friday:"Friday", saturday:"Saturday",
};

interface Props {
  hours: BusinessHours;
  darkColor: string;
  accentColor: string;
  mutedColor?: string;
  dayLabels?: Record<DayKey, string>;
  closedLabel?: string;
  /** 24-hour clock (e.g. 20:30) instead of AM/PM. Default false. */
  use24h?: boolean;
}

function fmt(t: string, use24h: boolean) {
  const [h, m] = t.split(":").map(Number);
  if (use24h) return `${h}:${String(m).padStart(2,"0")}`;
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function SectionHours({ hours, darkColor, accentColor, mutedColor, dayLabels, closedLabel = "Closed", use24h = false }: Props) {
  const labels = dayLabels ?? EN_LABELS;
  const todayKey = ORDER[new Date().getDay()];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      {ORDER.map(day => {
        const h = hours[day];
        const today = day === todayKey;
        return (
          <div key={day} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"10px 14px", borderRadius:8,
            background: today ? `${accentColor}18` : "transparent",
          }}>
            <span style={{ fontSize:14, fontWeight: today ? 700 : 400, color: darkColor }}>
              {labels[day]}
            </span>
            <span dir="ltr" style={{ fontSize:13, fontWeight:500, color: h.open ? darkColor : (mutedColor ?? "rgba(0,0,0,0.35)") }}>
              {h.open ? `${fmt(h.start, use24h)} – ${fmt(h.end, use24h)}` : closedLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
