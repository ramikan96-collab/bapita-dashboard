interface Props {
  serviceName: string;
  duration: number;
  price: number;
  date: string;
  time: string;
  accentColor: string;
  darkColor: string;
  bgColor: string;
}

function fmtDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long",
  });
}

export function BookingSummaryCard({ serviceName, duration, price, date, time, accentColor, darkColor, bgColor }: Props) {
  return (
    <div style={{
      background: bgColor, borderRadius:12, padding:"14px 16px",
      border:`1.5px solid ${accentColor}33`,
    }}>
      <div style={{ fontWeight:700, fontSize:15, color:darkColor, marginBottom:6 }}>{serviceName}</div>
      <div style={{ fontSize:13, color:darkColor, opacity:0.6, display:"flex", gap:8, flexWrap:"wrap" }}>
        <span>{fmtDate(date)}</span>
        <span>·</span>
        <span>{time}</span>
        <span>·</span>
        <span>{duration} min</span>
        <span>·</span>
        <span>₪{price}</span>
      </div>
    </div>
  );
}
