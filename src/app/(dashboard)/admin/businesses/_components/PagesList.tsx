"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { Page } from "@/types";
import { cardStyle, ghostBtn, primaryBtn } from "./pageUi";

interface Props {
  businessId: string;
}

/**
 * Admin list of a business's extra pages. Deliberately its own screen rather
 * than another tab inside BusinessForm — that file is already 2,600 lines.
 */
export function PagesList({ businessId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [business, setBusiness] = useState<{ name: string; slug: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/pages?business_id=${businessId}`);
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Could not load pages", "error");
    } else {
      setPages(json.pages as Page[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // The business name and slug for the header and the URL preview.
  useEffect(() => {
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data } = await createClient()
        .from("businesses").select("name, slug").eq("id", businessId).maybeSingle();
      if (data) setBusiness(data);
    })();
  }, [businessId]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    const res = await fetch(`/api/admin/pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) { showToast(json.error || "Save failed", "error"); return false; }
    await load();
    return true;
  }

  async function move(index: number, delta: number) {
    const next = [...pages];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPages(next);
    await fetch("/api/admin/pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((p, i) => ({ id: p.id, display_order: i })) }),
    });
  }

  async function remove(page: Page) {
    // A published page may already be indexed; deleting it is a 404 for anyone
    // who followed a search result, so make the admin say it out loud.
    if (!window.confirm(`Delete "${page.title}"? Its URL will start returning 404.`)) return;
    setBusy(page.id);
    const res = await fetch(`/api/admin/pages/${page.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) { showToast("Delete failed", "error"); return; }
    showToast("Page deleted", "success");
    load();
  }

  if (loading) return <div style={{ padding: 24, color: "var(--color-muted)" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <button onClick={() => router.push(`/admin/businesses/${businessId}`)} style={ghostBtn}>← Business</button>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "12px 0 0", color: "var(--color-dark)" }}>
            Pages{business ? ` · ${business.name}` : ""}
          </h1>
        </div>
        <Link href={`/admin/businesses/${businessId}/pages/new`} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          New page
        </Link>
      </div>

      {pages.length === 0 && (
        <div style={{ ...cardStyle, color: "var(--color-muted)", fontSize: 14 }}>
          No extra pages yet. A page lives at <code>book.bapita.com/{business?.slug ?? "<slug>"}/&lt;page&gt;</code>.
        </div>
      )}

      {pages.map((p, i) => (
        <div key={p.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...ghostBtn, padding: "2px 8px", opacity: i === 0 ? 0.35 : 1 }}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === pages.length - 1} style={{ ...ghostBtn, padding: "2px 8px", opacity: i === pages.length - 1 ? 0.35 : 1 }}>↓</button>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "var(--color-dark)", fontSize: 15 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 3 }}>
              /{business?.slug}/{p.slug} · {p.kind}
            </div>
          </div>

          <span style={{
            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            background: p.published ? "#D1FAE5" : "#F3F4F6",
            color: p.published ? "#065F46" : "#6B7280",
          }}>
            {p.published ? "Published" : "Draft"}
          </span>

          <button
            onClick={() => patch(p.id, { published: !p.published })}
            disabled={busy === p.id}
            style={ghostBtn}
          >
            {p.published ? "Unpublish" : "Publish"}
          </button>
          <Link href={`/admin/businesses/${businessId}/pages/${p.id}`} style={{ ...ghostBtn, textDecoration: "none" }}>Edit</Link>
          <button onClick={() => remove(p)} disabled={busy === p.id} style={{ ...ghostBtn, color: "#B91C1C" }}>Delete</button>
        </div>
      ))}
    </div>
  );
}
