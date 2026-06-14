"use client";

import { CalendarPicker } from "../../components/CalendarPicker";
import type { BusinessHours, Service } from "@/types";

interface Props {
  service: Service;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  businessHours?: BusinessHours;
  accentColor: string;
  darkColor: string;
  bgColor: string;
  stepTitle: string;
  minLabel: string;
  calendarT?: { months: string[]; weekDays: string[] };
}

export function DateStep({ service, selectedDate, onSelect, businessHours, accentColor, darkColor, bgColor, stepTitle, minLabel, calendarT }: Props) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{
        padding:"10px 14px", borderRadius:10,
        background:`${accentColor}14`,
        fontSize:14, fontWeight:600, color:darkColor,
      }}>
        {service.name} · {service.duration} {minLabel} · ₪{service.price}
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:darkColor }}>{stepTitle}</div>
      <CalendarPicker
        selectedDate={selectedDate}
        onSelect={onSelect}
        businessHours={businessHours}
        accentColor={accentColor}
        darkColor={darkColor}
        calendarT={calendarT}
      />
    </div>
  );
}
