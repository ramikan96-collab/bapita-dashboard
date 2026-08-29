"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PagesList } from "../businesses/_components/PagesList";

interface Row { id: string; name: string; slug: string | null; status: string }

/**
 * The Pages tab of the admin board: pick a business, then work on its pages.
 * The per-business screen is the same component the business form links to, so
 * there is one page list, not two.
 */
export function AdminPages() {
  const [businesses, setBusinesses] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await createClient()
        .from("businesses")
        .select("id, name, slug, status")
        .order("name");
      setBusinesses((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 24, color: "var(--color-muted)" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 16px 60px" }}>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{
          height: 44, width: "100%", padding: "0 13px", borderRadius: 11,
          border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)",
          fontSize: 14, color: "var(--color-dark)", fontFamily: "inherit", boxSizing: "border-box",
        }}
      >
        <option value="">Choose a business…</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}{b.status === "draft" ? " (draft)" : ""}
          </option>
        ))}
      </select>

      {selected
        ? <PagesList businessId={selected} embedded />
        : <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 16 }}>
            Pick a business to see and edit its extra pages.
          </p>}
    </div>
  );
}
