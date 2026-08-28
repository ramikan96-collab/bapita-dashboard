"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/i18n";
import type { Business } from "@/types";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  title_he: string | null;
  published: boolean;
  display_order: number;
}

/**
 * The owner's view of the multi-page add-on: read-only, on purpose. Pages are
 * written by Bapita staff in v1 (there is no write policy for owners at all),
 * so this shows what they paid for without implying an editor exists.
 *
 * Renders nothing at all when the business has no pages, so nothing changes for
 * any current client.
 */
export function OwnerPagesCard({ business }: { business: Business }) {
  const { t, lang } = useLang();
  const [pages, setPages] = useState<PageRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await createClient()
        .from("pages")
        .select("id, slug, title, title_he, published, display_order")
        .eq("business_id", business.id)
        .order("display_order");
      setPages((data ?? []) as PageRow[]);
    })();
  }, [business.id]);

  if (pages.length === 0) return null;

  const domain = business.custom_domain?.replace(/^www\./, "");
  const base = domain && business.custom_domain_verified
    ? `https://www.${domain}`
    : `https://book.bapita.com/${business.slug}`;

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-cream-2)" }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
          {t("Extra pages")}
        </h3>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>
          {t("Pages built for you by Bapita. Tap one to see it live.")}
        </p>

        {pages.map((p) => {
          const title = (lang === "he" && p.title_he) ? p.title_he : p.title;
          const href = `${base}/${p.slug}`;
          return (
            <a
              key={p.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--color-cream-2)",
                background: "var(--color-cream)", textDecoration: "none",
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>{title}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--color-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {href.replace(/^https:\/\//, "")}
                </span>
              </span>
              <span style={{
                flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                background: p.published ? "rgba(16,185,129,0.12)" : "var(--color-cream-2)",
                color: p.published ? "#047857" : "var(--color-muted)",
              }}>
                {p.published ? t("Live") : t("Draft")}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
