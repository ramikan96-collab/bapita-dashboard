"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

/**
 * Sales demo sites — pitch pages built from a prospect's Google listing.
 *
 * They are excluded from analytics and from customer counts, and they cannot send email. They
 * are NOT hidden from Rami: this tab is the one place they are all visible, with how long each
 * has left before the nightly sweep deletes it.
 *
 * Data comes from /api/admin/demos (service-role), never from the browser client — the columns
 * involved are deliberately outside the anon grant allowlist.
 */

type Demo = {
  id: string;
  name: string | null;
  slug: string | null;
  phone: string | null;
  status: string | null;
  lead_source: string | null;
  demo_expires_at: string | null;
  created_at: string | null;
  site_url: string | null;
  expired: boolean;
  days_left: number | null;
};

export function AdminDemos() {
  const { showToast } = useToast();
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/demos");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load demos");
      setDemos(json.demos ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load demos", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function convert(id: string, name: string | null) {
    setConverting(id);
    try {
      const res = await fetch("/api/admin/demos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Convert failed");
      showToast(`${name ?? "Demo"} is now a real customer — it will not be swept`, "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Convert failed", "error");
    } finally {
      setConverting(null);
    }
  }

  if (loading) {
    return <div style={{ padding: "20px 24px", color: "var(--color-muted)" }}>Loading demos…</div>;
  }

  if (demos.length === 0) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 64px", color: "var(--color-muted)" }}>
        No demo sites right now. Bertan creates them per lead; each one lives 30 days unless it
        is converted.
      </div>
    );
  }

  const expiring = demos.filter((d) => !d.expired && (d.days_left ?? 99) <= 3).length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 64px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 4 }}>
        {demos.length} demo{demos.length === 1 ? "" : "s"}
        {expiring > 0 ? ` · ${expiring} expiring within 3 days` : ""}
        {" · excluded from analytics and counts · outbound email blocked"}
      </div>

      {demos.map((d) => (
        <div
          key={d.id}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            background: "var(--color-surface, #fff)", borderRadius: 12,
            border: `1px solid ${d.expired ? "#E5534B" : "var(--color-border, #E9E2D6)"}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {d.name ?? "(no name)"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
              {d.site_url ? (
                <a href={d.site_url} target="_blank" rel="noreferrer" style={{ color: "var(--color-amber)" }}>
                  /{d.slug}
                </a>
              ) : "no slug"}
              {d.phone ? ` · ${d.phone}` : ""}
              {` · ${d.status ?? "?"}`}
            </div>
          </div>

          <div style={{ fontSize: 12, textAlign: "right", color: d.expired ? "#E5534B" : "var(--color-muted)", whiteSpace: "nowrap" }}>
            {d.expired
              ? "expired — next sweep"
              : `${d.days_left} day${d.days_left === 1 ? "" : "s"} left`}
          </div>

          <button
            onClick={() => convert(d.id, d.name)}
            disabled={converting === d.id}
            style={{
              padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              border: "1px solid var(--color-amber)", background: "transparent",
              color: "var(--color-amber)", whiteSpace: "nowrap",
            }}
            title="Clear the expiry clock. The site stays, stops being a demo, and starts counting in analytics."
          >
            {converting === d.id ? "…" : "Convert"}
          </button>
        </div>
      ))}
    </div>
  );
}
