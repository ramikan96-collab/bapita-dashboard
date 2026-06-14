"use client";

import { TimeGrid } from "../../components/TimeGrid";
import type { Service } from "@/types";

interface Props {
  service: Service;
  date: string;
  slots: string[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  loading: boolean;
  accentColor: string;
  darkColor: string;
}

export function TimeStep({ service, date, slots, selectedTime, onSelect, loading, accentColor, darkColor }: Props) {
  const fmtDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday:"long", day:"numeric", month:"long",
  });
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{
        padding:"10px 14px", borderRadius:10,
        background:`${accentColor}14`,
        fontSize:14, fontWeight:600, color:darkColor,
      }}>
        {service.name} · {fmtDate}
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:darkColor }}>Choose a time</div>
      <TimeGrid
        slots={slots} selectedTime={selectedTime} onSelect={onSelect}
        accentColor={accentColor} darkColor={darkColor} loading={loading}
      />
    </div>
  );
}
