"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import type { Service, BusinessHours, DayKey, GoogleReview } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "business" | "services" | "hours" | "reviews";

interface BookingSettings {
  buffer_minutes: number;
  advance_days: number;
  cancellation_policy: "none" | "24h" | "48h" | "custom";
  cancellation_note: string;
}

interface NotificationSettings {
  email_new_booking: boolean;
  email_cancellation: boolean;
  email_reminder: boolean;
  whatsapp_new_booking: boolean;
  whatsapp_reminder: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: { key: DayKey; label: string }[] = [
  { key: "sunday",    label: "Sunday" },
  { key: "monday",    label: "Monday" },
  { key: "tuesday",   label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday",  label: "Thursday" },
  { key: "friday",    label: "Friday" },
  { key: "saturday",  label: "Saturday" },
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

const DEFAULT_BOOKING: BookingSettings = {
  buffer_minutes: 0,
  advance_days: 30,
  cancellation_policy: "24h",
  cancellation_note: "",
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  email_new_booking: true,
  email_cancellation: true,
  email_reminder: true,
  whatsapp_new_booking: false,
  whatsapp_reminder: false,
};

const SECTIONS: { id: Section; label: string }[] = [
  { id: "business", label: "Business Info" },
  { id: "services", label: "Services" },
  { id: "hours",    label: "Working Hours" },
  { id: "reviews",  label: "Reviews" },
];

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/50"
      style={{ background: on ? "var(--color-amber)" : "var(--color-cream-2)" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200"
        style={{ insetInlineStart: on ? "22px" : "2px" }}
      />
    </button>
  );
}

function InputField({
  label,
  hint,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly,
  prefix,
  suffix,
  action,
}: {
  label: string;
  hint?: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-dark">{label}</label>
        {action}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", height: 44, borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", overflow: "hidden", transition: "border-color 0.15s", ...(readOnly ? { opacity: 0.6 } : {}) }}
        onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
        onBlurCapture={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
      >
        {prefix && (
          <span style={{ padding: "0 12px", fontSize: 13, fontWeight: 500, color: "var(--color-muted)", background: "var(--color-cream-2)", borderInlineEnd: "1px solid var(--color-cream-2)", height: "100%", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          style={{ flex: 1, height: "100%", padding: "0 13px", fontSize: 14, color: "var(--color-dark)", background: "transparent", outline: "none", fontFamily: "inherit", cursor: readOnly ? "not-allowed" : "auto" }}
        />
        {suffix && (
          <span style={{ padding: "0 12px", flexShrink: 0 }}>{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)", overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-cream-2)" }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>{title}</h3>
        </div>
      )}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

function SaveButton({ onClick, saving, dirty }: { onClick: () => void; saving: boolean; dirty: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || !dirty}
      style={{
        width: "100%",
        height: 48,
        borderRadius: 14,
        border: "none",
        background: dirty ? "var(--wash-amber)" : "var(--color-cream-2)",
        color: dirty ? "#fff" : "var(--color-muted)",
        fontSize: 15,
        fontWeight: 700,
        cursor: dirty ? "pointer" : "not-allowed",
        boxShadow: dirty ? "0 4px 14px rgba(232,146,10,0.26)" : "none",
        transition: "background 0.15s, box-shadow 0.15s, color 0.15s",
      }}
    >
      {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
    </button>
  );
}

// ─── Setup form (no business yet) ────────────────────────────────────────────

function SetupForm({
  supabase,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>;
  onCreated: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function createBusiness() {
    if (!name.trim()) { showToast("Business name is required", "error"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("Not logged in", "error"); setSaving(false); return; }
    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id, name: name.trim(),
      phone: phone.trim() || null, address: address.trim() || null, slug,
    });
    if (error) { showToast(error.message, "error"); setSaving(false); return; }
    await onCreated();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)", padding: "26px 24px 20px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0 }}>Set up your business</h1>
        <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>Fill in the basics to get started</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionCard>
            <InputField label="Business name *" value={name} onChange={setName} placeholder="e.g. Studio Avi" />
            <InputField label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="050-000-0000" />
            <InputField label="Address" value={address} onChange={setAddress} placeholder="Street, city" />
          </SectionCard>
          <button
            onClick={createBusiness}
            disabled={saving || !name.trim()}
            style={{ width: "100%", height: 48, borderRadius: 14, border: "none", background: "var(--wash-amber)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: saving || !name.trim() ? "not-allowed" : "pointer", opacity: saving || !name.trim() ? 0.5 : 1, boxShadow: "0 4px 14px rgba(232,146,10,0.26)" }}
          >
            {saving ? "Creating…" : "Create business"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Business Info section ────────────────────────────────────────────────────

function BusinessSection({
  business,
  supabase,
  refresh,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(business.name || "");
  const [nameHe, setNameHe] = useState(business.name_he || "");
  const [phone, setPhone] = useState(business.phone || "");
  const [address, setAddress] = useState(business.address || "");
  const [slug, setSlug] = useState(business.slug || "");
  const [tagline, setTagline] = useState(business.tagline || "");
  const [about, setAbout] = useState(business.about_text || "");
  const [taglineHe, setTaglineHe] = useState(business.tagline_he || "");
  const [aboutHe, setAboutHe] = useState(business.about_text_he || "");
  const [defaultLang, setDefaultLang] = useState<"en" | "he">((business.default_lang as "en" | "he") || "en");
  const [notificationEmail, setNotificationEmail] = useState(business.notification_email || "");
  const [saving, setSaving] = useState(false);

  const original = {
    name: business.name || "", nameHe: business.name_he || "",
    phone: business.phone || "", address: business.address || "", slug: business.slug || "",
    tagline: business.tagline || "", about: business.about_text || "",
    taglineHe: business.tagline_he || "", aboutHe: business.about_text_he || "",
    defaultLang: (business.default_lang as "en" | "he") || "en",
    notificationEmail: business.notification_email || "",
  };
  const dirty = name !== original.name || nameHe !== original.nameHe || phone !== original.phone || address !== original.address || slug !== original.slug || defaultLang !== original.defaultLang || tagline !== original.tagline || about !== original.about || taglineHe !== original.taglineHe || aboutHe !== original.aboutHe || notificationEmail !== original.notificationEmail;

  const bookingUrl = `book.bapita.com/${slug || "your-slug"}`;

  function copyLink() {
    navigator.clipboard.writeText(`https://${bookingUrl}`);
    showToast("Booking link copied", "success");
  }

  async function save() {
    setSaving(true);
    let finalSlug = slug;
    if (!finalSlug.trim()) {
      const base = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      finalSlug = `${base}-${Math.random().toString(36).substring(2, 7)}`;
      setSlug(finalSlug);
    }
    const { error } = await supabase.from("businesses").update({
      name, name_he: nameHe || null,
      phone: phone || null, address: address || null, slug: finalSlug,
      default_lang: defaultLang,
      tagline: tagline || null, about_text: about || null,
      tagline_he: taglineHe || null, about_text_he: aboutHe || null,
      notification_email: notificationEmail.trim() || null,
    }).eq("id", business.id);
    setSaving(false);
    if (error) { showToast("Failed to save", "error"); return; }
    await refresh();
    showToast("Business info saved", "success");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard title="Details">
        <InputField label="Business name" value={name} onChange={setName} placeholder="e.g. Studio Avi" />
        <InputField label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="050-000-0000" />
        <InputField label="Notification email" type="email" value={notificationEmail} onChange={setNotificationEmail} placeholder="you@example.com" hint="Booking alerts are sent to this address" />
        <InputField label="Address" value={address} onChange={setAddress} placeholder="Street, city" />
        <InputField label="Tagline" value={tagline} onChange={setTagline} placeholder="e.g. Premium cuts since 2010" />
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-dark">About us</label>
          <textarea
            value={about}
            onChange={e => setAbout(e.target.value)}
            placeholder="Tell clients about your business…"
            rows={4}
            style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", transition: "border-color 0.15s" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--color-amber)")}
            onBlur={e  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
          />
        </div>
      </SectionCard>

      <SectionCard title="Hebrew version (עברית)">
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 4px" }}>Shown when visitors switch to Hebrew. Leave blank to show the English version.</p>
        <InputField label="שם העסק" value={nameHe} onChange={setNameHe} placeholder="e.g. סטודיו אבי" />
        <InputField label="תיאור קצר (tagline)" value={taglineHe} onChange={setTaglineHe} placeholder="תיאור קצר שיופיע בהירו" />
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-dark">אודות העסק</label>
          <textarea
            value={aboutHe}
            onChange={e => setAboutHe(e.target.value)}
            placeholder="ספר על העסק שלך בעברית..."
            rows={4}
            dir="rtl"
            style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", transition: "border-color 0.15s" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--color-amber)")}
            onBlur={e  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
          />
        </div>
      </SectionCard>

      <SectionCard title="Booking page">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-dark">Your booking link</label>
          <div
            style={{ display: "flex", alignItems: "center", height: 44, borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", overflow: "hidden", transition: "border-color 0.15s" }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
            onBlurCapture={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
          >
            <span style={{ padding: "0 12px", fontSize: 13, fontWeight: 500, color: "var(--color-muted)", background: "var(--color-cream-2)", borderInlineEnd: "1px solid var(--color-cream-2)", height: "100%", display: "flex", alignItems: "center", flexShrink: 0, userSelect: "none" }}>
              book.bapita.com/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="your-slug"
              style={{ flex: 1, height: "100%", padding: "0 12px", fontSize: 14, color: "var(--color-dark)", background: "transparent", outline: "none", fontFamily: "inherit" }}
            />
          </div>
          <p className="text-[12px] text-muted">Only lowercase letters, numbers, and hyphens</p>
        </div>

        {/* Booking link actions */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={copyLink}
            style={{ flex: 1, height: 38, borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-dark)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy link
          </button>
          <a
            href={`https://${bookingUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, height: 38, borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-amber)"; (e.currentTarget as HTMLElement).style.color = "var(--color-amber)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-cream-2)"; (e.currentTarget as HTMLElement).style.color = "var(--color-dark)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Preview
          </a>
        </div>
      </SectionCard>

      {/* Language */}
      <SectionCard title="Booking page language">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>Default language</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>Clients land on this language — they can still switch</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 9999, padding: "3px", gap: 2, background: "var(--color-cream-2)", flexShrink: 0 }}>
            {(["en", "he"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setDefaultLang(l)}
                style={{ padding: "6px 16px", borderRadius: 9999, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s, color 0.15s", background: defaultLang === l ? "var(--color-amber)" : "transparent", color: defaultLang === l ? "#fff" : "var(--color-muted)" }}
              >
                {l === "en" ? "EN" : "עב"}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SaveButton onClick={save} saving={saving} dirty={dirty} />
    </div>
  );
}

// ─── Services section ─────────────────────────────────────────────────────────

function ServicesSection({
  business,
  supabase,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
}) {
  const { showToast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newNameHe, setNewNameHe] = useState("");
  const [newDescHe, setNewDescHe] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newPrice, setNewPrice] = useState(100);
  const [saving, setSaving] = useState(false);

  // Drag-to-reorder state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const loadServices = useCallback(async () => {
    const { data } = await supabase.from("services").select("*").eq("business_id", business.id).order("display_order");
    setServices(data || []);
  }, [business.id, supabase]);

  useEffect(() => { loadServices(); }, [loadServices]);

  function resetForm() {
    setNewName(""); setNewNameHe(""); setNewDescHe(""); setNewDuration(30); setNewPrice(100);
    setShowForm(false); setEditingId(null);
  }

  function startEdit(s: Service) {
    setEditingId(s.id);
    setNewName(s.name);
    setNewNameHe(s.name_he || "");
    setNewDescHe(s.description_he || "");
    setNewDuration(s.duration);
    setNewPrice(s.price);
    setShowForm(false);
  }

  async function saveService() {
    if (!newName.trim()) return;
    setSaving(true);
    if (editingId) {
      await supabase.from("services").update({
        name: newName.trim(), name_he: newNameHe.trim() || null,
        description_he: newDescHe.trim() || null,
        duration: newDuration, price: newPrice,
      }).eq("id", editingId);
    } else {
      await supabase.from("services").insert({
        business_id: business.id, name: newName.trim(),
        name_he: newNameHe.trim() || null, description_he: newDescHe.trim() || null,
        duration: newDuration, price: newPrice, active: true, display_order: services.length,
      });
    }
    await loadServices();
    resetForm();
    setSaving(false);
    showToast(editingId ? "Service updated" : "Service added", "success");
  }

  async function toggleActive(id: string, current: boolean) {
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, active: !current } : s));
    const { error } = await supabase.from("services").update({ active: !current }).eq("id", id);
    if (error) {
      setServices((prev) => prev.map((s) => s.id === id ? { ...s, active: current } : s));
    }
  }

  async function deleteService(id: string) {
    await supabase.from("services").delete().eq("id", id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    showToast("Service removed", "success");
  }

  // Drag handlers
  function onDragStart(index: number) { dragIndex.current = index; }
  function onDragEnter(index: number) { dragOverIndex.current = index; }
  async function onDragEnd() {
    if (dragIndex.current === null || dragOverIndex.current === null || dragIndex.current === dragOverIndex.current) {
      dragIndex.current = null; dragOverIndex.current = null; return;
    }
    const reordered = [...services];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(dragOverIndex.current, 0, moved);
    setServices(reordered);
    dragIndex.current = null; dragOverIndex.current = null;
    // Persist display_order
    await Promise.all(reordered.map((s, i) => supabase.from("services").update({ display_order: i }).eq("id", s.id)));
  }

  const svcInput: React.CSSProperties = { height: 44, width: "100%", padding: "0 13px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", boxSizing: "border-box" };
  const svcLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };

  const formContent = (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: 20, boxShadow: "var(--shadow-sm)", border: "1.5px solid var(--color-amber)", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", margin: 0 }}>{editingId ? "Edit service" : "New service"}</p>
      <div>
        <label style={svcLabel}>Service name</label>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Haircut"
          autoFocus
          style={svcInput}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
          onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
        />
      </div>
      <div>
        <label style={svcLabel}>Service name (Hebrew)</label>
        <input
          type="text"
          value={newNameHe}
          onChange={(e) => setNewNameHe(e.target.value)}
          placeholder="e.g. תספורת"
          dir="rtl"
          style={svcInput}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
          onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
        />
      </div>
      <div>
        <label style={svcLabel}>Description (Hebrew)</label>
        <input
          type="text"
          value={newDescHe}
          onChange={(e) => setNewDescHe(e.target.value)}
          placeholder="תיאור קצר של השירות"
          dir="rtl"
          style={svcInput}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
          onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
        />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={svcLabel}>Duration (min)</label>
          <input
            type="number"
            value={newDuration}
            onChange={(e) => setNewDuration(parseInt(e.target.value) || 30)}
            min={5} step={5}
            style={svcInput}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
            onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={svcLabel}>Price (₪)</label>
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
            min={0}
            style={svcInput}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
            onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={saveService}
          disabled={saving || !newName.trim()}
          style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: saving || !newName.trim() ? "var(--color-cream-2)" : "var(--wash-amber)", color: saving || !newName.trim() ? "var(--color-muted)" : "#fff", fontSize: 14, fontWeight: 700, cursor: saving || !newName.trim() ? "not-allowed" : "pointer" }}
        >
          {saving ? "Saving…" : editingId ? "Save changes" : "Add service"}
        </button>
        <button
          onClick={resetForm}
          style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-dark)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-cream)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Empty state */}
      {services.length === 0 && !showForm && !editingId && (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "40px 24px", textAlign: "center", boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(232,146,10,0.1)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-dark mb-1">No services yet</p>
          <p className="text-[13px] text-muted">Add the services you offer to your clients</p>
        </div>
      )}

      {/* Service list with drag-to-reorder */}
      {services.length > 0 && (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)", overflow: "hidden" }}>
          {services.map((service, index) => (
            <div key={service.id}>
              {/* Editing this row inline */}
              {editingId === service.id ? (
                <div className="p-4">{formContent}</div>
              ) : (
                <div
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragEnter={() => onDragEnter(index)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center gap-3 px-4 py-3.5 group transition-colors hover:bg-[var(--color-cream)]"
                  style={{ borderBottom: index < services.length - 1 ? "1px solid var(--color-cream-2)" : "none" }}
                >
                  {/* Drag handle */}
                  <div className="text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-dark truncate">{service.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] text-muted px-2 py-0.5 rounded-full" style={{ background: "var(--color-cream-2)" }}>{service.duration} min</span>
                      <span className="text-[12px] text-muted px-2 py-0.5 rounded-full" style={{ background: "var(--color-cream-2)" }}>₪{service.price}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Active toggle */}
                    <button
                      onClick={() => toggleActive(service.id, service.active)}
                      className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors"
                      style={service.active
                        ? { background: "rgba(34,197,94,0.12)", color: "#16A34A" }
                        : { background: "var(--color-cream-2)", color: "var(--color-muted)" }}
                    >
                      {service.active ? "Active" : "Off"}
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => startEdit(service)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-dark hover:bg-[var(--color-cream-2)] transition-colors"
                      aria-label="Edit service"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => deleteService(service.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-red-50"
                      style={{ color: "#EF4444" }}
                      aria-label="Remove service"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {services.length > 1 && (
            <div className="px-4 py-2 border-t border-[var(--color-cream-2)]">
              <p className="text-[12px] text-muted">Drag to reorder how services appear on your booking page</p>
            </div>
          )}
        </div>
      )}

      {/* Add service form or button */}
      {!editingId && (
        showForm ? formContent : (
          <button
            onClick={() => setShowForm(true)}
            style={{ width: "100%", height: 46, borderRadius: 12, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--color-surface)", border: "1.5px dashed var(--color-cream-2)", color: "var(--color-dark)", cursor: "pointer", transition: "border-color 0.15s, color 0.15s, background 0.15s", boxShadow: "var(--shadow-sm)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; e.currentTarget.style.background = "var(--amber-soft)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-dark)"; e.currentTarget.style.background = "var(--color-surface)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add service
          </button>
        )
      )}
    </div>
  );
}

// ─── Working Hours section ────────────────────────────────────────────────────

function HoursSection({
  business,
  supabase,
  refresh,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [hours, setHours] = useState<BusinessHours>(
    business.business_hours ?? DEFAULT_HOURS
  );
  const [saving, setSaving] = useState(false);

  const original = JSON.stringify(business.business_hours ?? DEFAULT_HOURS);
  const dirty = JSON.stringify(hours) !== original;

  function setDay(key: DayKey, patch: Partial<BusinessHours[DayKey]>) {
    setHours((h) => ({ ...h, [key]: { ...h[key], ...patch } }));
  }

  function copyFirstOpenToAll() {
    const first = DAYS.find((d) => hours[d.key].open);
    if (!first) return;
    const { start, end } = hours[first.key];
    setHours((h) => {
      const next = { ...h };
      DAYS.forEach(({ key }) => { if (next[key].open) next[key] = { ...next[key], start, end }; });
      return next;
    });
    showToast("Hours applied to all open days", "success");
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("businesses").update({ business_hours: hours }).eq("id", business.id);
    setSaving(false);
    if (error) { showToast("Failed to save", "error"); return; }
    await refresh();
    showToast("Working hours saved", "success");
  }

  const openDays = DAYS.filter((d) => hours[d.key].open);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Days on/off */}
      <SectionCard title="Working days">
        <div className="flex flex-wrap gap-2">
          {DAYS.map(({ key, label }) => {
            const on = hours[key].open;
            return (
              <button
                key={key}
                onClick={() => setDay(key, { open: !on })}
                className="px-4 py-2 rounded-xl text-[14px] font-semibold transition-all"
                style={on
                  ? { background: "var(--color-amber)", color: "white" }
                  : { background: "var(--color-cream-2)", color: "var(--color-muted)" }
                }
              >
                {label.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-muted">Tap a day to toggle it on or off</p>
      </SectionCard>

      {/* Hours per open day */}
      {openDays.length > 0 && (
        <SectionCard title="Hours">
          <div className="space-y-0">
            {openDays.map(({ key, label }, idx) => (
              <div
                key={key}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: idx < openDays.length - 1 ? "1px solid var(--color-cream-2)" : "none" }}
              >
                <span className="w-24 text-[14px] font-semibold text-dark shrink-0">{label}</span>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={hours[key].start}
                    onChange={(e) => setDay(key, { start: e.target.value })}
                    style={{ height: 38, padding: "0 10px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", fontSize: 13, color: "var(--color-dark)", outline: "none", background: "var(--color-cream)", fontFamily: "inherit", transition: "border-color 0.15s" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                    className=""
                  />
                  <span className="text-[13px] text-muted">–</span>
                  <input
                    type="time"
                    value={hours[key].end}
                    onChange={(e) => setDay(key, { end: e.target.value })}
                    style={{ height: 38, padding: "0 10px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", fontSize: 13, color: "var(--color-dark)", outline: "none", background: "var(--color-cream)", fontFamily: "inherit", transition: "border-color 0.15s" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                    className=""
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Copy hours shortcut */}
          {openDays.length > 1 && (
            <button
              onClick={copyFirstOpenToAll}
              style={{ width: "100%", height: 38, borderRadius: 10, fontSize: 13, fontWeight: 500, color: "var(--color-muted)", border: "1.5px solid var(--color-cream-2)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "border-color 0.15s, color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-muted)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Apply first day's hours to all open days
            </button>
          )}
        </SectionCard>
      )}

      {openDays.length === 0 && (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "28px 20px", textAlign: "center", boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)" }}>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No working days selected — enable at least one day above</p>
        </div>
      )}

      <SaveButton onClick={save} saving={saving} dirty={dirty} />
    </div>
  );
}

// ─── Reviews section ──────────────────────────────────────────────────────────

function ReviewsSection({
  business,
  supabase,
  refresh,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [reviews, setReviews]       = useState<GoogleReview[]>((business.google_reviews as GoogleReview[]) || []);
  const [showReviews, setShowReviews] = useState(business.show_reviews !== false);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [author, setAuthor]         = useState("");
  const [rating, setRating]         = useState(5);
  const [text, setText]             = useState("");
  const [date, setDate]             = useState("");
  const [saving, setSaving]         = useState(false);

  function resetForm() {
    setShowForm(false); setEditingId(null);
    setAuthor(""); setRating(5); setText(""); setDate("");
  }

  function startEdit(r: GoogleReview) {
    setEditingId(r.id);
    setAuthor(r.author); setRating(r.rating); setText(r.text); setDate(r.date || "");
    setShowForm(true);
  }

  async function saveReview() {
    if (!author.trim() || !text.trim()) { showToast("Author and review text required", "error"); return; }
    setSaving(true);
    const updated = editingId
      ? reviews.map(r => r.id === editingId ? { ...r, author: author.trim(), rating, text: text.trim(), date: date.trim() } : r)
      : [...reviews, { id: crypto.randomUUID(), author: author.trim(), rating, text: text.trim(), date: date.trim() }];
    const { error } = await supabase.from("businesses").update({ google_reviews: updated }).eq("id", business.id);
    setSaving(false);
    if (error) { showToast("Failed to save", "error"); return; }
    setReviews(updated);
    resetForm();
    await refresh();
    showToast(editingId ? "Review updated" : "Review added", "success");
  }

  async function deleteReview(id: string) {
    const updated = reviews.filter(r => r.id !== id);
    const { error } = await supabase.from("businesses").update({ google_reviews: updated }).eq("id", business.id);
    if (error) { showToast("Failed to delete", "error"); return; }
    setReviews(updated);
    await refresh();
    showToast("Review deleted", "success");
  }

  async function toggleShowReviews() {
    const next = !showReviews;
    const { error } = await supabase.from("businesses").update({ show_reviews: next }).eq("id", business.id);
    if (error) { showToast("Failed to update", "error"); return; }
    setShowReviews(next);
    await refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard title="Display settings">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>Show reviews section</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>Visible on booking page when reviews exist</div>
          </div>
          <Toggle on={showReviews} onChange={toggleShowReviews} />
        </div>
      </SectionCard>

      <SectionCard title={`Reviews (${reviews.length})`}>
        {reviews.length === 0 && !showForm && (
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>No reviews yet. Add your best Google reviews below.</p>
        )}

        {reviews.map(r => (
          <div key={r.id} style={{ border: "1px solid var(--color-cream-2)", borderRadius: 11, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)" }}>{r.author}</span>
                <span style={{ fontSize: 12, color: "#F59E0B", letterSpacing: 1 }}>{"★".repeat(r.rating)}</span>
                {r.date && <span style={{ fontSize: 11, color: "var(--color-muted)" }}>{r.date}</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => startEdit(r)} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-amber)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Edit</button>
                <button onClick={() => deleteReview(r.id)} style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Delete</button>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-dark)", opacity: 0.75, margin: 0, lineHeight: 1.5 }}>{r.text}</p>
          </div>
        ))}

        {showForm && (
          <div style={{ border: "1.5px solid var(--color-amber)", borderRadius: 12, padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
            <InputField label="Client name" value={author} onChange={setAuthor} placeholder="e.g. David Cohen" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-dark)" }}>Rating</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRating(n)} style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid", borderColor: n <= rating ? "#F59E0B" : "var(--color-cream-2)", background: n <= rating ? "#FEF3C7" : "transparent", fontSize: 16, cursor: "pointer", transition: "all 0.12s" }}>★</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-dark)" }}>Review text</label>
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste the review here…"
                rows={4}
                style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                onBlur={e  => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
              />
            </div>
            <InputField label="Date (optional)" value={date} onChange={setDate} placeholder="e.g. June 2025" />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveReview} disabled={saving} style={{ flex: 1, height: 40, borderRadius: 11, border: "none", background: "var(--wash-amber)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : editingId ? "Update review" : "Add review"}
              </button>
              <button onClick={resetForm} style={{ height: 40, padding: "0 16px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-muted)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{ width: "100%", height: 40, borderRadius: 11, border: "1.5px dashed var(--color-cream-2)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-muted)", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-muted)"; }}
          >
            + Add review
          </button>
        )}
      </SectionCard>
    </div>
  );
}

// ─── [Removed: Booking Rules + Notifications — not in v1 scope] ───────────────

function _BookingSection({
  business,
  supabase,
  refresh,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const initial: BookingSettings = {
    buffer_minutes: (business as any).buffer_minutes ?? DEFAULT_BOOKING.buffer_minutes,
    advance_days: (business as any).advance_days ?? DEFAULT_BOOKING.advance_days,
    cancellation_policy: (business as any).cancellation_policy ?? DEFAULT_BOOKING.cancellation_policy,
    cancellation_note: (business as any).cancellation_note ?? DEFAULT_BOOKING.cancellation_note,
  };
  const [settings, setSettings] = useState<BookingSettings>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);

  function set<K extends keyof BookingSettings>(key: K, val: BookingSettings[K]) {
    setSettings((s) => ({ ...s, [key]: val }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      buffer_minutes: settings.buffer_minutes,
      advance_days: settings.advance_days,
      cancellation_policy: settings.cancellation_policy,
      cancellation_note: settings.cancellation_note || null,
    }).eq("id", business.id);
    setSaving(false);
    if (error) { showToast("Failed to save", "error"); return; }
    await refresh();
    showToast("Booking rules saved", "success");
  }

  const bufferOptions = [0, 5, 10, 15, 30];
  const advanceOptions = [7, 14, 30, 60, 90];
  const cancelOptions: { value: BookingSettings["cancellation_policy"]; label: string }[] = [
    { value: "none",   label: "No policy" },
    { value: "24h",    label: "24 hours notice" },
    { value: "48h",    label: "48 hours notice" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard title="Timing">
        {/* Buffer */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-dark">Break between bookings</label>
          <p className="text-[12px] text-muted -mt-1">Extra time added after each appointment — for cleanup or a breather</p>
          <div className="flex gap-2 flex-wrap">
            {bufferOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => set("buffer_minutes", opt)}
                className="px-4 py-2 rounded-xl text-[14px] font-semibold transition-all"
                style={settings.buffer_minutes === opt
                  ? { background: "var(--color-amber)", color: "white" }
                  : { background: "var(--color-cream-2)", color: "var(--color-muted)" }
                }
              >
                {opt === 0 ? "None" : `${opt} min`}
              </button>
            ))}
          </div>
        </div>

        {/* Advance booking */}
        <div className="flex flex-col gap-2 pt-2">
          <label className="text-[13px] font-medium text-dark">How far ahead clients can book</label>
          <p className="text-[12px] text-muted -mt-1">Clients won't see availability beyond this window</p>
          <div className="flex gap-2 flex-wrap">
            {advanceOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => set("advance_days", opt)}
                className="px-4 py-2 rounded-xl text-[14px] font-semibold transition-all"
                style={settings.advance_days === opt
                  ? { background: "var(--color-amber)", color: "white" }
                  : { background: "var(--color-cream-2)", color: "var(--color-muted)" }
                }
              >
                {opt} days
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Cancellation policy">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {cancelOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => set("cancellation_policy", value)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border text-start transition-all"
                style={settings.cancellation_policy === value
                  ? { borderColor: "var(--color-amber)", background: "rgba(232,146,10,0.06)" }
                  : { borderColor: "var(--color-cream-2)", background: "white" }
                }
              >
                <span
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={settings.cancellation_policy === value
                    ? { borderColor: "var(--color-amber)", background: "var(--color-amber)" }
                    : { borderColor: "var(--color-cream-2)" }
                  }
                >
                  {settings.cancellation_policy === value && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </span>
                <span className="text-[14px] font-medium text-dark">{label}</span>
              </button>
            ))}
          </div>

          {settings.cancellation_policy === "custom" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-dark">Your policy</label>
              <textarea
                value={settings.cancellation_note}
                onChange={(e) => set("cancellation_note", e.target.value)}
                placeholder="e.g. Cancellations must be made at least 12 hours in advance. No-shows may be charged."
                rows={3}
                className="px-4 py-3 rounded-[10px] border border-[var(--color-cream-2)] bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors resize-none"
              />
              <p className="text-[12px] text-muted">This will appear on your booking page</p>
            </div>
          )}

          {settings.cancellation_policy !== "none" && settings.cancellation_policy !== "custom" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-dark">Optional note (shown to clients)</label>
              <textarea
                value={settings.cancellation_note}
                onChange={(e) => set("cancellation_note", e.target.value)}
                placeholder="e.g. No-shows may be charged 50% of the service price."
                rows={2}
                className="px-4 py-3 rounded-[10px] border border-[var(--color-cream-2)] bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors resize-none"
              />
            </div>
          )}
        </div>
      </SectionCard>

      <SaveButton onClick={save} saving={saving} dirty={dirty} />
    </div>
  );
}

function _NotificationsSection({
  business,
  supabase,
  refresh,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const initial: NotificationSettings = {
    email_new_booking: (business as any).notif_email_new_booking ?? true,
    email_cancellation: (business as any).notif_email_cancellation ?? true,
    email_reminder: (business as any).notif_email_reminder ?? true,
    whatsapp_new_booking: (business as any).notif_wa_new_booking ?? false,
    whatsapp_reminder: (business as any).notif_wa_reminder ?? false,
  };
  const [settings, setSettings] = useState<NotificationSettings>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);

  function toggle<K extends keyof NotificationSettings>(key: K) {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      notif_email_new_booking: settings.email_new_booking,
      notif_email_cancellation: settings.email_cancellation,
      notif_email_reminder: settings.email_reminder,
      notif_wa_new_booking: settings.whatsapp_new_booking,
      notif_wa_reminder: settings.whatsapp_reminder,
    }).eq("id", business.id);
    setSaving(false);
    if (error) { showToast("Failed to save", "error"); return; }
    await refresh();
    showToast("Notification settings saved", "success");
  }

  function NotifRow({ label, hint, value, onToggle, disabled }: { label: string; hint?: string; value: boolean; onToggle: () => void; disabled?: boolean }) {
    return (
      <div
        className="flex items-center gap-4 py-3.5"
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-dark">{label}</div>
          {hint && <div className="text-[12px] text-muted mt-0.5">{hint}</div>}
        </div>
        <Toggle on={value} onChange={disabled ? () => {} : onToggle} />
      </div>
    );
  }

  // Check if WhatsApp add-on is active (you can hook this into your addons table)
  const waActive = (business as any).whatsapp_active ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Email — free */}
      <SectionCard title="Email · Free">
        <div className="space-y-0 divide-y divide-[var(--color-cream-2)]">
          <NotifRow
            label="New booking"
            hint="Get an email when a client books an appointment"
            value={settings.email_new_booking}
            onToggle={() => toggle("email_new_booking")}
          />
          <NotifRow
            label="Cancellation"
            hint="Get an email when a client cancels"
            value={settings.email_cancellation}
            onToggle={() => toggle("email_cancellation")}
          />
          <NotifRow
            label="Daily reminder"
            hint="Morning summary of today's appointments"
            value={settings.email_reminder}
            onToggle={() => toggle("email_reminder")}
          />
        </div>
      </SectionCard>

      {/* WhatsApp — paid */}
      <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)] overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-[var(--color-cream-2)] flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-muted uppercase tracking-wide">WhatsApp</h3>
          {waActive ? (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#16A34A" }}>Active</span>
          ) : (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(232,146,10,0.12)", color: "#B36A00" }}>Paid add-on</span>
          )}
        </div>

        {!waActive ? (
          <div className="p-5">
            <p className="text-[14px] text-dark font-medium mb-1">Get notified on WhatsApp</p>
            <p className="text-[13px] text-muted mb-4">
              Receive instant WhatsApp alerts for new bookings and reminders — right where you already spend your day.
              This is part of the WhatsApp add-on.
            </p>
            <a
              href="https://wa.me/972"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-colors"
              style={{ background: "#25D366" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.117 1.532 5.845L.057 23.6a.5.5 0 0 0 .611.611l5.755-1.475A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 0 1-5.032-1.39l-.36-.214-3.735.957.974-3.642-.235-.374A9.818 9.818 0 1 1 12 21.818z"/>
              </svg>
              Learn about the WhatsApp add-on
            </a>
          </div>
        ) : (
          <div className="p-5 space-y-0 divide-y divide-[var(--color-cream-2)]">
            <NotifRow
              label="New booking"
              hint="WhatsApp alert when a client books"
              value={settings.whatsapp_new_booking}
              onToggle={() => toggle("whatsapp_new_booking")}
            />
            <NotifRow
              label="Daily reminder"
              hint="Morning summary via WhatsApp"
              value={settings.whatsapp_reminder}
              onToggle={() => toggle("whatsapp_reminder")}
            />
          </div>
        )}
      </div>

      <SaveButton onClick={save} saving={saving} dirty={dirty} />
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { business, loading: bizLoading, refresh } = useBusiness();
  const supabase = createClient();
  const [activeSection, setActiveSection] = useState<Section>("business");

  if (bizLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!business) {
    return <SetupForm supabase={supabase} onCreated={refresh} />;
  }

  function renderSection() {
    switch (activeSection) {
      case "business": return <BusinessSection business={business!} supabase={supabase} refresh={refresh} />;
      case "services": return <ServicesSection business={business!} supabase={supabase} />;
      case "hours":    return <HoursSection business={business!} supabase={supabase} refresh={refresh} />;
      case "reviews":  return <ReviewsSection business={business!} supabase={supabase} refresh={refresh} />;
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header + chip tabs */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)", padding: "26px 24px 0" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: "0 0 16px" }}>
          Settings
        </h1>
        <div style={{ display: "flex", gap: 8, paddingBottom: 18 }}>
          {SECTIONS.map((s) => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s",
                  background: active ? "var(--color-amber)" : "var(--color-cream-2)",
                  color: active ? "#fff" : "var(--color-muted)",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px 64px" }}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
