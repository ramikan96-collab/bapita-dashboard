"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DisconnectButton({ businessId, staffId }: { businessId: string; staffId: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await fetch("/api/admin/calendar/google/disconnect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ businessId, staffId }),
            });
            if (!res.ok) { setError("failed"); return; }
            router.refresh();
          });
        }}
        style={{
          fontSize: 13, fontWeight: 600, color: "#B91C1C", background: "#FEE2E2",
          border: "none", borderRadius: 8, padding: "6px 12px", cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Disconnecting…" : "Disconnect"}
      </button>
      {error && <span style={{ fontSize: 12, color: "#B91C1C" }}>failed — try again</span>}
    </div>
  );
}
