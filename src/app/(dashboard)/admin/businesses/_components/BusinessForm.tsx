"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name:               string;
  slug:               string;
  template_style:     string;
  tagline:            string;
  phone:              string;
  address:            string;
  email:              string;
  instagram_url:      string;
  facebook_url:       string;
  whatsapp_number:    string;
  google_review_link: string;
  google_maps_url:    string;
  waze_url:           string;
  about_text:         string;
  accent_color:       string;
  show_gallery:       boolean;
  show_about:         boolean;
  show_hours:         boolean;
  show_location:      boolean;
  status:             "draft" | "live";
}

interface GalleryItem { url: string; uploading?: boolean; }

type Tab = "profile" | "gallery" | "services";

const EMPTY_FORM: FormData = {
  name: "", slug: "", template_style: "classic",
  tagline: "", phone: "", address: "", email: "",
  instagram_url: "", facebook_url: "", whatsapp_number: "",
  google_review_link: "", google_maps_url: "", waze_url: "",
  about_text: "", accent_color: "",
  show_gallery: true, show_about: true, show_hours: true, show_location: true,
  status: "draft",
};

interface Props {
  mode:        "new" | "edit";
  businessId?: string;
  onSaved:     (slug: string) => void;
  onCancel:    () => void;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function BusinessForm({ mode, businessId, onSaved, onCancel }: Props) {
  const supabase = createClient();
  const [form,     setForm]     = useState<FormData>(EMPTY_FORM);
  const [services, setServices] = useState<Service[]>([]);
  const [gallery,  setGallery]  = useState<GalleryItem[]>([]);
  const [tab,      setTab]      = useState<Tab>("profile");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [saved,    setSaved]    = useState(false);
  const [loading,  setLoading]  = useState(mode === "edit");

  // Load existing business
  useEffect(() => {
    if (mode !== "edit" || !businessId) return;
    (async () => {
      const { data: b } = await supabase.from("businesses").select("*").eq("id", businessId).single();
      if (b) {
        setForm({
          name:               b.name               || "",
          slug:               b.slug               || "",
          template_style:     b.template_style      || "classic",
          tagline:            b.tagline             || "",
          phone:              b.phone               || "",
          address:            b.address             || "",
          email:              b.email               || "",
          instagram_url:      b.instagram_url       || "",
          facebook_url:       b.facebook_url        || "",
          whatsapp_number:    b.whatsapp_number     || "",
          google_review_link: b.google_review_link  || "",
          google_maps_url:    b.google_maps_url     || "",
          waze_url:           b.waze_url            || "",
          about_text:         b.about_text          || "",
          accent_color:       b.accent_color        || "",
          show_gallery:       b.show_gallery        ?? true,
          show_about:         b.show_about          ?? true,
          show_hours:         b.show_hours          ?? true,
          show_location:      b.show_location       ?? true,
          status:             b.status              || "draft",
        });
        // Build gallery — merge hero + gallery_images deduped, hero first
        const imgs: string[] = b.gallery_images || [];
        const hero: string   = b.hero_image_url || "";
        const merged = hero && !imgs.includes(hero) ? [hero, ...imgs] : imgs;
        setGallery(merged.map((url: string) => ({ url })));
      }
      const { data: sv } = await supabase
        .from("services").select("*").eq("business_id", businessId).order("display_order");
      setServices((sv as Service[]) || []);
      setLoading(false);
    })();
  }, [businessId, mode]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (key === "name" && mode === "new") {
      const slug = (value as string).toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
      setForm(f => ({ ...f, name: value as string, slug }));
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.slug.trim()) { setError("Slug is required"); return; }
    setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setSaving(false); return; }

    const urls = gallery.filter(g => !g.uploading && g.url).map(g => g.url);

    const payload = {
      name:               form.name.trim(),
      slug:               form.slug.trim(),
      template_style:     form.template_style,
      tagline:            form.tagline            || null,
      phone:              form.phone              || null,
      address:            form.address            || null,
      email:              form.email              || null,
      instagram_url:      form.instagram_url      || null,
      facebook_url:       form.facebook_url       || null,
      whatsapp_number:    form.whatsapp_number    || null,
      google_review_link: form.google_review_link || null,
      google_maps_url:    form.google_maps_url    || null,
      waze_url:           form.waze_url           || null,
      about_text:         form.about_text         || null,
      accent_color:       form.accent_color       || null,
      show_gallery:       form.show_gallery,
      show_about:         form.show_about,
      show_hours:         form.show_hours,
      show_location:      form.show_location,
      status:             form.status,
      gallery_images:     urls,
      hero_image_url:     urls[0] || null,
    };

    if (mode === "new") {
      const { data, error: e } = await supabase.from("businesses")
        .insert({ ...payload, owner_id: user.id }).select("id").single();
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from("businesses").update(payload).eq("id", businessId!);
      if (e) { setError(e.message); setSaving(false); return; }
    }

    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved(form.slug);
  }

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"var(--color-muted)", fontSize:14 }}>
        Loading…
      </div>
    );
  }

  const title   = mode === "new" ? "New Business" : (form.name || "Business");
  const previewUrl = form.slug ? `https://book.bapita.com/${form.slug}` : null;

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile",  label: "Profile"  },
    { id: "gallery",  label: `Gallery ${gallery.filter(g => !g.uploading).length > 0 ? `(${gallery.filter(g => !g.uploading).length})` : ""}` },
    ...(mode === "edit" ? [{ id: "services" as Tab, label: `Services (${services.length})` }] : []),
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"var(--color-cream)" }}>
      {/* Header */}
      <div style={{ flexShrink:0, background:"var(--color-surface)", borderBottom:"var(--line)" }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onCancel} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-muted)", fontSize:14, fontFamily:"inherit", padding:0, flexShrink:0 }}>
            ← Back
          </button>
          <h1 style={{ fontSize:18, fontWeight:700, color:"var(--color-dark)", margin:0, letterSpacing:"-0.02em", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {title}
          </h1>

          {/* Status pill */}
          <button
            onClick={() => set("status", form.status === "draft" ? "live" : "draft")}
            style={{
              height:28, padding:"0 10px", borderRadius:20, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:700, letterSpacing:"0.04em", fontFamily:"inherit",
              background: form.status === "live" ? "#D1FAE5" : "var(--color-cream-2)",
              color:      form.status === "live" ? "#065F46" : "var(--color-muted)",
              transition:"background 0.2s, color 0.2s",
              flexShrink:0,
            }}
          >
            {form.status === "live" ? "● LIVE" : "○ DRAFT"}
          </button>

          {/* Preview */}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                height:32, padding:"0 12px", borderRadius:9, border:"1.5px solid var(--color-cream-2)",
                background:"var(--color-cream)", color:"var(--color-dark)",
                fontSize:12, fontWeight:700, textDecoration:"none",
                display:"flex", alignItems:"center", gap:5, flexShrink:0,
                transition:"border-color 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--color-amber)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--color-cream-2)"; }}
            >
              Preview ↗
            </a>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height:32, padding:"0 16px", borderRadius:9, border:"none",
              background: saved ? "#16A34A" : "var(--color-amber)",
              color:"#fff", fontSize:13, fontWeight:700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              transition:"background 0.3s",
              fontFamily:"inherit", flexShrink:0,
              boxShadow:"0 2px 8px rgba(232,146,10,0.25)",
            }}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth:760, margin:"0 auto", padding:"0 24px", display:"flex", gap:0, borderTop:"var(--line)" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding:"10px 16px", border:"none", background:"none", cursor:"pointer",
                fontSize:13, fontWeight:tab === t.id ? 700 : 500,
                color: tab === t.id ? "var(--color-amber)" : "var(--color-muted)",
                borderBottom: tab === t.id ? "2px solid var(--color-amber)" : "2px solid transparent",
                fontFamily:"inherit", transition:"color 0.15s, border-color 0.15s",
                marginBottom:-1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"20px 24px 80px" }}>

          {error && (
            <div style={{ background:"#FEE2E2", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#B91C1C", fontWeight:500, marginBottom:16 }}>
              {error}
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <SectionCard title="Business Info">
                <Row>
                  <Field label="Business Name *">
                    <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Studio Avi" style={inputStyle} />
                  </Field>
                  <Field label="URL Slug *">
                    <input
                      value={form.slug}
                      onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="studio-avi"
                      style={inputStyle}
                    />
                    {form.slug && (
                      <div style={{ fontSize:11, color:"var(--color-muted)", marginTop:4 }}>
                        book.bapita.com/<strong style={{ color:"var(--color-amber)" }}>{form.slug}</strong>
                      </div>
                    )}
                  </Field>
                </Row>
                <Row>
                  <Field label="Template">
                    <select value={form.template_style} onChange={e => set("template_style", e.target.value)} style={inputStyle}>
                      <option value="classic">Classic (cream/gold)</option>
                      <option value="clean">Clean (white/black)</option>
                      <option value="dark">Dark (dark/gold)</option>
                    </select>
                  </Field>
                  <Field label="Accent Color">
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <input
                        type="color"
                        value={form.accent_color || "#B8862A"}
                        onChange={e => set("accent_color", e.target.value)}
                        style={{ width:44, height:44, border:"1.5px solid var(--color-cream-2)", borderRadius:9, cursor:"pointer", padding:2 }}
                      />
                      <input
                        value={form.accent_color}
                        onChange={e => set("accent_color", e.target.value)}
                        placeholder="Leave blank for template default"
                        style={{ ...inputStyle, flex:1 }}
                      />
                    </div>
                  </Field>
                </Row>
                <Row>
                  <Field label="Tagline">
                    <input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Precision cuts. No waiting." style={inputStyle} />
                  </Field>
                  <Field label="Phone">
                    <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+972-50-0000000" style={inputStyle} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Address">
                    <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Dizengoff St, Tel Aviv" style={inputStyle} />
                  </Field>
                  <Field label="Email">
                    <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="avi@example.com" style={inputStyle} />
                  </Field>
                </Row>
              </SectionCard>

              <SectionCard title="Links & Social">
                <Row>
                  <Field label="WhatsApp Number">
                    <input value={form.whatsapp_number} onChange={e => set("whatsapp_number", e.target.value)} placeholder="+972501234567" style={inputStyle} />
                  </Field>
                  <Field label="Instagram">
                    <input value={form.instagram_url} onChange={e => set("instagram_url", e.target.value)} placeholder="https://instagram.com/studioavi" style={inputStyle} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Facebook">
                    <input value={form.facebook_url} onChange={e => set("facebook_url", e.target.value)} placeholder="https://facebook.com/studioavi" style={inputStyle} />
                  </Field>
                  <Field label="Google Review Link">
                    <input value={form.google_review_link} onChange={e => set("google_review_link", e.target.value)} placeholder="https://g.page/r/..." style={inputStyle} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Google Maps URL">
                    <input value={form.google_maps_url} onChange={e => set("google_maps_url", e.target.value)} placeholder="https://maps.google.com/?q=..." style={inputStyle} />
                  </Field>
                  <Field label="Waze URL">
                    <input value={form.waze_url} onChange={e => set("waze_url", e.target.value)} placeholder="https://waze.com/ul?ll=..." style={inputStyle} />
                  </Field>
                </Row>
              </SectionCard>

              <SectionCard title="About Text">
                <Field label="Short paragraph shown in About section">
                  <textarea
                    value={form.about_text}
                    onChange={e => set("about_text", e.target.value)}
                    placeholder="Studio Avi has been serving Tel Aviv since 2018…"
                    rows={4}
                    style={{ ...inputStyle, height:"auto", resize:"vertical", padding:"10px 13px", lineHeight:1.6 }}
                  />
                </Field>
              </SectionCard>

              <SectionCard title="Section Visibility">
                <p style={{ fontSize:13, color:"var(--color-muted)", marginBottom:16, marginTop:0 }}>
                  Toggle which sections appear on the booking page.
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {([
                    ["show_gallery",  "Gallery"],
                    ["show_about",    "About"],
                    ["show_hours",    "Business Hours"],
                    ["show_location", "Location"],
                  ] as [keyof FormData, string][]).map(([key, label]) => (
                    <label key={key} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                      <div
                        onClick={() => set(key, !form[key])}
                        style={{
                          width:40, height:22, borderRadius:11, position:"relative", cursor:"pointer",
                          background: form[key] ? "var(--color-amber)" : "var(--color-cream-2)",
                          transition:"background 0.2s", flexShrink:0,
                        }}
                      >
                        <div style={{
                          position:"absolute", top:3, width:16, height:16, borderRadius:8,
                          background:"#fff", transition:"left 0.2s",
                          left: form[key] ? 21 : 3,
                          boxShadow:"0 1px 3px rgba(0,0,0,0.15)",
                        }} />
                      </div>
                      <span style={{ fontSize:14, color:"var(--color-dark)", fontWeight:500 }}>{label}</span>
                    </label>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── GALLERY TAB ── */}
          {tab === "gallery" && (
            <GalleryManager
              gallery={gallery}
              setGallery={setGallery}
              businessId={businessId}
            />
          )}

          {/* ── SERVICES TAB ── */}
          {tab === "services" && mode === "edit" && businessId && (
            <ServicesPanel businessId={businessId} services={services} setServices={setServices} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Gallery Manager ───────────────────────────────────────────────────────────

function GalleryManager({ gallery, setGallery, businessId }: {
  gallery:    GalleryItem[];
  setGallery: (g: GalleryItem[]) => void;
  businessId?: string;
}) {
  const supabase   = createClient();
  const inputRef   = useRef<HTMLInputElement>(null);
  const dragIdx    = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  async function uploadFiles(files: File[]) {
    const placeholders: GalleryItem[] = files.map(() => ({ url: "", uploading: true }));
    setGallery([...gallery, ...placeholders]);
    const startIdx = gallery.length;

    const results = await Promise.all(files.map(async (file, i) => {
      const ext  = file.name.split(".").pop();
      const path = `galleries/${businessId || "temp"}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("business-images").upload(path, file, { upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from("business-images").getPublicUrl(path);
      return data.publicUrl;
    }));

    setGallery(prev => {
      const next = [...prev];
      results.forEach((url, i) => {
        if (url) next[startIdx + i] = { url };
        else next.splice(startIdx + i, 1);
      });
      return next;
    });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadFiles(files);
    e.target.value = "";
  }

  function handleDropZone(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length) uploadFiles(files);
  }

  function handleDragStart(i: number) { dragIdx.current = i; }
  function handleDragEnter(i: number) { setDragOver(i); }
  function handleDragEnd()            { dragIdx.current = null; setDragOver(null); }

  function handleDrop(i: number) {
    const from = dragIdx.current;
    if (from === null || from === i) { setDragOver(null); return; }
    const next = [...gallery];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    setGallery(next);
    dragIdx.current = null;
    setDragOver(null);
  }

  function removeImage(i: number) {
    setGallery(gallery.filter((_, idx) => idx !== i));
  }

  function setAsHero(i: number) {
    if (i === 0) return;
    const next = [...gallery];
    const [img] = next.splice(i, 1);
    next.unshift(img);
    setGallery(next);
  }

  return (
    <SectionCard title="Gallery">
      <p style={{ fontSize:13, color:"var(--color-muted)", marginBottom:16, marginTop:0 }}>
        Drag to reorder. First image = hero on booking page.
      </p>

      {/* Grid */}
      {gallery.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:16 }}>
          {gallery.map((item, i) => (
            <div
              key={i}
              draggable={!item.uploading}
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDrop={e => { e.preventDefault(); handleDrop(i); }}
              onDragOver={e => e.preventDefault()}
              style={{
                position:"relative", aspectRatio:"1 / 1",
                borderRadius:10, overflow:"hidden",
                border: dragOver === i ? "2px solid var(--color-amber)" : "2px solid transparent",
                cursor: item.uploading ? "wait" : "grab",
                transition:"border-color 0.15s, opacity 0.15s",
                opacity: item.uploading ? 0.5 : 1,
                background:"var(--color-cream-2)",
              }}
            >
              {item.url && (
                <img
                  src={item.url}
                  alt=""
                  style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", pointerEvents:"none" }}
                />
              )}
              {item.uploading && (
                <div style={{
                  position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, color:"var(--color-muted)",
                }}>
                  Uploading…
                </div>
              )}

              {/* Hero badge (first, not uploading) */}
              {i === 0 && !item.uploading && (
                <div style={{
                  position:"absolute", top:6, insetInlineStart:6,
                  background:"var(--color-amber)", color:"#fff",
                  fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:20,
                  letterSpacing:"0.05em",
                }}>
                  ★ HERO
                </div>
              )}

              {/* Actions on hover */}
              {!item.uploading && (
                <div style={{
                  position:"absolute", inset:0,
                  background:"rgba(34,21,16,0)",
                  display:"flex", flexDirection:"column", justifyContent:"space-between", padding:6,
                }}>
                  {/* Set as hero */}
                  {i !== 0 && (
                    <button
                      onClick={() => setAsHero(i)}
                      title="Set as hero"
                      style={{
                        alignSelf:"flex-start",
                        background:"rgba(34,21,16,0.55)", border:"none", borderRadius:6,
                        color:"#fff", fontSize:9, fontWeight:700, padding:"3px 7px",
                        cursor:"pointer", fontFamily:"inherit", backdropFilter:"blur(4px)",
                        opacity:0,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="0"; }}
                      className="gallery-set-hero"
                    >
                      Set hero
                    </button>
                  )}
                  {/* Delete */}
                  <button
                    onClick={() => removeImage(i)}
                    title="Remove"
                    style={{
                      alignSelf:"flex-end",
                      width:24, height:24, borderRadius:6,
                      background:"rgba(239,68,68,0.85)", border:"none",
                      color:"#fff", fontSize:14, fontWeight:700,
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                      lineHeight:1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropZone}
        onClick={() => inputRef.current?.click()}
        style={{
          border:"2px dashed var(--color-cream-2)", borderRadius:12,
          padding: gallery.length > 0 ? "16px 20px" : "32px 20px",
          textAlign:"center", cursor:"pointer", transition:"border-color 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--color-amber)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--color-cream-2)"; }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleInputChange} />
        <p style={{ fontSize:14, fontWeight:600, color:"var(--color-dark)", margin:"0 0 4px" }}>
          {gallery.length > 0 ? "+ Add more photos" : "Drag photos here or click to upload"}
        </p>
        <p style={{ fontSize:12, color:"var(--color-muted)", margin:0 }}>JPG, PNG, WEBP — multiple files OK</p>
      </div>
    </SectionCard>
  );
}

// ─── Services Panel ────────────────────────────────────────────────────────────

function ServicesPanel({ businessId, services, setServices }: {
  businessId: string;
  services: Service[];
  setServices: (s: Service[]) => void;
}) {
  const supabase    = createClient();
  const [adding,    setAdding]   = useState(false);
  const [editing,   setEditing]  = useState<Service | null>(null);
  const [name,      setName]     = useState("");
  const [price,     setPrice]    = useState("");
  const [duration,  setDuration] = useState("");
  const [desc,      setDesc]     = useState("");
  const [saving,    setSaving]   = useState(false);
  const [deleteId,  setDeleteId] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase.from("services").select("*").eq("business_id", businessId).order("display_order");
    setServices((data as Service[]) || []);
  }

  function startAdd()          { setEditing(null); setName(""); setPrice(""); setDuration(""); setDesc(""); setAdding(true); }
  function startEdit(s: Service) { setEditing(s); setName(s.name); setPrice(String(s.price)); setDuration(String(s.duration)); setDesc(""); setAdding(true); }
  function cancelAdd()         { setAdding(false); setEditing(null); }

  async function saveService() {
    if (!name.trim() || !price || !duration) return;
    setSaving(true);
    if (editing) {
      await supabase.from("services").update({
        name: name.trim(), price: Number(price), duration: Number(duration), description: desc || null,
      }).eq("id", editing.id);
    } else {
      await supabase.from("services").insert({
        business_id: businessId, name: name.trim(),
        price: Number(price), duration: Number(duration),
        description: desc || null, active: true, display_order: services.length + 1,
      });
    }
    await reload();
    setSaving(false); setAdding(false); setEditing(null);
  }

  async function confirmDelete(id: string) {
    await supabase.from("services").delete().eq("id", id);
    setDeleteId(null);
    reload();
  }

  async function toggleActive(s: Service) {
    await supabase.from("services").update({ active: !s.active }).eq("id", s.id);
    reload();
  }

  return (
    <SectionCard title="Services">
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {services.length === 0 && !adding && (
          <p style={{ fontSize:13, color:"var(--color-muted)", textAlign:"center", padding:"16px 0" }}>No services yet.</p>
        )}
        {services.map(s => (
          <div key={s.id} style={{
            display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
            background:"var(--color-cream)", borderRadius:10,
            border:"1.5px solid var(--color-cream-2)",
            opacity: s.active ? 1 : 0.5,
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--color-dark)" }}>{s.name}</div>
              <div style={{ fontSize:12, color:"var(--color-muted)", marginTop:2 }}>{s.duration} min · ₪{s.price}</div>
            </div>
            <button onClick={() => toggleActive(s)} style={{
              fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, border:"none", cursor:"pointer",
              background: s.active ? "#D1FAE5" : "var(--color-cream-2)",
              color: s.active ? "#065F46" : "var(--color-muted)", fontFamily:"inherit",
            }}>
              {s.active ? "Active" : "Hidden"}
            </button>
            <button onClick={() => startEdit(s)} style={ghostBtn}>Edit</button>

            {/* Inline delete confirmation */}
            {deleteId === s.id ? (
              <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"var(--color-muted)" }}>Sure?</span>
                <button onClick={() => confirmDelete(s.id)} style={{ ...ghostBtn, color:"#EF4444", fontSize:11 }}>Yes</button>
                <button onClick={() => setDeleteId(null)} style={{ ...ghostBtn, fontSize:11 }}>No</button>
              </div>
            ) : (
              <button onClick={() => setDeleteId(s.id)} style={{ ...ghostBtn, color:"#EF4444" }}>✕</button>
            )}
          </div>
        ))}

        {adding && (
          <div style={{ background:"var(--color-cream)", borderRadius:12, padding:"16px", border:"1.5px solid var(--color-amber)", display:"flex", flexDirection:"column", gap:10 }}>
            <p style={{ fontSize:13, fontWeight:700, color:"var(--color-dark)", margin:0 }}>
              {editing ? "Edit service" : "New service"}
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Haircut" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price (₪) *</label>
                <input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="80" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Duration (min) *</label>
                <input value={duration} onChange={e => setDuration(e.target.value)} type="number" placeholder="30" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description (optional)</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" style={inputStyle} />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={saveService} disabled={saving} style={{
                height:34, padding:"0 16px", borderRadius:9, border:"none",
                background:"var(--color-amber)", color:"#fff",
                fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              }}>
                {saving ? "Saving…" : editing ? "Update" : "Add Service"}
              </button>
              <button onClick={cancelAdd} style={{
                height:34, padding:"0 16px", borderRadius:9,
                border:"1.5px solid var(--color-cream-2)", background:"transparent",
                color:"var(--color-muted)", fontSize:13, cursor:"pointer", fontFamily:"inherit",
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!adding && (
          <button
            onClick={startAdd}
            style={{
              height:38, borderRadius:10, border:"2px dashed var(--color-cream-2)",
              background:"transparent", color:"var(--color-muted)", fontSize:13, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit", transition:"border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--color-amber)"; e.currentTarget.style.color="var(--color-amber)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--color-cream-2)"; e.currentTarget.style.color="var(--color-muted)"; }}
          >
            + Add Service
          </button>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Shared layout helpers ─────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:"var(--color-surface)", borderRadius:16, padding:"20px", boxShadow:"0 1px 3px rgba(30,26,20,0.06)" }}>
      <h2 style={{ fontSize:14, fontWeight:700, color:"var(--color-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:16, marginTop:0 }}>
        {title}
      </h2>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize:11, fontWeight:700, color:"var(--color-muted)",
  textTransform:"uppercase", letterSpacing:"0.05em",
};

const inputStyle: React.CSSProperties = {
  height:44, width:"100%", padding:"0 13px",
  borderRadius:11, border:"1.5px solid var(--color-cream-2)",
  background:"var(--color-cream)", fontSize:14,
  color:"var(--color-dark)", outline:"none",
  fontFamily:"inherit", boxSizing:"border-box",
  transition:"border-color 0.15s",
};

const ghostBtn: React.CSSProperties = {
  background:"none", border:"none", cursor:"pointer",
  fontSize:12, fontWeight:600, color:"var(--color-muted)",
  padding:"4px 8px", borderRadius:6, fontFamily:"inherit",
};
