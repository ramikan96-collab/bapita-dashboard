import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { displayIlPhone } from "@/lib/phone-display";

// Shared by the accessibility statement and the business privacy notice.
// (The booking terms page predates this file and keeps its own copy.)

export interface LegalBiz {
  name: string;
  name_he: string | null;
  slug: string;
  business_type: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_number: string | null;
  business_id_number: string | null;
  legal_name: string | null;
  legal_address: string | null;
  default_lang: string | null;
}

// Same anon client + column grants as the terms page and the tenant homepage:
// every column here is already in the terms page's select, so no new grant is
// needed (see CLAUDE.md, gotcha 6).
export async function loadLegalBiz(slug: string): Promise<LegalBiz | null> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase
    .from("businesses")
    .select("name, name_he, slug, business_type, phone, email, whatsapp_number, business_id_number, legal_name, legal_address, default_lang")
    .eq("slug", slug)
    .single();
  return (data as LegalBiz | null) ?? null;
}

export function isHe(lang: string | undefined, b: LegalBiz): boolean {
  return lang === "he" || (lang !== "en" && b.default_lang === "he");
}

export function bizContact(b: LegalBiz): { phone: string | null; email: string | null } {
  const raw = b.phone || b.whatsapp_number;
  return { phone: raw ? displayIlPhone(raw) : null, email: b.email };
}

export type LegalSection = { h: string; p: (ReactNode | false | null | undefined)[] };

export function LegalShell({ b, he, page, title, updated, back, other, sections }: {
  b: LegalBiz;
  he: boolean;
  /** Path segment under /<slug>/legal/, used for the language switch. */
  page: string;
  title: string;
  updated: string;
  back: string;
  other: string;
  sections: LegalSection[];
}) {
  const muted = "var(--color-muted, #6B6257)";
  const dark = "var(--color-dark, #1E1A14)";
  return (
    <main dir={he ? "rtl" : "ltr"} lang={he ? "he" : "en"} style={{ minHeight: "100vh", background: "var(--color-cream, #FAF5EC)", padding: "40px 16px" }}>
      <article style={{ maxWidth: 720, margin: "0 auto", background: "var(--color-surface, #fff)", borderRadius: 20, padding: "28px 22px", lineHeight: 1.7, color: dark }}>
        <nav style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, marginBottom: 16 }}>
          <Link href={`/${b.slug}${he ? "/he" : ""}`} style={{ color: muted }}>{he ? "→" : "←"} {back}</Link>
          <Link href={`/${b.slug}/legal/${page}?lang=${he ? "en" : "he"}`} lang={he ? "en" : "he"} style={{ color: muted }}>{other}</Link>
        </nav>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>{title}</h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: muted }}>{updated}</p>
        {sections.map((s) => (
          <section key={s.h} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{s.h}</h2>
            {s.p.filter(Boolean).map((t, i) => (
              <p key={i} style={{ margin: "0 0 6px", fontSize: 15 }}>{t}</p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
