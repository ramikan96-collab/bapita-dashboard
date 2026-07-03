"use client";

import type { StaffMember } from "@/types";

interface Props {
  ownerName: string;
  calendarFilter: string[];
  setCalendarFilter: (ids: string[]) => void;
  staff: StaffMember[];
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${checked ? "var(--color-amber)" : "var(--color-cream-2)"}`,
        background: checked ? "var(--color-amber)" : "transparent",
        transition: "all 0.12s",
      }}
    >
      {checked && (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

export default function CalendarSelectorPanel({
  ownerName,
  calendarFilter,
  setCalendarFilter,
  staff,
}: Props) {
  const allChecked = calendarFilter.length === 0;
  const ownerChecked = allChecked || calendarFilter.includes("owner");

  const rowStyle: React.CSSProperties = {
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    padding: "7px 8px", borderRadius: 8, fontSize: 13, textAlign: "left",
    background: "transparent", border: "none", cursor: "pointer",
    transition: "background 0.12s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <button
        onClick={() => setCalendarFilter([])}
        style={{ ...rowStyle, color: allChecked ? "var(--color-amber)" : "var(--color-dark)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <Checkbox checked={allChecked} />
        All calendars
      </button>
      <button
        onClick={() => setCalendarFilter([])}
        style={{ ...rowStyle, color: ownerChecked ? "var(--color-amber)" : "var(--color-dark)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <Checkbox checked={ownerChecked} />
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: "var(--color-amber)" }}
        />
        {ownerName}
      </button>
      {staff.map((s) => {
        const on = calendarFilter.includes(s.id);
        return (
          <button key={s.id}
            onClick={() => setCalendarFilter(on ? calendarFilter.filter(id => id !== s.id) : [...calendarFilter.filter(id => id !== "owner"), s.id])}
            style={{ ...rowStyle, color: on ? "var(--color-amber)" : "var(--color-dark)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <Checkbox checked={on} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: s.color || "var(--color-amber)" }} />
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
