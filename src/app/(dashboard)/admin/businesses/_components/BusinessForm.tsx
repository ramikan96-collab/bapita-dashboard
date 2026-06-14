"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  services: "Services",
  gallery:  "Gallery",
  about:    "About",
  hours:    "Hours",
  location: "Location",
};
const DEFAULT_SECTION_ORDER = ["services", "gallery", "about", "hours", "location"];

const PLAN_TIERS = ["Starter", "Pro", "Custom"];
const PLAN_ADDONS = [
  { key: "whatsapp_reminders", label: "WhatsApp Reminders" },
  { key: "custom_domain",      label: "Custom Domain"       },
  { key: "priority_support",   label: "Priority Support"    },
  { key: "stripe_payments",    label: "Stripe Payments"     },
  { key: "social_boost",       label: "Social Boost"        },
  { key: "google_ads",         label: "Google Ads"          },
];

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
  // plan
  plan_tier:          string;
  plan_price:         string;
  plan_addons:        string[];
  plan_booking_limit: string;
  plan_start_date:    string;
  plan_renewal_date:  string;
  plan_notes:         string;
  stat_years:         string;
  stat_clients:       string;
  stat_rating:        string;
}

interface GalleryItem { url: string; uploading?: boolean; }

interface Stats {
  total:          number;
  thisMonth:      number;
  lastBooking:    string | null;
  activeServices: number;
}

type Tab = "profile" | "gallery" | "services" | "plan";

const EMPTY_FORM: FormData = {
  name: "", slug: "", template_style: "classic",
  tagline: "", phone: "", address: "", email: "",
  instagram_url: "", facebook_url: "", whatsapp_number: "",
  google_review_link: "", google_maps_url: "", waze_url: "",
  about_text: "", accent_color: "",
  show_gallery: true, show_about: true, show_hours: true, show_location: true,
  status: "draft",
  plan_tier: "", plan_price: "", plan_addons: [],
  plan_booking_limit: "", plan_start_date: "", plan_renewal_date: "", plan_notes: "",
  stat_years: "", stat_clients: "", stat_rating: "",
};

interface Props {
  mode:        "new" | "edit";
  businessId?: string;
  onSaved:     (slug: string) => void;
  onCancel:    () => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BusinessForm({ mode, businessId, onSaved, onCancel }: Props) {
  const supabase = createClient();

  const [form,         setForm]         = useState<FormData>(EMPTY_FORM);
  const [services,     setServices]     = useState<Service[]>([]);
  const [gallery,      setGallery]      = useState<GalleryItem[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [stats,        setStats]        = useState<Stats>({ total: 0, thisMonth: 0, lastBooking: null, activeServices: 0 });
  const [tab,          setTab]          = useState<Tab>("profile");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [saved,        setSaved]        = useState(false);
  const [loading,      setLoading]      = useState(mode === "edit");

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
          plan_tier:          b.plan_tier           || "",
          plan_price:         b.plan_price != null   ? String(b.plan_price) : "",
          plan_addons:        Array.isArray(b.plan_addons) ? b.plan_addons : [],
          plan_booking_limit: b.plan_booking_limit  != null ? String(b.plan_booking_limit) : "",
          plan_start_date:    b.plan_start_date     || "",
          plan_renewal_date:  b.plan_renewal_date   || "",
          plan_notes:         b.plan_notes          || "",
          stat_years:         b.stat_years   != null ? String(b.stat_years)   : "",
          stat_clients:       b.stat_clients != null ? String(b.stat_clients) : "",
          stat_rating:        b.stat_rating          || "",
        });
        // Merge hero + gallery_images
        const imgs: string[]  = b.gallery_images || [];
        const hero: string    = b.hero_image_url || "";
        const merged          = hero && !imgs.includes(hero) ? [hero, ...imgs] : imgs;
        setGallery(merged.map((url: string) => ({ url })));
        // Section order
        if (Array.isArray(b.section_order) && b.section_order.length > 0) {
          setSectionOrder(b.section_order);
        }
      }

      // Load services
      const { data: sv } = await supabase
        .from("services").select("*").eq("business_id", businessId).order("display_order");
      setServices((sv as Service[]) || []);

      // Load stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startStr = startOfMonth.toISOString().split("T")[0];
      const [
        { count: total },
        { count: thisMonth },
        { data: lastBook },
        { count: activeServices },
      ] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("business_id", businessId).gte("appointment_date", startStr),
        supabase.from("bookings").select("appointment_date").eq("business_id", businessId).order("appointment_date", { ascending: false }).limit(1),
        supabase.from("services").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
      ]);
      setStats({
        total:          total          || 0,
        thisMonth:      thisMonth      || 0,
        lastBooking:    lastBook?.[0]?.appointment_date || null,
        activeServices: activeServices || 0,
      });

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

  function toggleAddon(key: string) {
    setForm(f => ({
      ...f,
      plan_addons: f.plan_addons.includes(key)
        ? f.plan_addons.filter(k => k !== key)
        : [...f.plan_addons, key],
    }));
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
      hero_image_url:     urls[0]                 || null,
      section_order:      sectionOrder,
      plan_tier:          form.plan_tier           || null,
      plan_price:         form.plan_price          ? Number(form.plan_price) : null,
      plan_addons:        form.plan_addons,
      plan_booking_limit: form.plan_booking_limit  ? Number(form.plan_booking_limit) : null,
      plan_start_date:    form.plan_start_date     || null,
      plan_renewal_date:  form.plan_renewal_date   || null,
      plan_notes:         form.plan_notes          || null,
      stat_years:         form.stat_years   ? Number(form.stat_years)   : null,
      stat_clients:       form.stat_clients ? Number(form.stat_clients) : null,
      stat_rating:        form.stat_rating          || null,
    };

    if (mode === "new") {
      const { error: e } = await supabase.from("businesses")
        .insert({ ...payload, owner_id: user.id });
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

  const title      = mode === "new" ? "New Business" : (form.name || "Business");
  const previewUrl = form.slug ? `https://book.bapita.com/${form.slug}` : null;

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "gallery", label: `Gallery${gallery.filter(g => !g.uploading).length > 0 ? ` (${gallery.filter(g => !g.uploading).length})` : ""}` },
    ...(mode === "edit" ? [
      { id: "services" as Tab, label: `Services (${services.length})` },
      { id: "plan"     as Tab, label: "Plan & Stats"                  },
    ] : []),
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"var(--color-cream)" }}>
      {/* ── Header ── */}
      <div style={{ flexShrink:0, background:"var(--color-surface)", borderBottom:"var(--line)" }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onCancel} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-muted)", fontSize:14, fontFamily:"inherit", padding:0, flexShrink:0 }}>
            ← Back
          </button>
          <h1 style={{ fontSize:18, fontWeight:700, color:"var(--color-dark)", margin:0, letterSpacing:"-0.02em", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {title}
          </h1>

          {/* Status toggle */}
          <button
            onClick={() => set("status", form.status === "draft" ? "live" : "draft")}
            style={{
              height:28, padding:"0 10px", borderRadius:20, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:700, letterSpacing:"0.04em", fontFamily:"inherit", flexShrink:0,
              background: form.status === "live" ? "#D1FAE5" : "var(--color-cream-2)",
              color:      form.status === "live" ? "#065F46" : "var(--color-muted)",
              transition:"background 0.2s, color 0.2s",
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
                fontSize:12, fontWeight:700, textDecoration:"none", flexShrink:0,
                display:"flex", alignItems:"center", gap:5, transition:"border-color 0.15s",
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
              height:32, padding:"0 16px", borderRadius:9, border:"none", flexShrink:0,
              background: saved ? "#16A34A" : "var(--color-amber)",
              color:"#fff", fontSize:13, fontWeight:700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1, transition:"background 0.3s",
              fontFamily:"inherit", boxShadow:"0 2px 8px rgba(232,146,10,0.25)",
            }}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth:760, margin:"0 auto", padding:"0 24px", display:"flex", borderTop:"var(--line)" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding:"10px 16px", border:"none", background:"none", cursor:"pointer",
                fontSize:13, fontWeight: tab === t.id ? 700 : 500, fontFamily:"inherit",
                color:       tab === t.id ? "var(--color-amber)" : "var(--color-muted)",
                borderBottom: tab === t.id ? "2px solid var(--color-amber)" : "2px solid transparent",
                transition:"color 0.15s, border-color 0.15s", marginBottom:-1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"20px 24px 80px" }}>

          {error && (
            <div style={{ background:"#FEE2E2", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#B91C1C", fontWeight:500, marginBottom:16 }}>
              {error}
            </div>
          )}

          {/* ── PROFILE ── */}
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
                      placeholder="studio-avi" style={inputStyle}
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
                        style={{ width:44, height:44, border:"1.5px solid var(--color-cream-2)", borderRadius:9, cursor:"pointer", padding:2, flexShrink:0 }}
                      />
                      <input value={form.accent_color} onChange={e => set("accent_color", e.target.value)}
                        placeholder="Leave blank for default" style={{ ...inputStyle, flex:1 }} />
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
                  <textarea value={form.about_text} onChange={e => set("about_text", e.target.value)}
                    placeholder="Studio Avi has been serving Tel Aviv since 2018…"
                    rows={4}
                    style={{ ...inputStyle, height:"auto", resize:"vertical", padding:"10px 13px", lineHeight:1.6 }}
                  />
                </Field>
              </SectionCard>

              <SectionCard title="Booking Page Stats">
                <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:0, marginBottom:16 }}>
                  Shown as social proof on the booking page. Leave blank to hide.
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <Field label="Years Experience">
                    <input type="number" min="0" value={form.stat_years} onChange={e => set("stat_years", e.target.value)} placeholder="8" style={inputStyle} />
                  </Field>
                  <Field label="Total Clients">
                    <input type="number" min="0" value={form.stat_clients} onChange={e => set("stat_clients", e.target.value)} placeholder="500" style={inputStyle} />
                  </Field>
                  <Field label="Google Rating">
                    <input value={form.stat_rating} onChange={e => set("stat_rating", e.target.value)} placeholder="4.9" style={inputStyle} />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Section Visibility & Order">
                <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:0, marginBottom:16 }}>
                  Toggle visibility. Drag to reorder on the booking page.
                </p>
                <SectionReorder order={sectionOrder} setOrder={setSectionOrder} />
                <div style={{ height:1, background:"var(--color-cream-2)", margin:"16px 0" }} />
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

          {/* ── GALLERY ── */}
          {tab === "gallery" && (
            <GalleryManager gallery={gallery} setGallery={setGallery} businessId={businessId} />
          )}

          {/* ── SERVICES ── */}
          {tab === "services" && mode === "edit" && businessId && (
            <ServicesPanel businessId={businessId} services={services} setServices={setServices} />
          )}

          {/* ── PLAN & STATS ── */}
          {tab === "plan" && mode === "edit" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Stats */}
              <SectionCard title="Barber Stats">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 }}>
                  {[
                    { label:"All Time",      value: stats.total,          suffix: "bookings" },
                    { label:"This Month",    value: stats.thisMonth,      suffix: "bookings" },
                    { label:"Last Booking",  value: stats.lastBooking ? new Date(stats.lastBooking).toLocaleDateString("en-IL", { day:"numeric", month:"short" }) : "—", suffix: "" },
                    { label:"Active Svcs",   value: stats.activeServices, suffix: "services" },
                  ].map(s => (
                    <div key={s.label} style={{
                      background:"var(--color-cream)", borderRadius:12, padding:"14px 12px",
                      textAlign:"center", border:"1.5px solid var(--color-cream-2)",
                    }}>
                      <div style={{ fontSize:24, fontWeight:900, color:"var(--color-dark)", lineHeight:1 }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize:10, color:"var(--color-muted)", marginTop:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em" }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Plan */}
              <SectionCard title="Bapita Plan — Internal">
                <p style={{ fontSize:12, color:"var(--color-muted)", marginTop:0, marginBottom:4, fontStyle:"italic" }}>
                  Your business records. Not visible to the barber.
                </p>
                <Row>
                  <Field label="Plan Tier">
                    <select value={form.plan_tier} onChange={e => set("plan_tier", e.target.value)} style={inputStyle}>
                      <option value="">— select —</option>
                      {PLAN_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Monthly Price (₪)">
                    <input value={form.plan_price} onChange={e => set("plan_price", e.target.value)}
                      type="number" placeholder="299" style={inputStyle} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Booking Limit / month">
                    <input value={form.plan_booking_limit} onChange={e => set("plan_booking_limit", e.target.value)}
                      type="number" placeholder="100" style={inputStyle} />
                  </Field>
                  <div /> {/* spacer */}
                </Row>
                <Row>
                  <Field label="Start Date">
                    <input value={form.plan_start_date} onChange={e => set("plan_start_date", e.target.value)}
                      type="date" style={inputStyle} />
                  </Field>
                  <Field label="Renewal Date">
                    <input value={form.plan_renewal_date} onChange={e => set("plan_renewal_date", e.target.value)}
                      type="date" style={inputStyle} />
                  </Field>
                </Row>

                <Field label="Add-ons Enabled">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:4 }}>
                    {PLAN_ADDONS.map(a => (
                      <label key={a.key} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"8px 10px", borderRadius:8, background:"var(--color-cream)", border:`1.5px solid ${form.plan_addons.includes(a.key) ? "var(--color-amber)" : "var(--color-cream-2)"}`, transition:"border-color 0.15s" }}>
                        <input
                          type="checkbox"
                          checked={form.plan_addons.includes(a.key)}
                          onChange={() => toggleAddon(a.key)}
                          style={{ accentColor:"var(--color-amber)", width:14, height:14, flexShrink:0 }}
                        />
                        <span style={{ fontSize:13, color:"var(--color-dark)", fontWeight:form.plan_addons.includes(a.key) ? 700 : 500 }}>
                          {a.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="Internal Notes">
                  <textarea
                    value={form.plan_notes}
                    onChange={e => set("plan_notes", e.target.value)}
                    placeholder="e.g. Pays on the 1st. Wants to add WhatsApp next month."
                    rows={3}
                    style={{ ...inputStyle, height:"auto", resize:"vertical", padding:"10px 13px", lineHeight:1.6 }}
                  />
                </Field>
              </SectionCard>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Section Reorder ──────────────────────────────────────────────────────────

function SectionReorder({ order, setOrder }: { order: string[]; setOrder: (o: string[]) => void }) {
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragEnter(i: number) { setDragOver(i); }
  function onDragEnd()            { dragIdx.current = null; setDragOver(null); }

  function onDrop(i: number) {
    const from = dragIdx.current;
    if (from === null || from === i) { setDragOver(null); return; }
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    setOrder(next);
    dragIdx.current = null;
    setDragOver(null);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {order.map((key, i) => (
        <div
          key={key}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragEnter={() => onDragEnter(i)}
          onDragEnd={onDragEnd}
          onDrop={e => { e.preventDefault(); onDrop(i); }}
          onDragOver={e => e.preventDefault()}
          style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
            background:"var(--color-cream)", borderRadius:9,
            border: `1.5px solid ${dragOver === i ? "var(--color-amber)" : "var(--color-cream-2)"}`,
            cursor:"grab", transition:"border-color 0.15s",
            opacity: dragOver === i ? 0.7 : 1,
          }}
        >
          <span style={{ color:"var(--color-muted)", fontSize:14, userSelect:"none" }}>⠿</span>
          <span style={{ fontSize:13, fontWeight:600, color:"var(--color-dark)" }}>
            {SECTION_LABELS[key] || key}
          </span>
          <span style={{ fontSize:11, color:"var(--color-muted)", marginInlineStart:"auto" }}>#{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Gallery Manager ──────────────────────────────────────────────────────────

function GalleryManager({ gallery, setGallery, businessId }: {
  gallery:    GalleryItem[];
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  businessId?: string;
}) {
  const supabase  = createClient();
  const inputRef  = useRef<HTMLInputElement>(null);
  const dragIdx   = useRef<number | null>(null);
  const [dragOver,  setDragOver]  = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  async function uploadFiles(files: File[]) {
    const placeholders: GalleryItem[] = files.map(() => ({ url: "", uploading: true }));
    setGallery(prev => [...prev, ...placeholders]);
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
        else     next.splice(startIdx + i, 1);
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

  function removeImage(i: number)  { setGallery(prev => prev.filter((_, idx) => idx !== i)); }

  function setAsHero(i: number) {
    if (i === 0) return;
    setGallery(prev => {
      const next = [...prev];
      const [img] = next.splice(i, 1);
      next.unshift(img);
      return next;
    });
  }

  return (
    <SectionCard title="Gallery">
      <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:0, marginBottom:16 }}>
        Drag to reorder. First image = hero on booking page.
      </p>

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
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                position:"relative", aspectRatio:"1 / 1", borderRadius:10, overflow:"hidden",
                border: dragOver === i ? "2px solid var(--color-amber)" : "2px solid transparent",
                cursor: item.uploading ? "wait" : "grab",
                transition:"border-color 0.15s, opacity 0.15s",
                opacity: item.uploading ? 0.5 : 1,
                background:"var(--color-cream-2)",
              }}
            >
              {item.url && (
                <img src={item.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", pointerEvents:"none" }} />
              )}
              {item.uploading && (
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"var(--color-muted)" }}>
                  Uploading…
                </div>
              )}

              {/* Hero badge */}
              {i === 0 && !item.uploading && (
                <div style={{
                  position:"absolute", top:6, insetInlineStart:6,
                  background:"var(--color-amber)", color:"#fff",
                  fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:20, letterSpacing:"0.05em",
                }}>
                  ★ HERO
                </div>
              )}

              {/* Hover actions */}
              {hoveredIdx === i && !item.uploading && (
                <div style={{ position:"absolute", inset:0, background:"rgba(34,21,16,0.28)", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:6 }}>
                  {i !== 0 ? (
                    <button
                      onClick={() => setAsHero(i)}
                      style={{
                        alignSelf:"flex-start", background:"rgba(34,21,16,0.7)", border:"none",
                        borderRadius:6, color:"#fff", fontSize:9, fontWeight:700, padding:"3px 7px",
                        cursor:"pointer", fontFamily:"inherit",
                      }}
                    >
                      Set hero
                    </button>
                  ) : <div />}
                  <button
                    onClick={() => removeImage(i)}
                    style={{
                      alignSelf:"flex-end", width:24, height:24, borderRadius:6,
                      background:"rgba(239,68,68,0.9)", border:"none",
                      color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
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

// ─── Services Panel ───────────────────────────────────────────────────────────

function ServicesPanel({ businessId, services, setServices }: {
  businessId: string;
  services:   Service[];
  setServices: (s: Service[]) => void;
}) {
  const supabase   = createClient();
  const [adding,   setAdding]   = useState(false);
  const [editing,  setEditing]  = useState<Service | null>(null);
  const [name,     setName]     = useState("");
  const [price,    setPrice]    = useState("");
  const [duration, setDuration] = useState("");
  const [desc,     setDesc]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase.from("services").select("*").eq("business_id", businessId).order("display_order");
    setServices((data as Service[]) || []);
  }

  function startAdd()             { setEditing(null); setName(""); setPrice(""); setDuration(""); setDesc(""); setAdding(true); }
  function startEdit(s: Service)  { setEditing(s); setName(s.name); setPrice(String(s.price)); setDuration(String(s.duration)); setDesc(""); setAdding(true); }
  function cancelAdd()            { setAdding(false); setEditing(null); }

  async function saveService() {
    if (!name.trim() || !price || !duration) return;
    setSaving(true);
    if (editing) {
      await supabase.from("services").update({ name: name.trim(), price: Number(price), duration: Number(duration), description: desc || null }).eq("id", editing.id);
    } else {
      await supabase.from("services").insert({ business_id: businessId, name: name.trim(), price: Number(price), duration: Number(duration), description: desc || null, active: true, display_order: services.length + 1 });
    }
    await reload();
    setSaving(false); setAdding(false); setEditing(null);
  }

  async function confirmDelete(id: string) {
    await supabase.from("services").delete().eq("id", id);
    setDeleteId(null); reload();
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
          <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"var(--color-cream)", borderRadius:10, border:"1.5px solid var(--color-cream-2)", opacity: s.active ? 1 : 0.5 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--color-dark)" }}>{s.name}</div>
              <div style={{ fontSize:12, color:"var(--color-muted)", marginTop:2 }}>{s.duration} min · ₪{s.price}</div>
            </div>
            <button onClick={() => toggleActive(s)} style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, border:"none", cursor:"pointer", background: s.active ? "#D1FAE5" : "var(--color-cream-2)", color: s.active ? "#065F46" : "var(--color-muted)", fontFamily:"inherit" }}>
              {s.active ? "Active" : "Hidden"}
            </button>
            <button onClick={() => startEdit(s)} style={ghostBtn}>Edit</button>
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
              <div><label style={labelStyle}>Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Haircut" style={inputStyle} /></div>
              <div><label style={labelStyle}>Price (₪) *</label><input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="80" style={inputStyle} /></div>
              <div><label style={labelStyle}>Duration (min) *</label><input value={duration} onChange={e => setDuration(e.target.value)} type="number" placeholder="30" style={inputStyle} /></div>
            </div>
            <div><label style={labelStyle}>Description (optional)</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" style={inputStyle} /></div>
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
          <button onClick={startAdd}
            style={{ height:38, borderRadius:10, border:"2px dashed var(--color-cream-2)", background:"transparent", color:"var(--color-muted)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"border-color 0.15s, color 0.15s" }}
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

// ─── Shared UI helpers ────────────────────────────────────────────────────────

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
  fontSize:11, fontWeight:700, color:"var(--color-muted)", textTransform:"uppercase", letterSpacing:"0.05em",
};

const inputStyle: React.CSSProperties = {
  height:44, width:"100%", padding:"0 13px",
  borderRadius:11, border:"1.5px solid var(--color-cream-2)",
  background:"var(--color-cream)", fontSize:14,
  color:"var(--color-dark)", outline:"none",
  fontFamily:"inherit", boxSizing:"border-box", transition:"border-color 0.15s",
};

const ghostBtn: React.CSSProperties = {
  background:"none", border:"none", cursor:"pointer",
  fontSize:12, fontWeight:600, color:"var(--color-muted)",
  padding:"4px 8px", borderRadius:6, fontFamily:"inherit",
};
