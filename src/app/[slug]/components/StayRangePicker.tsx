"use client";

import { useState } from "react";
import { en } from "../translations/en";
import { addDaysIso, nightsBetween, todayIso } from "@/lib/stay";

interface Props {
  checkIn: string | null;
  checkOut: string | null;
  /** Nights that cannot be occupied, "yyyy-MM-dd". */
  unavailable: Set<string>;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  accentColor: string;
  darkColor: string;
  bgColor?: string;
  calendarT?: { months: string[]; weekDays: string[] };
  nightsLabel?: (n: number) => string;
  loading?: boolean;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

/**
 * Two-tap date-range picker for stays.
 *
 * First tap sets check-in, second sets check-out. A tap on or before the current
 * check-in restarts the range rather than erroring — the forgiving behavior every
 * booking site has trained guests to expect.
 *
 * A calendar day is rendered unavailable when that NIGHT is occupied. Checkout
 * day is therefore still selectable as the next guest's check-in: the checkout
 * date is exclusive everywhere in this codebase (see lib/stay.ts).
 */
export function StayRangePicker({
  checkIn, checkOut, unavailable, onChange,
  accentColor, darkColor, bgColor, calendarT, nightsLabel, loading,
}: Props) {
  const cal = calendarT ?? en.calendar;
  const isDark = /^#[01]/.test(bgColor ?? "");
  const today = todayIso();
  // The two date steps are sibling branches, so this component remounts between
  // them. Anchoring the visible month on checkIn is what stops the check-out
  // calendar from opening on today's month after a check-in months away.
  const anchor = new Date(`${checkIn ?? today}T12:00:00`);
  const [year, setYear] = useState(anchor.getFullYear());
  const [month, setMonth] = useState(anchor.getMonth());
  const [syncedTo, setSyncedTo] = useState(checkIn);
  const [hover, setHover] = useState<string | null>(null);

  // Follow a check-in that changed under us (restarting the range). Selecting
  // from the visible month is a no-op re-render; only a jump actually moves it.
  if (checkIn !== syncedTo) {
    setSyncedTo(checkIn);
    if (checkIn) {
      const d = new Date(`${checkIn}T12:00:00`);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }

  /**
   * A candidate range is only valid if every night in it is free. Without this
   * a guest could span a booked week by picking dates either side of it.
   */
  function rangeIsClean(start: string, end: string): boolean {
    for (let d = start; d < end; d = addDaysIso(d, 1)) {
      if (unavailable.has(d)) return false;
    }
    return true;
  }

  function pick(day: string) {
    // No range yet, or restarting: this becomes the new check-in.
    if (!checkIn || checkOut || day <= checkIn) {
      onChange(day, null);
      return;
    }
    // Second tap: accept only if nothing in between is taken.
    if (!rangeIsClean(checkIn, day)) {
      onChange(day, null);
      return;
    }
    onChange(checkIn, day);
  }

  // Preview range follows the pointer while only check-in is set.
  const previewEnd = !checkOut && hover && checkIn && hover > checkIn && rangeIsClean(checkIn, hover) ? hover : null;
  const rangeEnd = checkOut ?? previewEnd;

  const days = getDays(year, month);
  const monthLabel = `${cal.months[month]} ${year}`;

  const navBtn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
    background: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)",
    fontSize: 18, color: darkColor,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  // Counts the previewed range as well as a settled one — on the check-out step
  // the range is committed the instant it is valid, so a confirmed range is never
  // on screen long enough to read.
  const nights = checkIn && rangeEnd ? nightsBetween(checkIn, rangeEnd) : 0;

  return (
    <div style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button type="button" style={navBtn} onClick={prevMonth} aria-label="Previous month">‹</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: darkColor }} aria-live="polite">{monthLabel}</span>
        <button type="button" style={navBtn} onClick={nextMonth} aria-label="Next month">›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
        {cal.weekDays.map((d) => (
          <div key={d} style={{
            textAlign: "center", fontSize: 11, fontWeight: 700,
            color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)", paddingBottom: 4,
          }}>{d}</div>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}
        onMouseLeave={() => setHover(null)}
      >
        {days.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const str = toDateStr(date);
          const past = str < today;
          // A day is blocked as a start when its own night is taken. It stays
          // selectable as a checkout day, which is why checkout is checked
          // separately in rangeIsClean rather than here.
          const taken = unavailable.has(str);
          const isStart = str === checkIn;
          const isEnd = str === rangeEnd;
          const inRange = !!(checkIn && rangeEnd && str > checkIn && str < rangeEnd);
          const disabled = past || (taken && !isEnd);
          const selected = isStart || isEnd;

          return (
            <button
              key={str}
              type="button"
              disabled={disabled || loading}
              onClick={() => !disabled && pick(str)}
              onMouseEnter={() => setHover(str)}
              aria-pressed={selected}
              aria-label={`${date.toDateString()}${taken ? " (unavailable)" : ""}`}
              style={{
                height: 40,
                borderRadius: isStart && isEnd ? 8 : isStart ? "8px 0 0 8px" : isEnd ? "0 8px 8px 0" : inRange ? 0 : 8,
                border: "none",
                background: selected
                  ? accentColor
                  : inRange
                    ? `${accentColor}33`
                    : disabled
                      ? "transparent"
                      : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                color: selected ? "#fff" : disabled ? (isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)") : darkColor,
                fontSize: 14,
                fontWeight: selected ? 700 : 400,
                // Struck through so an unavailable night reads as "taken", not "not a day".
                textDecoration: taken && !past && !isEnd ? "line-through" : "none",
                cursor: disabled ? "default" : "pointer",
                transition: "background 0.12s ease, color 0.12s ease",
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {nights > 0 && (
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: darkColor, opacity: 0.6 }}>
          {nightsLabel ? nightsLabel(nights) : nights === 1 ? "1 night" : `${nights} nights`}
        </div>
      )}
    </div>
  );
}
