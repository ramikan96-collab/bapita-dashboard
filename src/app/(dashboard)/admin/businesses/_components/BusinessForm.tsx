"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/types";

interface FormData {
  name:            string;
  slug:            string;
  template_style:  string;
  tagline:         string;
  phone:           string;
  address:         string;
  email:           string;
  instagram_url:   string;
  hero_image_url:  string;
  about_text:      string;
  accent_color:    string;
  show_gallery:    boolean;
  show_about:      boolean;
  show_hours:      boolean;
  show_location:   boolean;
}

const EMPTY_FORM: FormData = {
  name: "", slug: "", template_style: "classic",
  tagline: "", phone: "", address: "", email: "",
  instagram_url: "", hero_image_url: "", about_text: "",
  accent_color: "", show_gallery: true, show_about: true,
  show_hours: true, show_location: true,
};

interface Props {
  mode:        "new" | "edit";
  businessId?: string;
  onSaved:     (slug: string) => void;
  onCancel:    () => void;
}

export default function BusinessForm({ mode, businessId, onSaved, onCancel }: Props) {
  const supabase = createClient();
  const [form,        setForm]        = useState<FormData>(EMPTY_FORM);
  const [services,    setServices]    = useState<Service[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [saved,       setSaved]       = useState(false);
  const [loading,     setLoading]     = useState(mode === "edit");
  const [heroUploading, setHeroUploading] = useState(false);
  const heroInputRef   = useRef<HTMLInputElement>(null);

  // Load existing business for edit mode
  useEffect(() => {
    if (mode !== "edit" || !businessId) return;
    (async () => {
      const { data: b } = await supabase.from("businesses").select("*").eq("id", businessId).single();
      if (b) {
        setForm({
          name:           b.name           || "",
          slug:           b.slug           || "",
          template_style: b.template_style || "classic",
          tagline:        b.tagline        || "",
          phone:          b.phone          || "",
          address:        b.address        || "",
          email:          b.email          || "",
          instagram_url:  b.instagram_url  || "",
          hero_image_url: b.hero_image_url || "",
          about_text:     b.about_text     || "",
          accent_color:   b.accent_color   || "",
          show_gallery:   b.show_gallery   ?? true,
          show_about:     b.show_about     ?? true,
          show_hours:     b.show_hours     ?? true,
          show_location:  b.show_location  ?? true,
        });
      }
      const { data: sv } = await supabase
        .from("services").select("*").eq("business_id", businessId).order("display_order");
      setServices((sv as Service[]) || []);
      setLoading(false);
    })();
  }, [businessId, mode]);

  function set(key: keyof FormData, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }));
    if (key === "name" && mode === "new") {
      const slug = (value as string).toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
      setForm(f => ({ ...f, name: value as string, slug }));
    }
  }

  async function handleHeroUpload(file: File) {
    setHeroUploading(true);
    setError("");
    const ext  = file.name.split(".").pop();
    const path = `heroes/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("business-images").upload(path, file, { upsert: true });
    if (upErr) { setError("Image upload failed: " + upErr.message); setHeroUploading(false); return; }
    const { data: urlData } = supabase.storage.from("business-images").getPublicUrl(path);
    setForm(f => ({ ...f, hero_image_url: urlData.publicUrl }));
    setHeroUploading(false);
  }

  async function handleSave() {
    if (!form.name.trim())  { setError("Name is required"); return; }
    if (!form.slug.trim())  { setError("Slug is required"); return; }
    setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setSaving(false); return; }

    const payload = {
      name:           form.name.trim(),
      slug:           form.slug.trim(),
      template_style: form.template_style,
      tagline:        form.tagline  || null,
      phone:          form.phone    || null,
      address:        form.address  || null,
      email:          form.email    || null,
      instagram_url:  form.instagram_url  || null,
      hero_image_url: form.hero_image_url || null,
      about_text:     form.about_text     || null,
      accent_color:   form.accent_color   || null,
      show_gallery:   form.show_gallery,
      show_about:     form.show_about,
      show_hours:     form.show_hours,
      show_location:  form.show_location,
    };

    let savedId = businessId;
    if (mode === "new") {
      const { data, error: e } = await supabase.from("businesses")
        .insert({ ...payload, owner_id: user.id }).select("id").single();
      if (e) { setError(e.message); setSaving(false); return; }
      savedId = data.id;
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

  const title = mode === "new" ? "New Business" : `Edit: ${form.name || "Business"}`;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"var(--color-cream)" }}>
      {/* Header */}
      <div style={{ flexShrink:0, background:"var(--color-surface)", borderBottom:"var(--line)" }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"16px 24px", display:"flex", alignItems:"center", gap:16 }}>
          <button onClick={onCancel} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-muted)", fontSize:14, fontFamily:"inherit", padding:0 }}>
            ← Back
          </button>
          <h1 style={{ fontSize:20, fontWeight:700, color:"var(--color-dark)", margin:0, letterSpacing:"-0.02em" }}>
            {title}
          </h1>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"24px 24px 80px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* Business Info Card */}
          <SectionCard title="Business Info">
            <Row>
              <Field label="Business Name *">
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Studio Avi" style={inputStyle} />
              </Field>
              <Field label="URL Slug *">
                <div style={{ position:"relative" }}>
                  <input value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="studio-avi" style={inputStyle} />
                  {form.slug && (
                    <div style={{ fontSize:11, color:"var(--color-muted)", marginTop:4 }}>
                      book.bapita.com/<strong style={{ color:"var(--color-amber)" }}>{form.slug}</strong>
                    </div>
                  )}
                </div>
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
              <Field label="Accent Color (optional)">
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input type="color" value={form.accent_color || "#B8862A"}
                    onChange={e => set("accent_color", e.target.value)}
                    style={{ width:44, height:44, border:"1.5px solid var(--color-cream-2)", borderRadius:9, cursor:"pointer", padding:2 }}
                  />
                  <input value={form.accent_color} onChange={e => set("accent_color", e.target.value)}
                    placeholder="#B8862A — leave blank for template default"
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
            <Row>
              <Field label="Instagram URL">
                <input value={form.instagram_url} onChange={e => set("instagram_url", e.target.value)} placeholder="https://instagram.com/studioavi" style={inputStyle} />
              </Field>
            </Row>
          </SectionCard>

          {/* Hero Image */}
          <SectionCard title="Hero Image">
            <Field label="Upload from laptop or paste URL">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleHeroUpload(f); }}
                onClick={() => heroInputRef.current?.click()}
                style={{
                  border:"2px dashed var(--color-cream-2)", borderRadius:12, padding:"24px 20px",
                  textAlign:"center", cursor:"pointer", transition:"border-color 0.15s",
                  background: form.hero_image_url ? "var(--color-cream)" : "transparent",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="var(--color-amber)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="var(--color-cream-2)"; }}
              >
                <input ref={heroInputRef} type="file" accept="image/*" style={{ display:"none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); }} />
                {heroUploading ? (
                  <p style={{ color:"var(--color-muted)", fontSize:14 }}>Uploading…</p>
                ) : form.hero_image_url ? (
                  <div>
                    <img src={form.hero_image_url} alt="" style={{ width:"100%", maxHeight:180, objectFit:"cover", borderRadius:8, marginBottom:10 }} />
                    <p style={{ fontSize:12, color:"var(--color-muted)" }}>Click or drag to replace</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize:14, fontWeight:600, color:"var(--color-dark)", marginBottom:4 }}>Drag photo here or click to upload</p>
                    <p style={{ fontSize:12, color:"var(--color-muted)" }}>JPG, PNG, WEBP — best is a wide landscape photo</p>
                  </div>
                )}
              </div>
            </Field>
            <Field label="Or paste image URL">
              <input value={form.hero_image_url} onChange={e => set("hero_image_url", e.target.value)}
                placeholder="https://..." style={inputStyle} />
            </Field>
          </SectionCard>

          {/* About */}
          <SectionCard title="About Text">
            <Field label="A short paragraph about the business (shown in About section)">
              <textarea value={form.about_text} onChange={e => set("about_text", e.target.value)}
                placeholder="Studio Avi has been serving Tel Aviv since 2018..."
                rows={4}
                style={{ ...inputStyle, height:"auto", resize:"vertical", padding:"10px 13px", lineHeight:1.6 }}
              />
            </Field>
          </SectionCard>

          {/* Section Visibility */}
          <SectionCard title="Section Visibility">
            <p style={{ fontSize:13, color:"var(--color-muted)", marginBottom:16 }}>
              Toggle which sections appear on the barber's booking page.
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
                      transition:"background 0.2s",
                      flexShrink:0,
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

          {/* Services — only in edit mode */}
          {mode === "edit" && businessId && (
            <ServicesPanel businessId={businessId} services={services} setServices={setServices} />
          )}
          {mode === "new" && (
            <div style={{ background:"var(--color-surface)", borderRadius:16, padding:"16px 20px", border:"var(--line)" }}>
              <p style={{ fontSize:13, color:"var(--color-muted)", margin:0 }}>
                💡 Save the business first, then you can add services on the edit page.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background:"#FEE2E2", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#B91C1C", fontWeight:500 }}>
              {error}
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height:48, borderRadius:14, border:"none",
              background: saved ? "#16A34A" : "var(--wash-amber)",
              color:"#fff", fontSize:15, fontWeight:700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              transition:"background 0.3s",
              fontFamily:"inherit",
              boxShadow:"0 4px 14px rgba(232,146,10,0.28)",
            }}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : mode === "new" ? "Create Business" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Services Panel ────────────────────────────────────────────────────────

function ServicesPanel({ businessId, services, setServices }: {
  businessId: string;
  services: Service[];
  setServices: (s: Service[]) => void;
}) {
  const supabase  = createClient();
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name,    setName]    = useState("");
  const [price,   setPrice]   = useState("");
  const [duration, setDuration] = useState("");
  const [desc,    setDesc]    = useState("");
  const [saving,  setSaving]  = useState(false);

  async function reload() {
    const { data } = await supabase.from("services").select("*").eq("business_id", businessId).order("display_order");
    setServices((data as Service[]) || []);
  }

  function startAdd() { setEditing(null); setName(""); setPrice(""); setDuration(""); setDesc(""); setAdding(true); }
  function startEdit(s: Service) { setEditing(s); setName(s.name); setPrice(String(s.price)); setDuration(String(s.duration)); setDesc(""); setAdding(true); }
  function cancelAdd() { setAdding(false); setEditing(null); }

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
        description: desc || null, active: true,
        display_order: services.length + 1,
      });
    }
    await reload();
    setSaving(false); setAdding(false); setEditing(null);
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service?")) return;
    await supabase.from("services").delete().eq("id", id);
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
            <button onClick={() => toggleActive(s)} style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, border:"none", cursor:"pointer", background: s.active ? "#D1FAE5" : "var(--color-cream-2)", color: s.active ? "#065F46" : "var(--color-muted)", fontFamily:"inherit" }}>
              {s.active ? "Active" : "Hidden"}
            </button>
            <button onClick={() => startEdit(s)} style={ghostBtn}>Edit</button>
            <button onClick={() => deleteService(s.id)} style={{ ...ghostBtn, color:"#EF4444" }}>✕</button>
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
              <button onClick={saveService} disabled={saving} style={{ height:34, padding:"0 16px", borderRadius:9, border:"none", background:"var(--color-amber)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {saving ? "Saving…" : editing ? "Update" : "Add Service"}
              </button>
              <button onClick={cancelAdd} style={{ height:34, padding:"0 16px", borderRadius:9, border:"1.5px solid var(--color-cream-2)", background:"transparent", color:"var(--color-muted)", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!adding && (
          <button onClick={startAdd} style={{
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

// ─── Shared layout helpers ─────────────────────────────────────────────────

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
