"use client";

import { useState } from "react";
import type { BusinessHours } from "@/types";
import { en } from "../translations/en";

const DAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;

interface Props {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  businessHours?: BusinessHours;
  accentColor: string;
  darkColor: string;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export function CalendarPicker({ selectedDate, onSelect, businessHours, accentColor, darkColor }: Props) {
  const todayMs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function isOpen(d: Date) {
    if (!businessHours) return true;
    const key = DAY_KEYS[d.getDay()];
    return businessHours[key]?.open ?? false;
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const days = getDays(year, month);
  const monthLabel = `${en.calendar.months[month]} ${year}`;

  const btnBase: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8,
    border: "none", cursor: "pointer",
    background: "rgba(0,0,0,0.06)",
    fontSize: 18, color: darkColor,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <button style={btnBase} onClick={prevMonth}>‹</button>
        <span style={{ fontSize:15, fontWeight:700, color:darkColor }}>{monthLabel}</span>
        <button style={btnBase} onClick={nextMonth}>›</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:6 }}>
        {en.calendar.weekDays.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"rgba(0,0,0,0.3)", paddingBottom:4 }}>{d}</div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {days.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const str      = toDateStr(date);
          const past     = date.getTime() < todayMs;
          const open     = isOpen(date);
          const disabled = past || !open;
          const selected = str === selectedDate;
          return (
            <button
              key={str}
              disabled={disabled}
              onClick={() => !disabled && onSelect(str)}
              style={{
                height:40, borderRadius:8,
                border: `2px solid ${selected ? accentColor : "transparent"}`,
                background: selected ? accentColor
                  : open && !past ? "rgba(0,0,0,0.04)" : "transparent",
                color: selected ? "#fff" : disabled ? "rgba(0,0,0,0.2)" : darkColor,
                fontSize:14, fontWeight: selected ? 700 : 400,
                cursor: disabled ? "default" : "pointer",
                transition:"all 0.15s ease",
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
