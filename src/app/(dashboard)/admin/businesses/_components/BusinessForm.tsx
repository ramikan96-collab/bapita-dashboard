"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service, BusinessHours, DayKey, GoogleReview } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  services: "Services",
  gallery:  "Gallery",
  about:    "About",
  reviews:  "Reviews",
  hours:    "Hours",
  location: "Location",
};
const DEFAULT_SECTION_ORDER = ["services", "gallery", "about", "hours", "location", "reviews"];

const SECTION_KEY_MAP: Record<string, string> = {
  show_services: "services",
  show_gallery:  "gallery",
  show_about:    "about",
  show_reviews:  "reviews",
  show_hours:    "hours",
  show_location: "location",
};

const DAYS: { key: DayKey; label: string }[] = [
  { key: "sunday",    label: "Sunday"    },
  { key: "monday",    label: "Monday"    },
  { key: "tuesday",   label: "Tuesday"   },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday",  label: "Thursday"  },
  { key: "friday",    label: "Friday"    },
  { key: "saturday",  label: "Saturday"  },
];

const DEFAULT_HOURS: BusinessHours = {
  sunday:    { open: true,  start: "09:00", end: "17:00" },
  monday:    { open: true,  start: "09:00", end: "19:00" },
  tuesday:   { open: true,  start: "09:00", end: "19:00" },
  wednesday: { open: true,  start: "09:00", end: "19:00" },
  thursday:  { open: true,  start: "09:00", end: "19:00" },
  friday:    { open: true,  start: "09:00", end: "16:00" },
  saturday:  { open: false, start: "09:00", end: "14:00" },
};

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
  name_he:            string;
  slug:               string;
  template_style:     string;
  default_lang:       string;
  tagline:            string;
  tagline_he:         string;
  phone:              string;
  address:            string;
  email:              string;
  instagram_url:      string;
  facebook_url:       string;
  tiktok_url:         string;
  whatsapp_number:    string;
  google_review_link: string;
  google_maps_url:    string;
  waze_url:           string;
  about_text:         string;
  about_text_he:      string;
  accent_color:       string;
  image_focal:        Record<string, string>;
  show_gallery:       boolean;
  show_about:         boolean;
  show_hours:         boolean;
  show_location:      boolean;
  show_stats:         boolean;
  show_open_status:   boolean;
  show_services:      boolean;
  show_reviews:       boolean;
  status:             "draft" | "live";
  // plan
  plan_tier:          string;
  plan_price:         string;
  plan_addons:        string[];
  plan_booking_limit: string;
  plan_start_date:    string;
  plan_renewal_date:  string;
  plan_setup_price:   string;
  plan_notes:         string;
  stat_years:         string;
  stat_clients:       string;
  stat_rating:        string;
}

interface GalleryItem { url: string; uploading?: boolean; }
interface Variant     { slug: string; template: string; }

interface Stats {
  total:          number;
  thisMonth:      number;
  lastBooking:    string | null;
  activeServices: number;
}

type Tab = "profile" | "gallery" | "services" | "plan" | "hours" | "reviews";

const EMPTY_FORM: FormData = {
  name: "", name_he: "", slug: "", template_style: "classic", default_lang: "he",
  tagline: "", tagline_he: "", phone: "", address: "", email: "",
  instagram_url: "", facebook_url: "", tiktok_url: "", whatsapp_number: "",
  google_review_link: "", google_maps_url: "", waze_url: "",
  about_text: "", about_text_he: "", accent_color: "#B8862A", image_focal: {},
  show_gallery: true, show_about: true, show_hours: true, show_location: true,
  show_stats: true, show_open_status: true, show_services: true, show_reviews: true,
  status: "draft",
  plan_tier: "", plan_price: "", plan_setup_price: "", plan_addons: [],
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
  const [services,      setServices]     = useState<Service[]>([]);
  const [gallery,       setGallery]      = useState<GalleryItem[]>([]);
  const [adminReviews,  setAdminReviews] = useState<GoogleReview[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [hours,        setHours]        = useState<BusinessHours>(DEFAULT_HOURS);
  const [variants,     setVariants]     = useState<Variant[]>([{ slug: "", template: "classic" }]);
  const [stats,        setStats]        = useState<Stats>({ total: 0, thisMonth: 0, lastBooking: null, activeServices: 0 });
  const [tab,          setTab]          = useState<Tab>("profile");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [saved,        setSaved]        = useState(false);
  const [dirty,        setDirty]        = useState(false);
  const [loading,      setLoading]      = useState(mode === "edit");
  const [cloning,          setCloning]          = useState(false);
  const [confirmClone,     setConfirmClone]     = useState(false);
  const [billingEditing,   setBillingEditing]   = useState(false);
  const [showEjectPanel,   setShowEjectPanel]   = useState(false);
  const [copiedStep,       setCopiedStep]       = useState<number | null>(null);
  const [profileImageUrl,  setProfileImageUrl]  = useState<string | null>(null);
  const stableId = useRef<string>(businessId || crypto.randomUUID());

  useEffect(() => {
    if (mode !== "edit" || !businessId) return;
    (async () => {
      const { data: b } = await supabase.from("businesses").select("*").eq("id", businessId).single();
      if (b) {
        setForm({
          name:               b.name               || "",
          name_he:            b.name_he            || "",
          slug:               b.slug               || "",
          template_style:     b.template_style      || "classic",
          default_lang:       b.default_lang        || "he",
          tagline:            b.tagline             || "",
          tagline_he:         b.tagline_he          || "",
          phone:              b.phone               || "",
          address:            b.address             || "",
          email:              b.email               || "",
          instagram_url:      b.instagram_url       || "",
          facebook_url:       b.facebook_url        || "",
          tiktok_url:         (b as unknown as { tiktok_url?: string | null }).tiktok_url || "",
          whatsapp_number:    b.whatsapp_number     || "",
          google_review_link: b.google_review_link  || "",
          google_maps_url:    b.google_maps_url     || "",
          waze_url:           b.waze_url            || "",
          about_text:         b.about_text          || "",
          about_text_he:      b.about_text_he       || "",
          accent_color:       b.accent_color        || "#B8862A",
          image_focal:        (b.image_focal as Record<string, string>) || {},
          show_gallery:       b.show_gallery        ?? true,
          show_about:         b.show_about          ?? true,
          show_hours:         b.show_hours          ?? true,
          show_location:      b.show_location       ?? true,
          show_stats:         b.show_stats          ?? true,
          show_open_status:   b.show_open_status    ?? true,
          show_services:      b.show_services       ?? true,
          show_reviews:       b.show_reviews        ?? true,
          status:             b.status              || "draft",
          plan_tier:          b.plan_tier           || "",
          plan_price:         b.plan_price != null   ? String(b.plan_price) : "",
          plan_setup_price:   (b as unknown as { plan_setup_price?: number | null }).plan_setup_price != null ? String((b as unknown as { plan_setup_price?: number | null }).plan_setup_price) : "",
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
        setProfileImageUrl((b as unknown as { profile_image_url?: string | null }).profile_image_url || null);
        // Section order — merge DB order with missing keys, filter by show_* flags
        const showFlags: Record<string, boolean> = {
          services: b.show_services ?? true,
          gallery:  b.show_gallery  ?? true,
          about:    b.show_about    ?? true,
          reviews:  b.show_reviews  ?? true,
          hours:    b.show_hours    ?? true,
          location: b.show_location ?? true,
        };
        const soBase = Array.isArray(b.section_order) && b.section_order.length > 0
          ? b.section_order as string[]
          : DEFAULT_SECTION_ORDER;
        const soMissing = DEFAULT_SECTION_ORDER.filter(k => !soBase.includes(k));
        const soMerged = soMissing.length ? [...soBase, ...soMissing] : soBase;
        setSectionOrder(soMerged.filter(k => showFlags[k] !== false));
        // Hours
        if (b.business_hours) setHours(b.business_hours as BusinessHours);
        // Reviews
        if (Array.isArray(b.google_reviews)) setAdminReviews(b.google_reviews as GoogleReview[]);
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

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setDirty(true);
    setForm(f => ({ ...f, [key]: value }));
    if (key === "name" && mode === "new") {
      const slug = (value as string).toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
      setForm(f => ({ ...f, name: value as string, slug }));
      setVariants(vs => vs.map((v, i) => i === 0 ? { ...v, slug } : v));
    }
  }

  function toggleSection(key: keyof FormData) {
    const isOn = form[key] as boolean;
    setDirty(true);
    setForm(f => ({ ...f, [key]: !f[key] }));
    const sectionKey = SECTION_KEY_MAP[key as string];
    if (!sectionKey) return;
    if (isOn) {
      setSectionOrder(o => o.filter(k => k !== sectionKey));
    } else {
      setSectionOrder(o => {
        if (o.includes(sectionKey)) return o;
        const defaultIdx = DEFAULT_SECTION_ORDER.indexOf(sectionKey);
        const predecessors = DEFAULT_SECTION_ORDER.slice(0, defaultIdx).filter(k => o.includes(k));
        if (predecessors.length === 0) return [sectionKey, ...o];
        const afterKey = predecessors[predecessors.length - 1];
        const afterIdx = o.indexOf(afterKey);
        const next = [...o];
        next.splice(afterIdx + 1, 0, sectionKey);
        return next;
      });
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
    setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setSaving(false); return; }

    const urls = gallery.filter(g => !g.uploading && g.url).map(g => g.url);

    const basePayload = {
      name:               form.name.trim(),
      name_he:            form.name_he            || null,
      default_lang:       form.default_lang       || "he",
      tagline:            form.tagline            || null,
      tagline_he:         form.tagline_he         || null,
      phone:              form.phone              || null,
      address:            form.address            || null,
      email:              form.email              || null,
      instagram_url:      form.instagram_url      || null,
      facebook_url:       form.facebook_url       || null,
      tiktok_url:         form.tiktok_url         || null,
      whatsapp_number:    form.whatsapp_number    || null,
      google_review_link: form.google_review_link || null,
      google_maps_url:    form.google_maps_url    || null,
      waze_url:           form.waze_url           || null,
      about_text:         form.about_text         || null,
      about_text_he:      form.about_text_he      || null,
      accent_color:       form.accent_color       || null,
      show_gallery:       form.show_gallery,
      show_about:         form.show_about,
      show_hours:         form.show_hours,
      show_location:      form.show_location,
      show_stats:         form.show_stats,
      show_open_status:   form.show_open_status,
      show_services:      form.show_services,
      show_reviews:       form.show_reviews,
      status:             form.status,
      gallery_images:     urls,
      hero_image_url:     urls[0]                 || null,
      profile_image_url:  profileImageUrl         || null,
      image_focal:        form.image_focal,
      section_order:      sectionOrder,
      plan_tier:          form.plan_tier           || null,
      plan_price:         form.plan_price          ? Number(form.plan_price) : null,
      plan_setup_price:   form.plan_setup_price    ? Number(form.plan_setup_price) : null,
      plan_addons:        form.plan_addons,
      plan_booking_limit: form.plan_booking_limit  ? Number(form.plan_booking_limit) : null,
      plan_start_date:    form.plan_start_date     || null,
      plan_renewal_date:  form.plan_renewal_date   || null,
      plan_notes:         form.plan_notes          || null,
      stat_years:         form.stat_years   ? Number(form.stat_years)   : null,
      stat_clients:       form.stat_clients ? Number(form.stat_clients) : null,
      stat_rating:        form.stat_rating          || null,
      business_hours:     hours,
    };

    if (mode === "new") {
      // Validate variants
      const slugs = variants.map(v => v.slug.trim());
      if (slugs.some(s => !s)) { setError("All slugs are required"); setSaving(false); return; }
      const unique = new Set(slugs);
      if (unique.size !== slugs.length) { setError("Slugs must be unique"); setSaving(false); return; }

      // Insert one business row per variant
      const firstSlug = slugs[0];
      for (const v of variants) {
        const { error: e } = await supabase.from("businesses").insert({
          ...basePayload,
          slug:           v.slug.trim(),
          template_style: v.template,
          owner_id:       user.id,
        });
        if (e) { setError(`Slug "${v.slug}": ${e.message}`); setSaving(false); return; }
      }
      setSaving(false); setSaved(true); setDirty(false);
      setTimeout(() => setSaved(false), 2000);
      onSaved(firstSlug);
    } else {
      if (!form.slug.trim()) { setError("Slug is required"); setSaving(false); return; }
      const payload = { ...basePayload, slug: form.slug.trim(), template_style: form.template_style };
      // Admins have a full-access RLS policy (public.is_admin()), so the browser
      // client can update businesses they don't own.
      const { error: e } = await supabase.from("businesses").update(payload).eq("id", businessId!);
      if (e) { setError(e.message); setSaving(false); return; }
      setSaving(false); setSaved(true); setDirty(false);
      setTimeout(() => setSaved(false), 2000);
      onSaved(form.slug);
    }
  }

  async function handleClone() {
    const slugs = variants.map(v => v.slug.trim());
    if (slugs.some(s => !s)) { setError("All slugs are required"); return; }
    const unique = new Set(slugs);
    if (unique.size !== slugs.length) { setError("Slugs must be unique"); return; }
    setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setSaving(false); return; }
    const urls = gallery.filter(g => !g.uploading && g.url).map(g => g.url);
    const basePayload = {
      name:               form.name.trim(),
      name_he:            form.name_he            || null,
      default_lang:       form.default_lang       || "he",
      tagline:            form.tagline            || null,
      tagline_he:         form.tagline_he         || null,
      phone:              form.phone              || null,
      address:            form.address            || null,
      email:              form.email              || null,
      instagram_url:      form.instagram_url      || null,
      facebook_url:       form.facebook_url       || null,
      tiktok_url:         form.tiktok_url         || null,
      whatsapp_number:    form.whatsapp_number    || null,
      google_review_link: form.google_review_link || null,
      google_maps_url:    form.google_maps_url    || null,
      waze_url:           form.waze_url           || null,
      about_text:         form.about_text         || null,
      about_text_he:      form.about_text_he      || null,
      accent_color:       form.accent_color       || null,
      show_gallery:       form.show_gallery,
      show_about:         form.show_about,
      show_hours:         form.show_hours,
      show_location:      form.show_location,
      show_stats:         form.show_stats,
      show_open_status:   form.show_open_status,
      show_services:      form.show_services,
      show_reviews:       form.show_reviews,
      status:             "draft" as const,
      gallery_images:     urls,
      hero_image_url:     urls[0]                 || null,
      profile_image_url:  profileImageUrl         || null,
      image_focal:        form.image_focal,
      section_order:      sectionOrder,
      plan_tier:          form.plan_tier           || null,
      plan_price:         form.plan_price          ? Number(form.plan_price) : null,
      plan_setup_price:   form.plan_setup_price    ? Number(form.plan_setup_price) : null,
      plan_addons:        form.plan_addons,
      plan_booking_limit: form.plan_booking_limit  ? Number(form.plan_booking_limit) : null,
      plan_start_date:    form.plan_start_date     || null,
      plan_renewal_date:  form.plan_renewal_date   || null,
      plan_notes:         form.plan_notes          || null,
      stat_years:         form.stat_years   ? Number(form.stat_years)   : null,
      stat_clients:       form.stat_clients ? Number(form.stat_clients) : null,
      stat_rating:        form.stat_rating          || null,
      business_hours:     hours,
    };
    for (const v of variants) {
      const { error: e } = await supabase.from("businesses").insert({
        ...basePayload,
        slug:           v.slug.trim(),
        template_style: v.template,
        owner_id:       user.id,
      });
      if (e) { setError(`Slug "${v.slug}": ${e.message}`); setSaving(false); return; }
    }
    setSaving(false);
    onSaved(variants[0].slug);
  }

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"var(--color-muted)", fontSize:14 }}>
        Loading…
      </div>
    );
  }

  const title      = cloning
    ? `Clone: ${form.name || "Business"}`
    : mode === "new"
      ? (variants.length > 1 ? `New Business × ${variants.length}` : "New Business")
      : (form.name || "Business");
  const previewUrl = form.slug ? `https://book.bapita.com/${form.slug}` : null;

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "gallery", label: `Gallery${gallery.filter(g => !g.uploading).length > 0 ? ` (${gallery.filter(g => !g.uploading).length})` : ""}` },
    ...(mode === "edit" ? [
      { id: "services" as Tab, label: `Services (${services.length})`                        },
      { id: "hours"    as Tab, label: "Hours"                                                },
      { id: "reviews"  as Tab, label: `Reviews (${adminReviews.length})`                    },
      { id: "plan"     as Tab, label: "Stats"                                               },
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

          {cloning ? (
            <>
              <button
                onClick={() => { setCloning(false); setVariants([{ slug: "", template: "classic" }]); setError(""); }}
                style={{ height:32, padding:"0 12px", borderRadius:9, border:"1.5px solid var(--color-cream-2)", background:"var(--color-cream)", color:"var(--color-muted)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={saving}
                style={{ height:32, padding:"0 16px", borderRadius:9, border:"none", flexShrink:0, background:"var(--color-amber)", color:"#fff", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1, fontFamily:"inherit", boxShadow:"0 2px 8px rgba(232,146,10,0.25)" }}
              >
                {saving ? "Creating…" : `Create ${variants.length > 1 ? `${variants.length} Copies` : "Copy"}`}
              </button>
            </>
          ) : (
            <>
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

              {/* Save & Preview */}
              {previewUrl && (
                <button
                  onClick={async () => { await handleSave(); window.open(previewUrl, "_blank"); }}
                  disabled={saving}
                  style={{
                    height:32, padding:"0 12px", borderRadius:9, border:"1.5px solid var(--color-cream-2)",
                    background:"var(--color-cream)", color:"var(--color-dark)",
                    fontSize:12, fontWeight:700, flexShrink:0, cursor: saving ? "not-allowed" : "pointer",
                    display:"flex", alignItems:"center", gap:5, transition:"border-color 0.15s",
                    fontFamily:"inherit", opacity: saving ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--color-amber)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--color-cream-2)"; }}
                >
                  Save & Preview ↗
                </button>
              )}

              {/* Dirty indicator */}
              {dirty && !saving && !saved && (
                <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--color-amber)", flexShrink:0 }} />
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
            </>
          )}
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
                  {mode === "edit" && (
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
                  )}
                </Row>
                {mode === "edit" && (
                  <>
                    <Row>
                      <Field label="Template">
                        <select value={form.template_style} onChange={e => set("template_style", e.target.value)} style={inputStyle}>
                          <option value="classic">Classic (cream/gold)</option>
                          <option value="clean">Clean (white/black)</option>
                          <option value="dark">Dark (dark/gold)</option>
                        </select>
                      </Field>
                      {!cloning && !confirmClone && (
                        <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:2 }}>
                          <button
                            onClick={() => setConfirmClone(true)}
                            style={{ height:34, padding:"0 14px", borderRadius:8, border:"1.5px solid #2563EB", background:"transparent", color:"#2563EB", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", whiteSpace:"nowrap" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#2563EB"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#2563EB"; }}
                          >Clone</button>
                        </div>
                      )}
                    </Row>
                    {!cloning && confirmClone && (
                      <div style={{ background:"#FEF3C7", borderRadius:11, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, border:"1px solid #FDE68A" }}>
                        <span style={{ fontSize:13, color:"#92400E", fontWeight:600 }}>
                          Duplicate all data to new pages? They start as draft. Original untouched.
                        </span>
                        <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                          <button
                            onClick={() => { setConfirmClone(false); setCloning(true); setVariants([{ slug: "", template: form.template_style || "classic" }]); }}
                            style={{ height:30, padding:"0 14px", borderRadius:8, border:"none", background:"var(--color-amber)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
                          >Yes, Clone</button>
                          <button
                            onClick={() => setConfirmClone(false)}
                            style={{ height:30, padding:"0 12px", borderRadius:8, border:"1.5px solid #FDE68A", background:"transparent", color:"#92400E", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}
                          >Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Eject to custom page */}
                {mode === "edit" && (
                  <div style={{ marginTop: 4, marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowEjectPanel(p => !p)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-muted)", padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {showEjectPanel ? "▾" : "▸"} Eject to custom page
                    </button>
                    {showEjectPanel && (() => {
                      const sl = form.slug || "your-slug";
                      const tmpl = form.template_style || "classic";
                      const bizName = form.name || sl;
                      const steps = [
                        `cd /Users/admin/Desktop/bapita-dashboard`,
                        `npm run eject ${sl} --from ${tmpl}`,
                        `git add -A && git commit -m "feat: custom page for ${sl}" && git push`,
                      ];
                      const claudePrompt = `Customize the booking page at \`src/app/[slug]/customs/${sl}.tsx\` for the business "${bizName}". Keep it wired to the platform: do not change the booking flow — keep importing and using \`BookingOverlay\` and the shared section components, keep RTL + EN/HE support and the lang toggle. Make the design bespoke and premium for this business. Start by reading the file and the shared primitives in \`src/app/[slug]/_shared/\`, then propose changes.`;
                      function copy(text: string, step: number) {
                        navigator.clipboard.writeText(text);
                        setCopiedStep(step);
                        setTimeout(() => setCopiedStep(null), 1800);
                      }
                      return (
                        <div style={{ marginTop: 10, background: "var(--color-surface)", border: "1.5px solid var(--color-cream-2)", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                          <p style={{ margin: 0, fontSize: 12, color: "var(--color-muted)", lineHeight: 1.6 }}>
                            Run these commands locally to create a fully custom page for <strong>{sl}</strong>. After that, open Claude Code and paste the prompt below.
                          </p>
                          {steps.map((cmd, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-amber)", minWidth: 18, marginTop: 10 }}>{i + 1}.</span>
                              <code style={{ flex: 1, fontSize: 12, background: "#1a1a1a", color: "#e8e8e8", padding: "8px 12px", borderRadius: 8, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.5 }}>{cmd}</code>
                              <button
                                type="button"
                                onClick={() => copy(cmd, i + 1)}
                                style={{ marginTop: 6, height: 28, padding: "0 10px", borderRadius: 7, border: "1.5px solid var(--color-cream-2)", background: copiedStep === i + 1 ? "#D1FAE5" : "var(--color-bg)", color: copiedStep === i + 1 ? "#065F46" : "var(--color-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0 }}
                              >
                                {copiedStep === i + 1 ? "Copied!" : "Copy"}
                              </button>
                            </div>
                          ))}
                          <div style={{ borderTop: "1px solid var(--color-cream-2)", paddingTop: 10, marginTop: 2 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Claude Code prompt</div>
                            <div style={{ fontSize: 12, color: "var(--color-muted)", lineHeight: 1.6, background: "var(--color-bg)", border: "1px solid var(--color-cream-2)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                              {claudePrompt}
                            </div>
                            <button
                              type="button"
                              onClick={() => copy(claudePrompt, 99)}
                              style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "none", background: "var(--color-amber)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                            >
                              {copiedStep === 99 ? "Copied!" : "Copy Claude Code prompt"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Batch variants — new mode or cloning */}
                {(mode === "new" || cloning) && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--color-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>
                      Templates & URLs
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {variants.map((v, i) => (
                        <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                          {/* Slug */}
                          <div style={{ flex:1 }}>
                            <input
                              value={v.slug}
                              onChange={e => {
                                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                                setDirty(true);
                                setVariants(vs => vs.map((x, j) => j === i ? { ...x, slug } : x));
                              }}
                              placeholder={`studio-avi${i > 0 ? `-${["clean","dark","v2"][i-1]}` : ""}`}
                              style={inputStyle}
                            />
                            {v.slug && (
                              <div style={{ fontSize:10, color:"var(--color-muted)", marginTop:3 }}>
                                book.bapita.com/<strong style={{ color:"var(--color-amber)" }}>{v.slug}</strong>
                              </div>
                            )}
                          </div>
                          {/* Template */}
                          <div style={{ flexShrink:0, width:160 }}>
                            <select
                              value={v.template}
                              onChange={e => {
                                setDirty(true);
                                setVariants(vs => vs.map((x, j) => j === i ? { ...x, template: e.target.value } : x));
                              }}
                              style={inputStyle}
                            >
                              <option value="classic">Classic</option>
                              <option value="clean">Clean</option>
                              <option value="dark">Dark</option>
                            </select>
                          </div>
                          {/* Remove */}
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setVariants(vs => vs.filter((_, j) => j !== i))}
                              style={{ height:42, width:36, borderRadius:9, border:"1.5px solid var(--color-cream-2)", background:"transparent", color:"var(--color-muted)", cursor:"pointer", fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}
                              title="Remove"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {variants.length < 4 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDirty(true);
                          const tmpl = ["classic","clean","dark","classic"].find(t => !variants.some(v => v.template === t)) || "classic";
                          setVariants(vs => [...vs, { slug: "", template: tmpl }]);
                        }}
                        style={{ marginTop:10, height:34, padding:"0 14px", borderRadius:9, border:"1.5px dashed var(--color-cream-2)", background:"transparent", color:"var(--color-muted)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"border-color 0.15s, color 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor="var(--color-amber)"; e.currentTarget.style.color="var(--color-amber)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor="var(--color-cream-2)"; e.currentTarget.style.color="var(--color-muted)"; }}
                      >
                        + Add template
                      </button>
                    )}
                    {variants.length > 1 && (
                      <p style={{ fontSize:11, color:"var(--color-muted)", marginTop:8, marginBottom:0 }}>
                        Creates {variants.length} separate business pages with shared data.
                      </p>
                    )}
                  </div>
                )}

                <Row>
                  <Field label="Default Language">
                    <select value={form.default_lang} onChange={e => set("default_lang", e.target.value)} style={inputStyle}>
                      <option value="he">Hebrew (עברית)</option>
                      <option value="en">English</option>
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
                  <Field label="Tagline (EN)">
                    <input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Precision cuts. No waiting." style={inputStyle} />
                  </Field>
                  <Field label="Tagline (HE) — תגית">
                    <input value={form.tagline_he} onChange={e => set("tagline_he", e.target.value)} placeholder="תספורת מדויקת. ללא המתנה." style={{ ...inputStyle, direction:"rtl" }} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Phone">
                    <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+972-50-0000000" style={inputStyle} />
                  </Field>
                  <Field label="Business Name (HE) — שם בעברית">
                    <input value={form.name_he} onChange={e => set("name_he", e.target.value)} placeholder="סטודיו אבי" style={{ ...inputStyle, direction:"rtl" }} />
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

              <SectionCard title="Booking Page Stats">
                <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:0, marginBottom:16 }}>
                  Shown as social proof on the booking page. Leave blank to hide.
                </p>
                <Row>
                  <Field label="Total Clients">
                    <input type="number" min="0" value={form.stat_clients} onChange={e => set("stat_clients", e.target.value)} placeholder="500" style={inputStyle} />
                  </Field>
                  <Field label="Google Rating">
                    <input value={form.stat_rating} onChange={e => set("stat_rating", e.target.value)} placeholder="4.9" style={inputStyle} />
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
                  <Field label="TikTok">
                    <input value={form.tiktok_url} onChange={e => set("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@studioavi" style={inputStyle} />
                  </Field>
                </Row>
                <Row>
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
                <Field label="About (EN)">
                  <textarea value={form.about_text} onChange={e => set("about_text", e.target.value)}
                    placeholder="Studio Avi has been serving Tel Aviv since 2018…"
                    rows={4}
                    style={{ ...inputStyle, height:"auto", resize:"vertical", padding:"10px 13px", lineHeight:1.6 }}
                  />
                </Field>
                <Field label="About (HE) — טקסט אודות">
                  <textarea value={form.about_text_he} onChange={e => set("about_text_he", e.target.value)}
                    placeholder="סטודיו אבי משרת את תל אביב מאז 2018…"
                    rows={4}
                    style={{ ...inputStyle, height:"auto", resize:"vertical", padding:"10px 13px", lineHeight:1.6, direction:"rtl" }}
                  />
                </Field>
              </SectionCard>

              <SectionCard title="Section Visibility & Order">
                <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:0, marginBottom:16 }}>
                  Toggle visibility. Drag to reorder on the booking page.
                </p>
                <SectionReorder order={sectionOrder} setOrder={setSectionOrder} />
                <div style={{ height:1, background:"var(--color-cream-2)", margin:"16px 0" }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {([
                    ["show_services", "Services"],
                    ["show_stats",    "Stats (hero)"],
                    ["show_open_status", "Open/Closed (hero)"],
                    ["show_gallery",  "Gallery"],
                    ["show_about",    "About"],
                    ["show_reviews",  "Reviews"],
                    ["show_hours",    "Business Hours"],
                    ["show_location", "Location"],
                  ] as [keyof FormData, string][]).map(([key, label]) => (
                    <label key={key} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                      <div
                        onClick={() => toggleSection(key)}
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
            <GalleryManager gallery={gallery} setGallery={setGallery} businessId={stableId.current} focal={form.image_focal} setFocal={f => set("image_focal", f)} profileImageUrl={profileImageUrl} setProfileImageUrl={setProfileImageUrl} />
          )}

          {/* ── SERVICES ── */}
          {tab === "services" && mode === "edit" && businessId && (
            <ServicesPanel businessId={businessId} services={services} setServices={setServices} />
          )}

          {/* ── HOURS ── */}
          {tab === "hours" && mode === "edit" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <SectionCard title="Working days">
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {DAYS.map(({ key, label }) => {
                    const on = hours[key].open;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setHours(h => ({ ...h, [key]: { ...h[key], open: !on } }))}
                        style={{
                          padding:"8px 16px", borderRadius:12, border:"none", cursor:"pointer",
                          fontSize:14, fontWeight:600, fontFamily:"inherit", transition:"all 0.15s",
                          background: on ? "var(--color-amber)" : "var(--color-cream-2)",
                          color:      on ? "#fff"               : "var(--color-muted)",
                        }}
                      >
                        {label.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize:12, color:"var(--color-muted)", margin:0 }}>Tap a day to toggle it on or off</p>
              </SectionCard>

              {(() => {
                const openDays = DAYS.filter(d => hours[d.key].open);
                if (openDays.length === 0) return (
                  <div style={{ background:"var(--color-surface)", borderRadius:16, padding:"28px 20px", textAlign:"center", boxShadow:"var(--shadow-sm)", border:"1px solid var(--color-cream-2)" }}>
                    <p style={{ fontSize:13, color:"var(--color-muted)", margin:0 }}>No working days selected — enable at least one day above</p>
                  </div>
                );
                return (
                  <SectionCard title="Hours">
                    <div>
                      {openDays.map(({ key, label }, idx) => (
                        <div
                          key={key}
                          style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0",
                            borderBottom: idx < openDays.length - 1 ? "1px solid var(--color-cream-2)" : "none" }}
                        >
                          <span style={{ width:90, fontSize:14, fontWeight:600, color:"var(--color-dark)", flexShrink:0 }}>{label}</span>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                            <input
                              type="time"
                              value={hours[key].start}
                              onChange={e => setHours(h => ({ ...h, [key]: { ...h[key], start: e.target.value } }))}
                              style={{ height:38, padding:"0 10px", borderRadius:9, border:"1.5px solid var(--color-cream-2)", fontSize:13, color:"var(--color-dark)", outline:"none", background:"var(--color-cream)", fontFamily:"inherit" }}
                              onFocus={e => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                              onBlur={e  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                            />
                            <span style={{ fontSize:13, color:"var(--color-muted)" }}>–</span>
                            <input
                              type="time"
                              value={hours[key].end}
                              onChange={e => setHours(h => ({ ...h, [key]: { ...h[key], end: e.target.value } }))}
                              style={{ height:38, padding:"0 10px", borderRadius:9, border:"1.5px solid var(--color-cream-2)", fontSize:13, color:"var(--color-dark)", outline:"none", background:"var(--color-cream)", fontFamily:"inherit" }}
                              onFocus={e => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                              onBlur={e  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {openDays.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const first = DAYS.find(d => hours[d.key].open);
                          if (!first) return;
                          const { start, end } = hours[first.key];
                          setHours(h => {
                            const next = { ...h };
                            DAYS.forEach(({ key }) => { if (next[key].open) next[key] = { ...next[key], start, end }; });
                            return next;
                          });
                        }}
                        style={{ width:"100%", height:38, borderRadius:10, fontSize:13, fontWeight:500, color:"var(--color-muted)", border:"1.5px solid var(--color-cream-2)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"border-color 0.15s, color 0.15s", fontFamily:"inherit" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-muted)"; }}
                      >
                        Apply first day&apos;s hours to all open days
                      </button>
                    )}
                  </SectionCard>
                );
              })()}
            </div>
          )}

          {/* ── REVIEWS ── */}
          {tab === "reviews" && mode === "edit" && businessId && (
            <AdminReviewsPanel
              businessId={businessId}
              supabase={supabase}
              reviews={adminReviews}
              showReviews={form.show_reviews}
              onReviewsChange={setAdminReviews}
              onToggleShow={() => set("show_reviews", !form.show_reviews)}
            />
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

              {/* Billing */}
              {(() => {
                const billingLocked = !billingEditing && (!!form.plan_price || !!form.plan_setup_price);
                return (
                  <SectionCard title="Billing — Internal">
                    <p style={{ fontSize:12, color:"var(--color-muted)", marginTop:0, marginBottom:12, fontStyle:"italic" }}>
                      Not visible to the barber.
                    </p>
                    {billingLocked ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div>
                            <div style={{ fontSize:10, color:"var(--color-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Monthly</div>
                            <div style={{ fontSize:20, fontWeight:900, color:"var(--color-dark)", lineHeight:1 }}>{form.plan_price ? `₪${form.plan_price}` : "—"}<span style={{ fontSize:11, fontWeight:500, color:"var(--color-muted)" }}>/mo</span></div>
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:"var(--color-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Setup</div>
                            <div style={{ fontSize:20, fontWeight:900, color:"var(--color-dark)", lineHeight:1 }}>{form.plan_setup_price ? `₪${form.plan_setup_price}` : "—"}</div>
                          </div>
                        </div>
                        {form.plan_notes && <div style={{ fontSize:13, color:"var(--color-muted)", lineHeight:1.5 }}>{form.plan_notes}</div>}
                        <button onClick={() => setBillingEditing(true)} style={{ alignSelf:"flex-start", height:30, padding:"0 14px", borderRadius:8, border:"1.5px solid var(--color-cream-2)", background:"transparent", color:"var(--color-muted)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="var(--color-amber)"; e.currentTarget.style.color="var(--color-amber)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor="var(--color-cream-2)"; e.currentTarget.style.color="var(--color-muted)"; }}
                        >Edit billing</button>
                      </div>
                    ) : (
                      <>
                        <Row>
                          <Field label="Monthly Price (₪)">
                            <input value={form.plan_price} onChange={e => set("plan_price", e.target.value)}
                              type="number" placeholder="299" style={inputStyle} />
                          </Field>
                          <Field label="Setup Fee (₪)">
                            <input value={form.plan_setup_price} onChange={e => set("plan_setup_price", e.target.value)}
                              type="number" placeholder="500" style={inputStyle} />
                          </Field>
                        </Row>
                        <Field label="Internal Notes">
                          <textarea
                            value={form.plan_notes}
                            onChange={e => set("plan_notes", e.target.value)}
                            placeholder="e.g. Pays on the 1st. Wants to add WhatsApp next month."
                            rows={3}
                            style={{ ...inputStyle, height:"auto", resize:"vertical", padding:"10px 13px", lineHeight:1.6 }}
                          />
                        </Field>
                      </>
                    )}
                  </SectionCard>
                );
              })()}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Admin Reviews Panel ──────────────────────────────────────────────────────

function AdminReviewsPanel({
  businessId,
  supabase,
  reviews,
  showReviews,
  onReviewsChange,
  onToggleShow,
}: {
  businessId: string;
  supabase: ReturnType<typeof createClient>;
  reviews: GoogleReview[];
  showReviews: boolean;
  onReviewsChange: (r: GoogleReview[]) => void;
  onToggleShow: () => void;
}) {
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [author, setAuthor]       = useState("");
  const [rating, setRating]       = useState(5);
  const [text, setText]           = useState("");
  const [date, setDate]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  function resetForm() { setShowForm(false); setEditingId(null); setAuthor(""); setRating(5); setText(""); setDate(""); setErr(""); }

  function startEdit(r: GoogleReview) { setEditingId(r.id); setAuthor(r.author); setRating(r.rating); setText(r.text); setDate(r.date || ""); setShowForm(true); }

  async function saveReview() {
    if (!author.trim() || !text.trim()) { setErr("Author and text required"); return; }
    setSaving(true);
    const updated = editingId
      ? reviews.map(r => r.id === editingId ? { ...r, author: author.trim(), rating, text: text.trim(), date: date.trim() } : r)
      : [...reviews, { id: crypto.randomUUID(), author: author.trim(), rating, text: text.trim(), date: date.trim() }];
    const { error } = await supabase.from("businesses").update({ google_reviews: updated }).eq("id", businessId);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onReviewsChange(updated);
    resetForm();
  }

  async function deleteReview(id: string) {
    const updated = reviews.filter(r => r.id !== id);
    await supabase.from("businesses").update({ google_reviews: updated }).eq("id", businessId);
    onReviewsChange(updated);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <SectionCard title="Display">
        <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--color-dark)" }}>Show reviews section</div>
            <div style={{ fontSize:12, color:"var(--color-muted)", marginTop:2 }}>Visible on booking page</div>
          </div>
          <input type="checkbox" checked={showReviews} onChange={onToggleShow} style={{ width:16, height:16, accentColor:"var(--color-amber)", cursor:"pointer" }} />
        </label>
      </SectionCard>

      <SectionCard title={`Reviews (${reviews.length})`}>
        {reviews.length === 0 && !showForm && (
          <p style={{ fontSize:13, color:"var(--color-muted)", margin:0 }}>No reviews yet.</p>
        )}
        {reviews.map(r => (
          <div key={r.id} style={{ border:"1px solid var(--color-cream-2)", borderRadius:10, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"var(--color-dark)" }}>{r.author}</span>
                <span style={{ fontSize:12, color:"#F59E0B" }}>{"★".repeat(r.rating)}</span>
                {r.date && <span style={{ fontSize:11, color:"var(--color-muted)" }}>{r.date}</span>}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => startEdit(r)} style={{ fontSize:12, fontWeight:600, color:"var(--color-amber)", background:"none", border:"none", cursor:"pointer" }}>Edit</button>
                <button onClick={() => deleteReview(r.id)} style={{ fontSize:12, fontWeight:600, color:"#EF4444", background:"none", border:"none", cursor:"pointer" }}>Delete</button>
              </div>
            </div>
            <p style={{ fontSize:13, color:"var(--color-dark)", opacity:0.75, margin:0, lineHeight:1.5 }}>{r.text}</p>
          </div>
        ))}

        {showForm && (
          <div style={{ border:"1.5px solid var(--color-amber)", borderRadius:11, padding:"14px", display:"flex", flexDirection:"column", gap:12 }}>
            {err && <p style={{ fontSize:12, color:"#EF4444", margin:0 }}>{err}</p>}
            <Field label="Client name">
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. David Cohen" style={inputStyle} />
            </Field>
            <Field label="Rating">
              <div style={{ display:"flex", gap:6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRating(n)} style={{ width:36, height:36, borderRadius:8, border:"1.5px solid", borderColor: n <= rating ? "#F59E0B" : "var(--color-cream-2)", background: n <= rating ? "#FEF3C7" : "transparent", fontSize:16, cursor:"pointer" }}>★</button>
                ))}
              </div>
            </Field>
            <Field label="Review text">
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste the review here…" rows={3} style={{ ...inputStyle, height:"auto", resize:"vertical", padding:"10px 13px", lineHeight:1.5 }} />
            </Field>
            <Field label="Date (optional)">
              <input value={date} onChange={e => setDate(e.target.value)} placeholder="e.g. June 2025" style={inputStyle} />
            </Field>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={saveReview} disabled={saving} style={{ flex:1, height:36, borderRadius:9, border:"none", background:"var(--color-amber)", color:"#fff", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.6:1, fontFamily:"inherit" }}>
                {saving ? "Saving…" : editingId ? "Update" : "Add review"}
              </button>
              <button onClick={resetForm} style={{ height:36, padding:"0 14px", borderRadius:9, border:"1.5px solid var(--color-cream-2)", background:"transparent", fontSize:13, fontWeight:600, color:"var(--color-muted)", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            </div>
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{ width:"100%", height:38, borderRadius:9, border:"1.5px dashed var(--color-cream-2)", background:"transparent", fontSize:13, fontWeight:600, color:"var(--color-muted)", cursor:"pointer", fontFamily:"inherit", transition:"border-color 0.15s, color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--color-amber)"; e.currentTarget.style.color="var(--color-amber)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--color-cream-2)"; e.currentTarget.style.color="var(--color-muted)"; }}
          >
            + Add review
          </button>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Section Reorder ──────────────────────────────────────────────────────────

function SectionReorder({ order, setOrder }: { order: string[]; setOrder: (o: string[]) => void }) {
  const dragIdx      = useRef<number | null>(null);
  const touchStartY  = useRef<number>(0);
  const itemHeight   = useRef<number>(46); // approx row height + gap
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

  function onTouchStart(e: React.TouchEvent, i: number) {
    dragIdx.current = i;
    touchStartY.current = e.touches[0].clientY;
    const el = e.currentTarget as HTMLElement;
    itemHeight.current = el.offsetHeight + 6;
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (dragIdx.current === null) return;
    const deltaY  = e.touches[0].clientY - touchStartY.current;
    const target  = Math.round(dragIdx.current + deltaY / itemHeight.current);
    setDragOver(Math.max(0, Math.min(order.length - 1, target)));
  }

  function onTouchEnd() {
    if (dragIdx.current !== null && dragOver !== null && dragOver !== dragIdx.current) {
      const next = [...order];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(dragOver, 0, moved);
      setOrder(next);
    }
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
          onTouchStart={e => onTouchStart(e, i)}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
            background:"var(--color-cream)", borderRadius:9,
            border: `1.5px solid ${dragOver === i ? "var(--color-amber)" : "var(--color-cream-2)"}`,
            cursor:"grab", transition:"border-color 0.15s",
            opacity: dragOver === i ? 0.7 : 1,
            touchAction: "none",
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

function GalleryManager({ gallery, setGallery, businessId, focal, setFocal, profileImageUrl, setProfileImageUrl }: {
  gallery:    GalleryItem[];
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  businessId?: string;
  focal:    Record<string, string>;
  setFocal: (f: Record<string, string>) => void;
  profileImageUrl:    string | null;
  setProfileImageUrl: (url: string | null) => void;
}) {
  const supabase  = createClient();
  const inputRef  = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const dragIdx   = useRef<number | null>(null);
  const [dragOver,  setDragOver]  = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [focalEditUrl, setFocalEditUrl] = useState<string | null>(null);
  const [profileUploading, setProfileUploading] = useState(false);

  async function uploadProfileImage(file: File) {
    setProfileUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `profiles/${businessId || "temp"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("business-images").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("business-images").getPublicUrl(path);
      setProfileImageUrl(data.publicUrl);
    }
    setProfileUploading(false);
  }

  function setImageFocal(url: string, value: string) {
    setFocal({ ...focal, [url]: value });
  }
  function onFocalClick(e: React.MouseEvent<HTMLDivElement>, url: string) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width)  * 100);
    const y = Math.round(((e.clientY - r.top)  / r.height) * 100);
    setImageFocal(url, `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`);
  }

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
    <>
    {/* ── Profile photo ── */}
    <SectionCard title="Profile photo">
      <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:0, marginBottom:16 }}>
        Shown as a circle in the About section. Different from the hero/gallery images.
      </p>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ width:72, height:72, borderRadius:"50%", overflow:"hidden", background:"var(--color-cream-2)", flexShrink:0, border:"2px solid var(--color-cream-2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {profileImageUrl
            ? <img src={profileImageUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ fontSize:24 }}>👤</span>
          }
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <input ref={profileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadProfileImage(f); e.target.value = ""; }} />
          <button
            onClick={() => profileInputRef.current?.click()}
            disabled={profileUploading}
            style={{ height:34, padding:"0 14px", borderRadius:9, border:"1.5px solid var(--color-cream-2)", background:"var(--color-surface)", color:"var(--color-dark)", fontSize:13, fontWeight:600, cursor:profileUploading ? "default" : "pointer", fontFamily:"inherit" }}
          >
            {profileUploading ? "Uploading…" : profileImageUrl ? "Change photo" : "Upload photo"}
          </button>
          {profileImageUrl && (
            <button onClick={() => setProfileImageUrl(null)} style={{ height:34, padding:"0 14px", borderRadius:9, border:"1.5px solid #FCA5A5", background:"transparent", color:"#991B1B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Remove
            </button>
          )}
        </div>
      </div>
    </SectionCard>

    <SectionCard title="Gallery">
      <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:0, marginBottom:16 }}>
        Drag to reorder. First image = hero. Hover a photo and hit <strong>⌖ Crop</strong> to pick the focal point that stays in frame when it&apos;s cropped.
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
                <img src={item.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition: focal[item.url] || "center", display:"block", pointerEvents:"none" }} />
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
                  <div style={{ display:"flex", gap:5 }}>
                    {i !== 0 && (
                      <button
                        onClick={() => setAsHero(i)}
                        style={{
                          background:"rgba(34,21,16,0.7)", border:"none",
                          borderRadius:6, color:"#fff", fontSize:9, fontWeight:700, padding:"3px 7px",
                          cursor:"pointer", fontFamily:"inherit",
                        }}
                      >
                        Set hero
                      </button>
                    )}
                    {item.url && (
                      <button
                        onClick={() => setFocalEditUrl(item.url)}
                        style={{
                          background:"rgba(34,21,16,0.7)", border:"none",
                          borderRadius:6, color:"#fff", fontSize:9, fontWeight:700, padding:"3px 7px",
                          cursor:"pointer", fontFamily:"inherit",
                        }}
                      >
                        ⌖ Crop
                      </button>
                    )}
                  </div>
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

      {/* Focal-point editor */}
      {focalEditUrl && (() => {
        const url = focalEditUrl;
        const pos = focal[url] || "50% 50%";
        const [fx, fy] = pos.replace(/%/g, "").split(" ").map(n => Number(n) || 50);
        return (
          <div
            onClick={() => setFocalEditUrl(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          >
            <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:20, maxWidth:560, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
              <p style={{ fontSize:15, fontWeight:700, color:"var(--color-dark)", margin:"0 0 4px" }}>Set focal point</p>
              <p style={{ fontSize:13, color:"var(--color-muted)", margin:"0 0 14px" }}>
                Click the part of the photo that should always stay visible when it&apos;s cropped.
              </p>

              {/* Click target */}
              <div
                onClick={e => onFocalClick(e, url)}
                style={{ position:"relative", width:"100%", maxHeight:"46vh", aspectRatio:"4 / 3", borderRadius:12, overflow:"hidden", cursor:"crosshair", background:"var(--color-cream-2)" }}
              >
                <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain", display:"block", pointerEvents:"none" }} />
                <div style={{
                  position:"absolute", left:`${fx}%`, top:`${fy}%`, transform:"translate(-50%,-50%)",
                  width:26, height:26, borderRadius:"50%", border:"3px solid #fff",
                  boxShadow:"0 0 0 2px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)", pointerEvents:"none",
                }} />
              </div>

              {/* Crop previews */}
              <div style={{ display:"flex", gap:12, marginTop:14, alignItems:"flex-start" }}>
                <div>
                  <div style={{ width:90, aspectRatio:"9 / 16", borderRadius:8, overflow:"hidden", border:"1px solid var(--color-cream-2)" }}>
                    <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:pos, display:"block" }} />
                  </div>
                  <p style={{ fontSize:11, color:"var(--color-muted)", textAlign:"center", margin:"4px 0 0" }}>Phone</p>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ width:"100%", aspectRatio:"16 / 9", borderRadius:8, overflow:"hidden", border:"1px solid var(--color-cream-2)" }}>
                    <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:pos, display:"block" }} />
                  </div>
                  <p style={{ fontSize:11, color:"var(--color-muted)", textAlign:"center", margin:"4px 0 0" }}>Wide</p>
                </div>
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", marginTop:18 }}>
                <button
                  onClick={() => setImageFocal(url, "50% 50%")}
                  style={{ background:"transparent", border:"1px solid var(--color-cream-2)", borderRadius:8, padding:"9px 16px", fontSize:13, fontWeight:600, color:"var(--color-muted)", cursor:"pointer", fontFamily:"inherit" }}
                >
                  Reset to center
                </button>
                <button
                  onClick={() => setFocalEditUrl(null)}
                  style={{ background:"var(--color-amber)", border:"none", borderRadius:8, padding:"9px 22px", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", fontFamily:"inherit" }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </SectionCard>
    </>
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
  function startEdit(s: Service)  { setEditing(s); setName(s.name); setPrice(String(s.price)); setDuration(String(s.duration)); setDesc(s.description || ""); setAdding(true); }
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
