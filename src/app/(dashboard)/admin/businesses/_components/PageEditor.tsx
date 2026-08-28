"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { Page, PageKind, PageSpec, Service } from "@/types";
import { PAGE_SECTIONS } from "@/types";
import { pageSlugErrorMessage, validatePageSlug } from "@/lib/reserved-page-slugs";
import { cardStyle, ghostBtn, inputStyle, labelStyle, primaryBtn, slugify, textareaStyle } from "./pageUi";

interface Props {
  businessId: string;
  /** Omitted when creating. */
  pageId?: string;
}

const DEFAULT_ORDER: string[] = [...PAGE_SECTIONS];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{hint}</span>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <h2 style={{ ...labelStyle, fontSize: 14, marginBottom: 16, marginTop: 0 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

export function PageEditor({ businessId, pageId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [business, setBusiness] = useState<{ name: string; slug: string | null; gallery_images: string[] | null } | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const [kind, setKind]           = useState<PageKind>("detail");
  const [title, setTitle]         = useState("");
  const [titleHe, setTitleHe]     = useState("");
  const [slug, setSlug]           = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [published, setPublished] = useState(false);
  const [order, setOrder]         = useState<string[]>(DEFAULT_ORDER);

  const [body, setBody]           = useState("");
  const [bodyHe, setBodyHe]       = useState("");
  const [specs, setSpecs]         = useState<PageSpec[]>([]);
  const [specsHe, setSpecsHe]     = useState<PageSpec[]>([]);
  const [images, setImages]       = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState("");
  const [ctaLabel, setCtaLabel]   = useState("");
  const [ctaLabelHe, setCtaLabelHe] = useState("");

  const [seoTitle, setSeoTitle]   = useState("");
  const [seoDesc, setSeoDesc]     = useState("");
  const [ogImage, setOgImage]     = useState("");

  const load = useCallback(async () => {
    const [{ data: biz }, { data: svc }] = await Promise.all([
      supabase.from("businesses").select("name, slug, gallery_images").eq("id", businessId).maybeSingle(),
      supabase.from("services").select("*").eq("business_id", businessId).order("display_order"),
    ]);
    setBusiness(biz ?? null);
    setServices((svc ?? []) as Service[]);

    if (pageId) {
      const res = await fetch(`/api/admin/pages?business_id=${businessId}`);
      const json = await res.json();
      const p = (json.pages as Page[] | undefined)?.find((x) => x.id === pageId);
      if (p) {
        setKind(p.kind);
        setTitle(p.title);
        setTitleHe(p.title_he ?? "");
        setSlug(p.slug);
        setSlugTouched(true);
        setServiceId(p.service_id ?? "");
        setPublished(p.published);
        setOrder(p.section_order?.length ? p.section_order : DEFAULT_ORDER);
        const c = p.content || {};
        setBody(c.body ?? "");
        setBodyHe(c.body_he ?? "");
        setSpecs(c.specs ?? []);
        setSpecsHe(c.specs_he ?? []);
        setImages(c.images ?? []);
        setHeroImage(c.hero_image_url ?? "");
        setCtaLabel(c.cta_label ?? "");
        setCtaLabelHe(c.cta_label_he ?? "");
        setSeoTitle(p.seo_title ?? "");
        setSeoDesc(p.seo_description ?? "");
        setOgImage(p.og_image_url ?? "");
      }
    }
    setLoading(false);
  }, [businessId, pageId, supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Detail pages take their title from the chosen service unless one is typed.
  function pickService(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc && !title) {
      setTitle(svc.name);
      if (!slugTouched) setSlug(slugify(svc.name));
    }
  }

  function moveSection(i: number, delta: number) {
    const next = [...order];
    const target = i + delta;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    setOrder(next);
  }

  async function save() {
    const slugError = validatePageSlug(slug);
    if (slugError) { showToast(pageSlugErrorMessage(slugError), "error"); return; }
    if (!title.trim()) { showToast("Give the page a title.", "error"); return; }

    setSaving(true);
    const payload = {
      business_id: businessId,
      kind,
      slug: slug.trim().toLowerCase(),
      title: title.trim(),
      title_he: titleHe.trim() || null,
      service_id: kind === "detail" ? (serviceId || null) : null,
      section_order: order,
      published,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDesc.trim() || null,
      og_image_url: ogImage.trim() || null,
      content: {
        body: body.trim() || null,
        body_he: bodyHe.trim() || null,
        specs: specs.filter((s) => s.label.trim() && s.value.trim()),
        specs_he: specsHe.filter((s) => s.label.trim() && s.value.trim()),
        images,
        hero_image_url: heroImage || null,
        cta_label: ctaLabel.trim() || null,
        cta_label_he: ctaLabelHe.trim() || null,
      },
    };

    const res = await fetch(pageId ? `/api/admin/pages/${pageId}` : "/api/admin/pages", {
      method: pageId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) { showToast(json.error || "Save failed", "error"); return; }
    showToast("Page saved", "success");
    router.push(`/admin/businesses/${businessId}/pages`);
  }

  if (loading) return <div style={{ padding: 24, color: "var(--color-muted)" }}>Loading…</div>;

  const gallery = business?.gallery_images ?? [];
  const publicUrl = `book.bapita.com/${business?.slug ?? "<slug>"}/${slug || "<page>"}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div>
        <button onClick={() => router.push(`/admin/businesses/${businessId}/pages`)} style={ghostBtn}>← Pages</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "12px 0 0", color: "var(--color-dark)" }}>
          {pageId ? "Edit page" : "New page"}
        </h1>
        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 6 }}>{publicUrl}</div>
      </div>

      <Card title="Basics">
        {!pageId && (
          <Field label="Kind" hint="A detail page describes one service or unit. A custom page is free text.">
            <select value={kind} onChange={(e) => setKind(e.target.value as PageKind)} style={inputStyle}>
              <option value="detail">Detail — one service / unit</option>
              <option value="custom">Custom — free page</option>
            </select>
          </Field>
        )}

        {kind === "detail" && (
          <Field label="Service / unit" hint="The CTA opens booking with this one pre-selected.">
            <select value={serviceId} onChange={(e) => pickService(e.target.value)} style={inputStyle}>
              <option value="">— none —</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}

        <Field label="Title">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            style={inputStyle}
          />
        </Field>

        <Field label="Title (Hebrew)">
          <input value={titleHe} onChange={(e) => setTitleHe(e.target.value)} dir="rtl" style={inputStyle} />
        </Field>

        <Field label="URL slug" hint="Lowercase letters, numbers and hyphens. Changing it on a published page breaks its existing links.">
          <input
            value={slug}
            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
            style={inputStyle}
          />
        </Field>

        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--color-dark)" }}>
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Published
        </label>
      </Card>

      <Card title="Body">
        <Field label="Text" hint="Plain text. Blank line starts a new paragraph. HTML is stripped.">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} style={textareaStyle} />
        </Field>
        <Field label="Text (Hebrew)">
          <textarea value={bodyHe} onChange={(e) => setBodyHe(e.target.value)} dir="rtl" style={textareaStyle} />
        </Field>
      </Card>

      {kind === "detail" && (
        <Card title="Details">
          {(["en", "he"] as const).map((lang) => {
            const rows = lang === "en" ? specs : specsHe;
            const setRows = lang === "en" ? setSpecs : setSpecsHe;
            return (
              <div key={lang} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={labelStyle}>{lang === "en" ? "Specs" : "Specs (Hebrew)"}</span>
                {rows.map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
                    <input
                      value={row.label}
                      placeholder="Sleeps"
                      dir={lang === "he" ? "rtl" : "ltr"}
                      onChange={(e) => setRows(rows.map((r, j) => j === i ? { ...r, label: e.target.value } : r))}
                      style={inputStyle}
                    />
                    <input
                      value={row.value}
                      placeholder="4 guests"
                      dir={lang === "he" ? "rtl" : "ltr"}
                      onChange={(e) => setRows(rows.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                      style={inputStyle}
                    />
                    <button onClick={() => setRows(rows.filter((_, j) => j !== i))} style={{ ...ghostBtn, color: "#B91C1C" }}>×</button>
                  </div>
                ))}
                <button onClick={() => setRows([...rows, { label: "", value: "" }])} style={{ ...ghostBtn, alignSelf: "flex-start" }}>
                  + Add row
                </button>
              </div>
            );
          })}
        </Card>
      )}

      <Card title="Photos">
        {gallery.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
            This business has no gallery images yet. Upload them on the business form first.
          </div>
        ) : (
          <>
            <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
              Pick from the business gallery. The first selected photo is the hero unless you choose one.
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
              {gallery.map((url) => {
                const on = images.includes(url);
                return (
                  <button
                    key={url}
                    onClick={() => setImages(on ? images.filter((u) => u !== url) : [...images, url])}
                    style={{
                      padding: 0, border: on ? "3px solid var(--color-dark)" : "1.5px solid var(--color-cream-2)",
                      borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "none", aspectRatio: "4/3",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                );
              })}
            </div>
            <Field label="Hero photo">
              <select value={heroImage} onChange={(e) => setHeroImage(e.target.value)} style={inputStyle}>
                <option value="">— first selected —</option>
                {images.map((url) => <option key={url} value={url}>{url.split("/").pop()}</option>)}
              </select>
            </Field>
          </>
        )}
      </Card>

      <Card title="Button">
        <Field label="Button label" hint="Leave empty to use the business's own button label.">
          <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Button label (Hebrew)">
          <input value={ctaLabelHe} onChange={(e) => setCtaLabelHe(e.target.value)} dir="rtl" style={inputStyle} />
        </Field>
      </Card>

      <Card title="SEO">
        <Field label="Meta title" hint="Empty = “Page title | Business name”.">
          <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Meta description" hint="Around 155 characters. Empty = the first lines of the body.">
          <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} style={{ ...textareaStyle, minHeight: 80 }} />
        </Field>
        <Field label="Share image URL" hint="Empty = the hero photo.">
          <input value={ogImage} onChange={(e) => setOgImage(e.target.value)} style={inputStyle} />
        </Field>
      </Card>

      <Card title="Section order">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {order.map((section, i) => (
            <div key={section} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--color-dark)" }}>
              <button onClick={() => moveSection(i, -1)} disabled={i === 0} style={{ ...ghostBtn, padding: "2px 8px" }}>↑</button>
              <button onClick={() => moveSection(i, 1)} disabled={i === order.length - 1} style={{ ...ghostBtn, padding: "2px 8px" }}>↓</button>
              <span style={{ textTransform: "capitalize" }}>{section}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Save page"}
        </button>
        <button onClick={() => router.push(`/admin/businesses/${businessId}/pages`)} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}
