"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const MODES = [
  { value: "both", label: "Pull + push" },
  { value: "pull", label: "Pull only" },
  { value: "push", label: "Push only" },
];

export default function SyncModeSelect({
  businessId,
  staffId,
  syncMode,
}: {
  businessId: string;
  staffId: string | null;
  syncMode: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select
        defaultValue={syncMode}
        disabled={pending}
        onChange={(e) => {
          setError(null);
          const value = e.target.value;
          startTransition(async () => {
            const res = await fetch("/api/admin/calendar/google/sync-mode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ businessId, staffId, syncMode: value }),
            });
            if (!res.ok) { setError("failed"); return; }
            router.refresh();
          });
        }}
        style={{ fontSize: 12, border: "1px solid #E5DDD0", borderRadius: 8, padding: "4px 6px" }}
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      {error && <span style={{ fontSize: 12, color: "#B91C1C" }}>failed</span>}
    </div>
  );
}
