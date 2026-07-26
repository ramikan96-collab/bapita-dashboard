"use client";

import { useState } from "react";

const MODES = [
  { value: "both", label: "Pull + push" },
  { value: "pull", label: "Pull only (hide busy slots)" },
  { value: "push", label: "Push only (write bookings)" },
];

export default function ConnectButton({ businessId, staffId }: { businessId: string; staffId: string | null }) {
  const [mode, setMode] = useState("both");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        style={{ fontSize: 12, border: "1px solid #E5DDD0", borderRadius: 8, padding: "5px 6px" }}
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <a
        href={`/api/admin/calendar/google/connect?businessId=${businessId}${staffId ? `&staffId=${staffId}` : ""}&syncMode=${mode}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 13, fontWeight: 600, color: "var(--color-surface)", background: "var(--color-amber)", borderRadius: 8, padding: "6px 12px", textDecoration: "none" }}
      >
        Connect
      </a>
    </div>
  );
}
