"use client";

import type { Service } from "@/types";

interface SuccessT {
  title: string;
  seeYou: (name: string) => string;
  addToCalendar: string;
}

interface Props {
  service: Service;
  date: string;
  time: string;
  customerName: string;
  businessName: string;
  businessPhone?: string | null;
  businessAddress?: string | null;
  accentColor: string;
  darkColor: string;
  bgColor: string;
  t: SuccessT;
  dateLocale: string;
  minLabel: string;
}

function buildICS(service: Service, date: string, time: string, businessName: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi]   = time.split(":").map(Number);
  const p = (n: number) => String(n).padStart(2, "0");
  const dtStart = `${y}${p(mo)}${p(d)}T${p(h)}${p(mi)}00`;
  const end = new Date(y, mo - 1, d, h, mi + service.duration);
  const dtEnd = `${end.getFullYear()}${p(end.getMonth()+1)}${p(end.getDate())}T${p(end.getHours())}${p(end.getMinutes())}00`;
  return [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Bapita//EN",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,`DTEND:${dtEnd}`,
    `SUMMARY:${service.name} at ${businessName}`,
    "DESCRIPTION:Booked via Bapita",
    "END:VEVENT","END:VCALENDAR",
  ].join("\r\n");
}

export function SuccessScreen({ service, date, time, customerName, businessName, businessPhone, businessAddress, accentColor, darkColor, bgColor, t, dateLocale, minLabel }: Props) {
  const fmtDate = new Date(date + "T00:00:00").toLocaleDateString(dateLocale, {
    weekday:"long", day:"numeric", month:"long",
  });

  function downloadICS() {
    const blob = new Blob([buildICS(service, date, time, businessName)], { type:"text/calendar" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `booking-${date}.ics`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, paddingTop:24, paddingBottom:16 }}>
      <div style={{
        width:72, height:72, borderRadius:"50%",
        background:accentColor, color:"#fff",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:36, fontWeight:700,
      }}>✓</div>

      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:24, fontWeight:900, color:darkColor, marginBottom:8 }}>{t.title}</div>
        <div style={{ fontSize:15, color:darkColor, opacity:0.6 }}>{t.seeYou(customerName)}</div>
      </div>

      <div style={{
        width:"100%", background:bgColor, borderRadius:14,
        padding:"16px 18px", display:"flex", flexDirection:"column", gap:6,
      }}>
        <div style={{ fontSize:16, fontWeight:700, color:darkColor }}>{service.name}</div>
        <div style={{ fontSize:13, color:darkColor, opacity:0.6, display:"flex", flexDirection:"column", gap:3 }}>
          <span>{fmtDate}</span>
          <span>{time} · {service.duration} {minLabel}</span>
          <span>{businessName}</span>
          {businessPhone   && <span>{businessPhone}</span>}
          {businessAddress && <span>{businessAddress}</span>}
        </div>
      </div>

      <button onClick={downloadICS} style={{
        width:"100%", height:48, borderRadius:12,
        border:`2px solid ${accentColor}`,
        background:"transparent", color:accentColor,
        fontSize:15, fontWeight:700, cursor:"pointer",
        fontFamily:"inherit",
      }}>
        {t.addToCalendar}
      </button>
    </div>
  );
}
