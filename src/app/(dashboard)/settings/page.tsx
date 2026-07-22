"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import type { Service, BusinessHours, DayKey, GoogleReview, StaffMember } from "@/types";
import { FontPicker } from "@/components/FontPicker";
import { useLang } from "@/i18n";
import { loadStaff, syncStaffTable } from "@/lib/staff";
import { SettingsSkeleton } from "@/components/LoadingSkeleton";
import { PaymentsSection } from "./_components/PaymentsSection";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "business" | "services" | "hours" | "team" | "website" | "content" | "payments";

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

const SECTIONS: { id: Section; label: string }[] = [
  { id: "business", label: "Business" },
  { id: "services", label: "Services" },
  { id: "hours",    label: "Hours" },
  { id: "team",     label: "Team" },
  { id: "website",  label: "Website" },
  { id: "content",  label: "Content" },
  { id: "payments", label: "Payments" },
];

function getErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "This URL is already taken. Choose a different one.";
  if (error.code === "PGRST116") return "Not found — please reload the page.";
  if (error.message?.includes("network")) return "Connection issue — please try again.";
  return "Couldn't save. Please try again.";
}

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
  hint?: React.ReactNode;
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
  const { t } = useLang();
  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)", overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-cream-2)" }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>{t(title)}</h3>
        </div>
      )}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

function SaveButton({ onClick, saving, dirty }: { onClick: () => void; saving: boolean; dirty: boolean }) {
  const { t } = useLang();
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
        color: dirty ? "var(--color-surface)" : "var(--color-muted)",
        fontSize: 15,
        fontWeight: 700,
        cursor: dirty ? "pointer" : "not-allowed",
        boxShadow: dirty ? "0 4px 14px rgba(232,146,10,0.26)" : "none",
        transition: "background 0.15s, box-shadow 0.15s, color 0.15s",
      }}
    >
      {saving ? t("Saving…") : dirty ? t("Save changes") : t("No changes")}
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
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    const auto = v.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const prevAuto = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    setSlug((prev) => (prev === prevAuto ? auto : prev));
  }

  async function createBusiness() {
    if (!name.trim()) { showToast("Business name is required", "error"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("Not logged in", "error"); setSaving(false); return; }
    const base = slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    let finalSlug = base;
    let suffix = 2;
    while (true) {
      const { count } = await supabase.from("businesses").select("*", { count: "exact", head: true }).eq("slug", finalSlug);
      if ((count ?? 0) === 0) break;
      finalSlug = `${base}-${suffix++}`;
    }
    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id, name: name.trim(),
      phone: phone.trim() || null, address: address.trim() || null, slug: finalSlug,
      dashboard_lang: "he", default_lang: "he",
    });
    if (error) { showToast(error.message, "error"); setSaving(false); return; }
    localStorage.setItem("bapita_onboarding", "1");
    await onCreated();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)", padding: "26px 24px 20px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0 }}>Let&apos;s build your booking page</h1>
        <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>Takes 2 minutes. Your page goes live right after.</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionCard>
            <InputField label="Business name *" value={name} onChange={handleNameChange} placeholder="e.g. Studio Avi" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-dark">Your booking URL</label>
              <div
                style={{ display: "flex", alignItems: "center", height: 44, borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", overflow: "hidden", transition: "border-color 0.15s" }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
              >
                <span style={{ padding: "0 0 0 13px", fontSize: 14, color: "var(--color-muted)", whiteSpace: "nowrap", userSelect: "none", flexShrink: 0 }}>book.bapita.com/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="studio-avi"
                  style={{ flex: 1, height: "100%", border: "none", background: "transparent", fontSize: 14, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", padding: "0 13px 0 2px" }}
                />
              </div>
            </div>
            <InputField label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="050-000-0000" />
            <InputField label="Address" value={address} onChange={setAddress} placeholder="Street, city" />
          </SectionCard>
          <button
            onClick={createBusiness}
            disabled={saving || !name.trim()}
            style={{ width: "100%", height: 48, borderRadius: 14, border: "none", background: "var(--wash-amber)", color: "var(--color-surface)", fontSize: 15, fontWeight: 700, cursor: saving || !name.trim() ? "not-allowed" : "pointer", opacity: saving || !name.trim() ? 0.5 : 1, boxShadow: "0 4px 14px rgba(232,146,10,0.26)" }}
          >
            {saving ? "Creating your page…" : "Create my page"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── No business screen ───────────────────────────────────────────────────────

function NoBusinessScreen() {
  const [name,    setName]    = useState("");
  const [subject, setSubject] = useState("My booking page is not showing");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const canSend = !!subject.trim() && !!message.trim() && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, message }),
      });
      if (!res.ok) throw new Error("failed");
      showToast("Message sent — we'll get back to you soon", "success");
      setName(""); setMessage("");
    } catch {
      showToast("Couldn't send. Please try again.", "error");
    } finally {
      setSending(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 13px", borderRadius: 11,
    border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)",
    fontSize: 14, color: "var(--color-dark)", outline: "none",
    fontFamily: "inherit", transition: "border-color 0.15s", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--color-muted)", display: "block", marginBottom: 7,
  };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-amber)");
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-cream-2)");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "26px 24px 20px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0, lineHeight: 1.1 }}>Settings</h1>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "24px 24px 64px" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-cream-2)", boxShadow: "var(--shadow-sm)", padding: "18px 20px" }}>
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 18px", lineHeight: 1.6 }}>
              Your booking page isn&apos;t active. Send us a message and we&apos;ll sort it out.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Name <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us what's going on…" rows={5} style={{ ...inputStyle, height: "auto", padding: "11px 13px", resize: "vertical", lineHeight: 1.5 }} onFocus={focus} onBlur={blur} />
            </div>
            <button
              onClick={send} disabled={!canSend}
              style={{ width: "100%", height: 44, borderRadius: 12, border: "none", background: canSend ? "var(--wash-amber)" : "var(--color-cream-2)", color: canSend ? "var(--color-surface)" : "var(--color-muted)", fontSize: 14, fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed", transition: "background 0.15s, color 0.15s", boxShadow: canSend ? "0 4px 14px rgba(232,146,10,0.28)" : "none" }}
            >
              {sending ? "Sending…" : "Send message"}
            </button>
          </div>
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
  onDirtyChange,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(business.name || "");
  const [nameHe, setNameHe] = useState(business.name_he || "");
  const [phone, setPhone] = useState(business.phone || "");
  const [address, setAddress] = useState(business.address || "");
  const [tagline, setTagline] = useState(business.tagline || "");
  const [about, setAbout] = useState(business.about_text || "");
  const [taglineHe, setTaglineHe] = useState(business.tagline_he || "");
  const [aboutHe, setAboutHe] = useState(business.about_text_he || "");
  const [notificationEmail, setNotificationEmail] = useState(business.notification_email || "");
  const [saving, setSaving] = useState(false);

  const original = {
    name: business.name || "", nameHe: business.name_he || "",
    phone: business.phone || "", address: business.address || "",
    tagline: business.tagline || "", about: business.about_text || "",
    taglineHe: business.tagline_he || "", aboutHe: business.about_text_he || "",
    notificationEmail: business.notification_email || "",
  };
  const dirty = name !== original.name || nameHe !== original.nameHe || phone !== original.phone || address !== original.address || tagline !== original.tagline || about !== original.about || taglineHe !== original.taglineHe || aboutHe !== original.aboutHe || notificationEmail !== original.notificationEmail;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      name, name_he: nameHe || null,
      phone: phone || null, address: address || null,
      tagline: tagline || null, about_text: about || null,
      tagline_he: taglineHe || null, about_text_he: aboutHe || null,
      notification_email: notificationEmail.trim() || null,
    }).eq("id", business.id);
    setSaving(false);
    if (error) { showToast(getErrorMessage(error), "error"); return; }
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

      <SaveButton onClick={save} saving={saving} dirty={dirty} />
    </div>
  );
}

// ─── Services section ─────────────────────────────────────────────────────────

function ServicesSection({
  business,
  supabase,
  refresh,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newNameHe, setNewNameHe] = useState("");
  const [newDescHe, setNewDescHe] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newPrice, setNewPrice] = useState(100);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Drag-to-reorder state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const loadServices = useCallback(async () => {
    const { data } = await supabase.from("services").select("*").eq("business_id", business.id).order("display_order");
    setServices(data || []);
  }, [business.id, supabase]);

  // Initial load from Supabase; setState runs after the query resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadServices(); }, [loadServices]);
  useEffect(() => { loadStaff(supabase, business.id).then(setStaff); }, [business.id, supabase]);

  function resetForm() {
    setNewName(""); setNewNameHe(""); setNewDescHe(""); setNewDuration(30); setNewPrice(100);
    setSelectedStaffIds([]);
    setShowForm(false); setEditingId(null);
  }

  function startEdit(s: Service) {
    setEditingId(s.id);
    setNewName(s.name);
    setNewNameHe(s.name_he || "");
    setNewDescHe(s.description_he || "");
    setNewDuration(s.duration);
    setNewPrice(s.price);
    setSelectedStaffIds(s.staff_ids ?? []);
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
        staff_ids: selectedStaffIds,
      }).eq("id", editingId);
    } else {
      await supabase.from("services").insert({
        business_id: business.id, name: newName.trim(),
        name_he: newNameHe.trim() || null, description_he: newDescHe.trim() || null,
        duration: newDuration, price: newPrice, active: true, display_order: services.length,
        staff_ids: selectedStaffIds,
      });
    }
    await loadServices();
    await refresh();
    resetForm();
    setSaving(false);
    showToast(editingId ? "Service updated" : "Service added", "success");
  }

  async function toggleActive(id: string, current: boolean) {
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, active: !current } : s));
    const { error } = await supabase.from("services").update({ active: !current }).eq("id", id);
    if (error) {
      setServices((prev) => prev.map((s) => s.id === id ? { ...s, active: current } : s));
    } else {
      await refresh();
    }
  }

  async function requestDelete(id: string) {
    if (pendingDelete === id) {
      await supabase.from("services").delete().eq("id", id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      setPendingDelete(null);
      showToast("Service removed", "success");
    } else {
      setPendingDelete(id);
      setTimeout(() => setPendingDelete((cur) => (cur === id ? null : cur)), 2500);
    }
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
    const prevServices = services;
    setServices(reordered);
    dragIndex.current = null; dragOverIndex.current = null;
    const results = await Promise.all(
      reordered.map((s, i) => supabase.from("services").update({ display_order: i }).eq("id", s.id))
    );
    if (results.some((r) => r.error)) {
      setServices(prevServices);
      showToast("Couldn't reorder. Please try again.", "error");
    }
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
      {staff.length > 0 && (
        <div>
          <label style={svcLabel}>{t("Who performs this")}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {staff.map((s) => {
              const on = selectedStaffIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStaffIds((ids) => (on ? ids.filter((x) => x !== s.id) : [...ids, s.id]))}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999,
                    border: `1.5px solid ${on ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                    background: on ? "var(--amber-soft)" : "transparent", cursor: "pointer", fontSize: 13,
                    color: "var(--color-dark)", fontFamily: "inherit",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color || "var(--color-amber)" }} />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={saveService}
          disabled={saving || !newName.trim()}
          style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: saving || !newName.trim() ? "var(--color-cream-2)" : "var(--wash-amber)", color: saving || !newName.trim() ? "var(--color-muted)" : "var(--color-surface)", fontSize: 14, fontWeight: 700, cursor: saving || !newName.trim() ? "not-allowed" : "pointer" }}
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
                    <Toggle on={service.active} onChange={() => toggleActive(service.id, service.active)} />
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
                      onClick={() => requestDelete(service.id)}
                      className="h-8 rounded-xl flex items-center justify-center transition-colors"
                      style={{
                        minWidth: 32,
                        padding: pendingDelete === service.id ? "0 8px" : "0",
                        color: pendingDelete === service.id ? "var(--color-surface)" : "var(--color-danger)",
                        background: pendingDelete === service.id ? "var(--color-danger)" : "transparent",
                      }}
                      aria-label={pendingDelete === service.id ? "Tap again to confirm delete" : "Remove service"}
                    >
                      {pendingDelete === service.id ? (
                        <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>✕ confirm</span>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      )}
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
  onDirtyChange,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { showToast } = useToast();
  const { t } = useLang();
  const [hours, setHours] = useState<BusinessHours>(
    business.business_hours ?? DEFAULT_HOURS
  );
  const origBufferMinutes = business.buffer_minutes ?? 0;
  const origAdvanceDays = business.advance_days ?? 30;
  const [bufferMinutes, setBufferMinutes] = useState(origBufferMinutes);
  const [advanceDays, setAdvanceDays] = useState(origAdvanceDays);
  const [blockedDates, setBlockedDates] = useState<string[]>((business.blocked_dates as string[] | null) || []);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [saving, setSaving] = useState(false);

  const original = JSON.stringify(business.business_hours ?? DEFAULT_HOURS);
  const dirty = JSON.stringify(hours) !== original || bufferMinutes !== origBufferMinutes || advanceDays !== origAdvanceDays;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function toggleBlockedDate(dateStr: string) {
    const isBlocked = blockedDates.includes(dateStr);
    const next = isBlocked ? blockedDates.filter((d) => d !== dateStr) : [...blockedDates, dateStr];
    setBlockedDates(next);
    const { error } = await supabase.from("businesses").update({ blocked_dates: next }).eq("id", business.id);
    if (error) { setBlockedDates(blockedDates); showToast("Couldn't update blocked dates", "error"); }
  }

  function calDays(): (string | null)[] {
    const days: (string | null)[] = [];
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    for (let i = 0; i < firstDay; i++) days.push(null);
    const count = new Date(calYear, calMonth + 1, 0).getDate();
    for (let d = 1; d <= count; d++) {
      days.push(`${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return days;
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcomingBlocked = blockedDates.filter((d) => d >= today).sort();

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
    const { error } = await supabase.from("businesses").update({ business_hours: hours, buffer_minutes: bufferMinutes, advance_days: advanceDays }).eq("id", business.id);
    setSaving(false);
    if (error) { showToast(getErrorMessage(error), "error"); return; }
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
                {t(label.slice(0, 3))}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-muted">{t("Tap a day to toggle it on or off")}</p>
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
              Apply first day&apos;s hours to all open days
            </button>
          )}
        </SectionCard>
      )}

      {openDays.length === 0 && (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "28px 20px", textAlign: "center", boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)" }}>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No working days selected — enable at least one day above</p>
        </div>
      )}

      <SectionCard title="Break between appointments">
        <p className="text-[12px] text-muted -mt-1">Extra time added after each appointment for cleanup or a breather</p>
        <div className="flex gap-2 flex-wrap">
          {[0, 5, 10, 15, 30].map((opt) => (
            <button
              key={opt}
              onClick={() => setBufferMinutes(opt)}
              className="px-4 py-2 rounded-xl text-[14px] font-semibold transition-all"
              style={bufferMinutes === opt
                ? { background: "var(--color-amber)", color: "white" }
                : { background: "var(--color-cream-2)", color: "var(--color-muted)" }
              }
            >
              {opt === 0 ? "None" : `${opt} min`}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="How far ahead clients can book">
        <p className="text-[12px] text-muted -mt-1">Clients won&apos;t see availability beyond this window</p>
        <div className="flex gap-2 flex-wrap">
          {[7, 14, 30, 60, 90].map((opt) => (
            <button
              key={opt}
              onClick={() => setAdvanceDays(opt)}
              className="px-4 py-2 rounded-xl text-[14px] font-semibold transition-all"
              style={advanceDays === opt
                ? { background: "var(--color-amber)", color: "white" }
                : { background: "var(--color-cream-2)", color: "var(--color-muted)" }
              }
            >
              {opt} days
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Time off & blocked dates">
        <p className="text-[12px] text-muted -mt-1">Block a day to prevent new bookings — existing bookings are not affected.</p>
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 18, padding: "0 8px" }}>{"‹"}</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>
            {new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 18, padding: "0 8px" }}>{"›"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--color-muted)", padding: "4px 0" }}>{d}</div>
          ))}
          {calDays().map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const isPast = dateStr < today;
            const isBlocked = blockedDates.includes(dateStr);
            const day = parseInt(dateStr.slice(8));
            return (
              <button
                key={dateStr}
                onClick={() => !isPast && toggleBlockedDate(dateStr)}
                disabled={isPast}
                style={{
                  height: 34,
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: isBlocked ? 700 : 400,
                  cursor: isPast ? "default" : "pointer",
                  background: isBlocked ? "var(--color-danger)" : "transparent",
                  color: isBlocked ? "var(--color-surface)" : isPast ? "var(--color-cream-2)" : "var(--color-dark)",
                  transition: "background 0.1s",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
        {upcomingBlocked.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Blocked</p>
            {upcomingBlocked.map((d) => (
              <div key={d} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>
                <span style={{ fontSize: 13, color: "var(--color-dark)" }}>
                  {new Date(d + "T12:00:00").toLocaleDateString("en-IL", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <button onClick={() => toggleBlockedDate(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", fontSize: 13, fontWeight: 600 }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SaveButton onClick={save} saving={saving} dirty={dirty} />
    </div>
  );
}

// ─── Team section (staff table — scheduling source of truth) ─────────────────

function TeamSection({
  business,
  supabase,
  refresh,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [origStaff, setOrigStaff]   = useState<StaffMember[]>([]);
  const [staffUploading, setStaffUploading] = useState<Record<string, boolean>>({});
  const [allowChoice, setAllowChoice] = useState(!!business.allow_staff_choice);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStaff(supabase, business.id).then((rows) => { setStaff(rows); setOrigStaff(rows); });
  }, [business.id, supabase]);

  const dirty = JSON.stringify(staff) !== JSON.stringify(origStaff);

  async function uploadStaffPhoto(memberId: string, memberIdx: number, file: File) {
    setStaffUploading((s) => ({ ...s, [memberId]: true }));
    const ext  = file.name.split(".").pop();
    const path = `profiles/staff/${business.id}/${memberId}.${ext}`;
    const { error } = await supabase.storage.from("business-images").upload(path, file, { upsert: true, cacheControl: "31536000" });
    if (!error) {
      const { data } = supabase.storage.from("business-images").getPublicUrl(path);
      // path is stable (memberId, upsert-overwritten) — cache-bust via query string so a
      // long Cache-Control on the object doesn't serve a stale photo after replacement.
      const url = `${data.publicUrl}?v=${Date.now()}`;
      setStaff((ms) => ms.map((m, i) => i === memberIdx ? { ...m, photo_url: url } : m));
    } else {
      showToast(t("Failed to upload photo"), "error");
    }
    setStaffUploading((s) => ({ ...s, [memberId]: false }));
  }

  async function save() {
    setSaving(true);
    try {
      await syncStaffTable(supabase, business.id, staff);
      // keep the public "meet the team" JSON (Website section) in sync
      await supabase.from("businesses").update({ staff_members: staff }).eq("id", business.id);
      setOrigStaff(staff);
      await refresh();
      showToast(t("Saved"), "success");
    } catch {
      showToast(t("Couldn't save. Please try again."), "error");
    }
    setSaving(false);
  }

  async function toggleAllowChoice() {
    const next = !allowChoice;
    setAllowChoice(next);
    const { error } = await supabase.from("businesses").update({ allow_staff_choice: next }).eq("id", business.id);
    if (error) {
      setAllowChoice(!next);
      showToast(t("Couldn't save. Please try again."), "error");
    } else {
      await refresh();
    }
  }

  function toggleStaffCustomHours(idx: number) {
    setStaff((ms) => ms.map((m, i) => {
      if (i !== idx) return m;
      if (m.working_hours) return { ...m, working_hours: null };
      return { ...m, working_hours: business.business_hours ?? DEFAULT_HOURS };
    }));
  }

  function setStaffDay(idx: number, key: DayKey, patch: Partial<BusinessHours[DayKey]>) {
    setStaff((ms) => ms.map((m, i) => {
      if (i !== idx || !m.working_hours) return m;
      return { ...m, working_hours: { ...m.working_hours, [key]: { ...m.working_hours[key], ...patch } } };
    }));
  }

  const svcLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };
  const svcInput: React.CSSProperties = { height: 38, padding: "0 12px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", fontSize: 13, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
  const staffTimeInput: React.CSSProperties = { height: 30, padding: "0 8px", borderRadius: 7, border: "1.5px solid var(--color-cream-2)", fontSize: 12, color: "var(--color-dark)", outline: "none", background: "var(--color-surface)", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard title="Team">
        {staff.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>{t("Add the people who work at your business — you'll be able to assign bookings to them and filter your calendar.")}</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {staff.map((member, idx) => (
            <div key={member.id} style={{ background: "var(--color-cream)", border: "1.5px solid var(--color-cream-2)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              {/* Photo */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "var(--color-cream-2)", border: "1.5px solid var(--color-cream-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {member.photo_url
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={member.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 20 }}>👤</span>
                  }
                </div>
                <label style={{ position: "absolute", bottom: -2, insetInlineEnd: -2, width: 20, height: 20, borderRadius: "50%", background: "var(--color-amber)", border: "2px solid var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: staffUploading[member.id] ? "default" : "pointer", opacity: staffUploading[member.id] ? 0.6 : 1 }}>
                  {staffUploading[member.id]
                    ? <div style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid var(--color-surface)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                    : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--color-surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  }
                  <input
                    type="file" accept="image/*" style={{ display: "none" }}
                    disabled={staffUploading[member.id]}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadStaffPhoto(member.id, idx, f); }}
                  />
                </label>
              </div>

              {/* Name + Role + Color + Active */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                <div>
                  <label style={svcLabel}>{t("Name")}</label>
                  <input
                    value={member.name}
                    onChange={(e) => setStaff((ms) => ms.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))}
                    placeholder={t("Name")}
                    style={svcInput}
                  />
                </div>
                <div>
                  <label style={svcLabel}>{t("Role")}</label>
                  <input
                    value={member.role}
                    onChange={(e) => setStaff((ms) => ms.map((m, i) => i === idx ? { ...m, role: e.target.value } : m))}
                    placeholder="e.g. Hairstylist"
                    style={svcInput}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ ...svcLabel, marginBottom: 0 }}>{t("Calendar color")}</label>
                    <input
                      type="color"
                      value={member.color || "#E8920A"}
                      onChange={(e) => setStaff((ms) => ms.map((m, i) => i === idx ? { ...m, color: e.target.value } : m))}
                      style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                      aria-label={t("Calendar color")}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)" }}>{t("Active")}</span>
                    <Toggle
                      on={member.active !== false}
                      onChange={() => setStaff((ms) => ms.map((m, i) => i === idx ? { ...m, active: m.active === false } : m))}
                    />
                  </div>
                </div>

                {/* Working hours — inherit business hours, or set a custom weekly schedule */}
                <div style={{ borderTop: "1px solid var(--color-cream-2)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-dark)" }}>{t("Custom hours")}</span>
                      {!member.working_hours && (
                        <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>{t("Uses business hours")}</div>
                      )}
                    </div>
                    <Toggle on={!!member.working_hours} onChange={() => toggleStaffCustomHours(idx)} />
                  </div>

                  {member.working_hours && (
                    <div style={{ border: "1px solid var(--color-cream-2)", borderRadius: 9, overflow: "hidden" }}>
                      {DAYS.map(({ key, label }, dIdx) => {
                        const day = member.working_hours![key];
                        return (
                          <div
                            key={key}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--color-surface)", borderBottom: dIdx < DAYS.length - 1 ? "1px solid var(--color-cream-2)" : "none" }}
                          >
                            <label style={{ display: "flex", alignItems: "center", gap: 6, width: 76, flexShrink: 0, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={day.open}
                                onChange={(e) => setStaffDay(idx, key, { open: e.target.checked })}
                                style={{ accentColor: "var(--color-amber)" }}
                              />
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-dark)" }}>{label.slice(0, 3)}</span>
                            </label>
                            {day.open ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                                <input
                                  type="time"
                                  value={day.start}
                                  onChange={(e) => setStaffDay(idx, key, { start: e.target.value })}
                                  style={staffTimeInput}
                                />
                                <span style={{ fontSize: 12, color: "var(--color-muted)" }}>–</span>
                                <input
                                  type="time"
                                  value={day.end}
                                  onChange={(e) => setStaffDay(idx, key, { end: e.target.value })}
                                  style={staffTimeInput}
                                />
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--color-muted)", flex: 1 }}>—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => setStaff((ms) => ms.filter((_, i) => i !== idx))}
                style={{ height: 32, width: 32, borderRadius: 8, border: "1.5px solid #FCA5A5", background: "transparent", color: "#991B1B", cursor: "pointer", fontSize: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}
                aria-label={t("Remove")}
              >×</button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStaff((ms) => [...ms, { id: crypto.randomUUID(), name: "", role: "", photo_url: null, color: "#E8920A", active: true }])}
          style={{ marginTop: staff.length > 0 ? 8 : 0, width: "100%", height: 46, borderRadius: 12, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--color-surface)", border: "1.5px dashed var(--color-cream-2)", color: "var(--color-dark)", cursor: "pointer", transition: "border-color 0.15s, color 0.15s, background 0.15s", boxShadow: "var(--shadow-sm)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; e.currentTarget.style.background = "var(--amber-soft)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-dark)"; e.currentTarget.style.background = "var(--color-surface)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("Add team member")}
        </button>
      </SectionCard>

      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>{t("Let customers choose their professional")}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>{t("Adds a \"choose your professional\" step to your booking page")}</div>
          </div>
          <Toggle on={allowChoice} onChange={toggleAllowChoice} />
        </div>
      </SectionCard>

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
    if (error) { showToast(getErrorMessage(error), "error"); return; }
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
                <button onClick={() => deleteReview(r.id)} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Delete</button>
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
              <button onClick={saveReview} disabled={saving} style={{ flex: 1, height: 40, borderRadius: 11, border: "none", background: "var(--wash-amber)", color: "var(--color-surface)", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
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


// ─── Google Place ID card ─────────────────────────────────────────────────────

function GooglePlaceIdCard({
  business,
  supabase,
  refresh,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const saved = business.google_place_id || "";
  const [placeId,  setPlaceId]  = useState(saved);
  const [editing,  setEditing]  = useState(!saved);
  const [saving,   setSaving]   = useState(false);

  const dirty = placeId.trim() !== saved;

  async function save() {
    if (!placeId.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ google_place_id: placeId.trim() || null })
      .eq("id", business.id);
    setSaving(false);
    if (error) { showToast("Couldn't save. Please try again.", "error"); return; }
    await refresh();
    setEditing(false);
    showToast("Google reviews connected", "success");
  }

  async function disconnect() {
    setSaving(true);
    await supabase.from("businesses").update({ google_place_id: null }).eq("id", business.id);
    setSaving(false);
    setPlaceId("");
    setEditing(true);
    await refresh();
    showToast("Google reviews disconnected", "success");
  }

  return (
    <SectionCard title="Google Maps reviews">
      {saved && !editing ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)" }}>Connected</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)", fontFamily: "monospace", marginTop: 1 }}>{saved}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setEditing(true)}
              style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >Edit</button>
            <button
              onClick={disconnect}
              disabled={saving}
              style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid #FCA5A5", background: "transparent", color: "#991B1B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >Remove</button>
          </div>
        </div>
      ) : (
        <>
          <InputField
            label="Place ID"
            value={placeId}
            onChange={setPlaceId}
            placeholder="ChIJ…"
            hint={<>Find your Place ID at <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-amber)" }}>Google Place ID Finder</a>. Can{"'"}t find your business? Search on Google Maps → Share → Copy link → send to Rami.</>}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={save}
              disabled={saving || !placeId.trim() || !dirty}
              style={{ flex: 1, height: 40, borderRadius: 11, border: "none", background: placeId.trim() && dirty ? "var(--color-amber)" : "var(--color-cream-2)", color: placeId.trim() && dirty ? "var(--color-surface)" : "var(--color-muted)", fontSize: 13, fontWeight: 700, cursor: placeId.trim() && dirty ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "background 0.15s, color 0.15s" }}
            >
              {saving ? "Saving…" : "Connect"}
            </button>
            {saved && (
              <button
                onClick={() => { setPlaceId(saved); setEditing(false); }}
                style={{ height: 40, padding: "0 16px", borderRadius: 11, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >Cancel</button>
            )}
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ─── Website section (booking link + language + gallery + reviews) ────────────

function WebsiteSection({
  business,
  supabase,
  refresh,
  onDirtyChange,
  which,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  which: "website" | "content";
}) {
  const { showToast } = useToast();

  // ── All editable state ─────────────────────────────────────────────────────
  const [slug, setSlug]                       = useState(business.slug || "");
  const [defaultLang, setDefaultLang]         = useState<"en" | "he">((business.default_lang as "en" | "he") || "en");
  const [images, setImages]                   = useState<string[]>(business.gallery_images || []);
  const [hidden, setHidden]                   = useState<string[]>(business.gallery_hidden || []);
  const [showGallery, setShowGallery]         = useState(business.show_gallery !== false);
  const [tiktokUrl, setTiktokUrl]             = useState(business.tiktok_url || "");
  const [instagramUrl, setInstagramUrl]       = useState(business.instagram_url || "");
  const [facebookUrl, setFacebookUrl]         = useState(business.facebook_url || "");
  const [whatsappNumber, setWhatsappNumber]   = useState(business.whatsapp_number || "");
  const [googleReviewLink, setGoogleReviewLink] = useState(business.google_review_link || "");
  const [googleMapsUrl, setGoogleMapsUrl]     = useState(business.google_maps_url || "");
  const [wazeUrl, setWazeUrl]                 = useState(business.waze_url || "");
  const [uploading, setUploading]             = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>((business as unknown as { profile_image_url?: string | null }).profile_image_url || null);
  const [profileUploading, setProfileUploading] = useState(false);
  const [showStaff, setShowStaff]       = useState((business as unknown as { show_staff?: boolean | null }).show_staff !== false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>((business as unknown as { staff_members?: StaffMember[] | null }).staff_members || []);
  const [staffUploading, setStaffUploading] = useState<Record<string, boolean>>({});
  const [headingFont, setHeadingFont]       = useState<string>((business as unknown as { heading_font?: string | null }).heading_font || "");
  const [bodyFont, setBodyFont]             = useState<string>((business as unknown as { body_font?: string | null }).body_font || "");
  const [gallerySource, setGallerySource]   = useState<"images" | "instagram">(((business as unknown as { gallery_source?: string | null }).gallery_source as "images" | "instagram") || "images");
  const [instagramEmbed, setInstagramEmbed] = useState<string>((business as unknown as { instagram_embed?: string | null }).instagram_embed || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // ── Dirty detection (all fields together) ─────────────────────────────────
  const origSlug             = business.slug || "";
  const origLang             = (business.default_lang as "en" | "he") || "en";
  const origImages           = JSON.stringify(business.gallery_images || []);
  const origHidden           = JSON.stringify(business.gallery_hidden || []);
  const origShowGallery      = business.show_gallery !== false;
  const origTiktokUrl        = business.tiktok_url || "";
  const origInstagramUrl     = business.instagram_url || "";
  const origFacebookUrl      = business.facebook_url || "";
  const origWhatsappNumber   = business.whatsapp_number || "";
  const origGoogleReviewLink = business.google_review_link || "";
  const origGoogleMapsUrl    = business.google_maps_url || "";
  const origWazeUrl          = business.waze_url || "";
  const origProfileImageUrl  = (business as unknown as { profile_image_url?: string | null }).profile_image_url || null;
  const origShowStaff        = (business as unknown as { show_staff?: boolean | null }).show_staff !== false;
  const origStaffMembers     = JSON.stringify((business as unknown as { staff_members?: StaffMember[] | null }).staff_members || []);
  const origHeadingFont      = (business as unknown as { heading_font?: string | null }).heading_font || "";
  const origBodyFont         = (business as unknown as { body_font?: string | null }).body_font || "";
  const origGallerySource    = ((business as unknown as { gallery_source?: string | null }).gallery_source as "images" | "instagram") || "images";
  const origInstagramEmbed   = (business as unknown as { instagram_embed?: string | null }).instagram_embed || "";
  const dirty = slug !== origSlug || defaultLang !== origLang ||
                JSON.stringify(images) !== origImages || JSON.stringify(hidden) !== origHidden || showGallery !== origShowGallery ||
                tiktokUrl !== origTiktokUrl || instagramUrl !== origInstagramUrl ||
                facebookUrl !== origFacebookUrl || whatsappNumber !== origWhatsappNumber ||
                googleReviewLink !== origGoogleReviewLink || googleMapsUrl !== origGoogleMapsUrl ||
                wazeUrl !== origWazeUrl || profileImageUrl !== origProfileImageUrl ||
                showStaff !== origShowStaff || JSON.stringify(staffMembers) !== origStaffMembers ||
                headingFont !== origHeadingFont || bodyFont !== origBodyFont ||
                gallerySource !== origGallerySource || instagramEmbed !== origInstagramEmbed;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ── Actions ────────────────────────────────────────────────────────────────
  async function uploadProfileImage(file: File) {
    setProfileUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `profiles/${business.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("business-images").upload(path, file, { upsert: true, cacheControl: "31536000" });
    if (!error) {
      const { data } = supabase.storage.from("business-images").getPublicUrl(path);
      setProfileImageUrl(data.publicUrl);
    } else {
      showToast("Failed to upload photo", "error");
    }
    setProfileUploading(false);
  }

  async function uploadStaffPhoto(memberId: string, memberIdx: number, file: File) {
    setStaffUploading(s => ({ ...s, [memberId]: true }));
    const ext  = file.name.split(".").pop();
    const path = `profiles/staff/${business.id}/${memberId}.${ext}`;
    const { error } = await supabase.storage.from("business-images").upload(path, file, { upsert: true, cacheControl: "31536000" });
    if (!error) {
      const { data } = supabase.storage.from("business-images").getPublicUrl(path);
      // path is stable (memberId, upsert-overwritten) — cache-bust via query string so a
      // long Cache-Control on the object doesn't serve a stale photo after replacement.
      const url = `${data.publicUrl}?v=${Date.now()}`;
      setStaffMembers(ms => ms.map((m, i) => i === memberIdx ? { ...m, photo_url: url } : m));
    } else {
      showToast("Failed to upload photo", "error");
    }
    setStaffUploading(s => ({ ...s, [memberId]: false }));
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://book.bapita.com/${slug || "your-slug"}`);
    showToast("Booking link copied", "success");
  }

  async function uploadFiles(files: File[]) {
    setUploading(true);
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `galleries/${business.id}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("business-images").upload(path, file, { upsert: true, cacheControl: "31536000" });
      if (error) { showToast(`Failed to upload ${file.name}`, "error"); continue; }
      const { data } = supabase.storage.from("business-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setUploading(false);
    if (urls.length === 0) return;
    setImages(prev => [...prev, ...urls]);
    showToast(`${urls.length} photo${urls.length > 1 ? "s" : ""} added — save to publish`, "success");
  }

  function removeImage(url: string) {
    setImages(prev => prev.filter(u => u !== url));
    setHidden(prev => prev.filter(u => u !== url));
  }

  function toggleHidden(url: string) {
    setHidden(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  }

  async function save() {
    setSaving(true);
    let finalSlug = slug;
    if (!finalSlug.trim()) {
      const base = business.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      finalSlug = `${base}-${Math.random().toString(36).substring(2, 7)}`;
      setSlug(finalSlug);
    }
    const { error } = await supabase.from("businesses").update({
      slug:               finalSlug,
      default_lang:       defaultLang,
      gallery_images:     images,
      gallery_hidden:     hidden.filter(u => images.includes(u)),
      hero_image_url:     images[0] || null,
      show_gallery:       showGallery,
      tiktok_url:         tiktokUrl.trim() || null,
      instagram_url:      instagramUrl.trim() || null,
      facebook_url:       facebookUrl.trim() || null,
      whatsapp_number:    whatsappNumber.trim() || null,
      google_review_link: googleReviewLink.trim() || null,
      google_maps_url:    googleMapsUrl.trim() || null,
      waze_url:           wazeUrl.trim() || null,
      profile_image_url:  profileImageUrl || null,
      show_staff:         showStaff,
      staff_members:      staffMembers,
      heading_font:       headingFont || null,
      body_font:          bodyFont || null,
      gallery_source:     gallerySource || null,
      instagram_embed:    instagramEmbed.trim() || null,
    }).eq("id", business.id);
    setSaving(false);
    if (error) { showToast(getErrorMessage(error), "error"); return; }
    await refresh();
    showToast("Website settings saved", "success");
  }

  const bookingUrl = `book.bapita.com/${slug || "your-slug"}`;

  if (which === "website") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Booking link */}
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
          <p className="text-[12px] text-muted">Only lowercase letters, numbers, and hyphens — e.g. book.bapita.com/studio-avi</p>
        </div>
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
        {business.custom_domain && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-cream-2)" }}>
            <div style={{ fontSize: 13, color: "var(--color-dark)" }}>
              {business.custom_domain}
            </div>
            {business.custom_domain_verified ? (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, background: "#D1FAE5", color: "#065F46" }}>Connected</span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, background: "#FEF3C7", color: "#92400E" }}>Pending DNS</span>
            )}
          </div>
        )}
      </SectionCard>

      {/* Language */}
      <SectionCard title="Default language">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>Booking page language</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>Clients land on this language — they can still switch</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 9999, padding: "3px", gap: 2, background: "var(--color-cream-2)", flexShrink: 0 }}>
            {(["en", "he"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setDefaultLang(l)}
                style={{ padding: "6px 16px", borderRadius: 9999, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s, color 0.15s", background: defaultLang === l ? "var(--color-amber)" : "transparent", color: defaultLang === l ? "var(--color-surface)" : "var(--color-muted)" }}
              >
                {l === "en" ? "EN" : "עב"}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Design — font pickers */}
      <SectionCard title="Design">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-dark">Heading font</label>
          <FontPicker value={headingFont} onChange={setHeadingFont} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-dark">Body font</label>
          <FontPicker value={bodyFont} onChange={setBodyFont} />
        </div>
      </SectionCard>

      {/* Social links */}
      <SectionCard title="Social links">
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 4px" }}>All links shown as icons on your booking page. Leave blank to hide.</p>
        <InputField label="WhatsApp number" value={whatsappNumber} onChange={setWhatsappNumber} placeholder="+972501234567" hint="Customers can tap to message you directly" />
        <InputField label="Instagram" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/youraccount" />
        <InputField label="Facebook" value={facebookUrl} onChange={setFacebookUrl} placeholder="https://facebook.com/youraccount" />
        <InputField label="TikTok" value={tiktokUrl} onChange={setTiktokUrl} placeholder="https://tiktok.com/@youraccount" />
        <InputField label="Google Review link" value={googleReviewLink} onChange={setGoogleReviewLink} placeholder="https://g.page/r/..." hint="Link customers click to leave you a Google review" />
        <InputField label="Google Maps" value={googleMapsUrl} onChange={setGoogleMapsUrl} placeholder="https://maps.google.com/?q=..." />
        <InputField label="Waze" value={wazeUrl} onChange={setWazeUrl} placeholder="https://waze.com/ul?ll=..." />
      </SectionCard>

      <SaveButton onClick={save} saving={saving} dirty={dirty} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Profile photo */}
      <SectionCard title="Profile photo">
        <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 12px" }}>
          Shown as a circle in the About section on your booking page.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "var(--color-cream-2)", flexShrink: 0, border: "2px solid var(--color-cream-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {profileImageUrl
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 24 }}>👤</span>
            }
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input ref={profileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadProfileImage(f); e.target.value = ""; }} />
            <button
              onClick={() => profileInputRef.current?.click()}
              disabled={profileUploading}
              style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 13, fontWeight: 600, cursor: profileUploading ? "default" : "pointer", fontFamily: "inherit" }}
            >
              {profileUploading ? "Uploading…" : profileImageUrl ? "Change photo" : "Upload photo"}
            </button>
            {profileImageUrl && (
              <button onClick={() => setProfileImageUrl(null)} style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid #FCA5A5", background: "transparent", color: "#991B1B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Remove
              </button>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Gallery */}
      <SectionCard title="Gallery">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>Show gallery on booking page</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>Visible when at least one photo is added</div>
          </div>
          <Toggle on={showGallery} onChange={() => setShowGallery(g => !g)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>Gallery content</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>What the gallery section shows</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 9999, padding: "3px", gap: 2, background: "var(--color-cream-2)", flexShrink: 0 }}>
            {(["images", "instagram"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setGallerySource(s)}
                style={{ padding: "6px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s, color 0.15s", background: gallerySource === s ? "var(--color-amber)" : "transparent", color: gallerySource === s ? "var(--color-surface)" : "var(--color-muted)" }}
              >
                {s === "images" ? "Gallery images" : "Instagram feed"}
              </button>
            ))}
          </div>
        </div>
        {gallerySource === "instagram" && (
          <InputField
            label="Instagram feed embed"
            value={instagramEmbed}
            onChange={setInstagramEmbed}
            placeholder="48IK66flQkZ8N0S8h1QP"
            hint="Behold feed ID (or the full <behold-widget> embed snippet) — not the Instagram profile URL. Create the feed at behold.so."
          />
        )}
      </SectionCard>

      <SectionCard title={`Photos (${images.length})`}>
        {images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {images.map((url, i) => {
              const isHidden = hidden.includes(url);
              return (
              <div key={url} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Gallery ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: isHidden ? 0.45 : 1, filter: isHidden ? "grayscale(0.6)" : "none", transition: "opacity 0.15s, filter 0.15s" }} />
                {i === 0 && (
                  <div style={{ position: "absolute", top: 4, insetInlineStart: 4, background: "rgba(0,0,0,0.6)", color: "var(--color-surface)", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>Cover</div>
                )}
                {isHidden && i !== 0 && (
                  <div style={{ position: "absolute", top: 4, insetInlineStart: 4, background: "rgba(0,0,0,0.6)", color: "var(--color-surface)", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>Hidden</div>
                )}
                <button
                  onClick={() => toggleHidden(url)}
                  title={isHidden ? "Show in gallery" : "Hide from gallery"}
                  style={{ position: "absolute", top: 4, insetInlineEnd: 32, width: 24, height: 24, borderRadius: 6, background: isHidden ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.9)", border: "none", color: isHidden ? "var(--color-surface)" : "var(--color-dark)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {isHidden ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
                <button
                  onClick={() => removeImage(url)}
                  style={{ position: "absolute", top: 4, insetInlineEnd: 4, width: 24, height: 24, borderRadius: 6, background: "rgba(239,68,68,0.85)", border: "none", color: "var(--color-surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            );
            })}
          </div>
        )}
        {images.length === 0 && !uploading && (
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>No photos yet. Upload photos to show a gallery on your booking page.</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) uploadFiles(files); e.target.value = ""; }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ width: "100%", height: 46, borderRadius: 12, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--color-surface)", border: "1.5px dashed var(--color-cream-2)", color: uploading ? "var(--color-muted)" : "var(--color-dark)", cursor: uploading ? "not-allowed" : "pointer", transition: "border-color 0.15s, color 0.15s, background 0.15s", boxShadow: "var(--shadow-sm)" }}
          onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; e.currentTarget.style.background = "var(--amber-soft)"; }}}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-dark)"; e.currentTarget.style.background = "var(--color-surface)"; }}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
              Uploading…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add photos
            </>
          )}
        </button>
        {images.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>First photo is used as the cover image. Tap the eye to hide a photo from the gallery (it stays available as a cover/background).</p>
        )}
      </SectionCard>

      {/* Staff */}
      <SectionCard title="Staff">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>Show staff section</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>Visible when at least one member is added</div>
          </div>
          <Toggle on={showStaff} onChange={() => setShowStaff(s => !s)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {staffMembers.map((member, idx) => (
            <div key={member.id} style={{ background: "var(--color-cream)", border: "1.5px solid var(--color-cream-2)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              {/* Photo */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "var(--color-cream-2)", border: "1.5px solid var(--color-cream-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {member.photo_url
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={member.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 20 }}>👤</span>
                  }
                </div>
                <label style={{ position: "absolute", bottom: -2, insetInlineEnd: -2, width: 20, height: 20, borderRadius: "50%", background: "var(--color-amber)", border: "2px solid var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: staffUploading[member.id] ? "default" : "pointer", opacity: staffUploading[member.id] ? 0.6 : 1 }}>
                  {staffUploading[member.id]
                    ? <div style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid var(--color-surface)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                    : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--color-surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  }
                  <input
                    type="file" accept="image/*" style={{ display: "none" }}
                    disabled={staffUploading[member.id]}
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadStaffPhoto(member.id, idx, f); }}
                  />
                </label>
              </div>
              {/* Name + Role */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  value={member.name}
                  onChange={e => setStaffMembers(ms => ms.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))}
                  placeholder="Name"
                  style={{ height: 38, padding: "0 12px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", fontSize: 13, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                />
                <input
                  value={member.role}
                  onChange={e => setStaffMembers(ms => ms.map((m, i) => i === idx ? { ...m, role: e.target.value } : m))}
                  placeholder="Role (e.g. Hairstylist)"
                  style={{ height: 38, padding: "0 12px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", fontSize: 13, color: "var(--color-dark)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                />
              </div>
              {/* Remove */}
              <button
                type="button"
                onClick={() => setStaffMembers(ms => ms.filter((_, i) => i !== idx))}
                style={{ height: 32, width: 32, borderRadius: 8, border: "1.5px solid #FCA5A5", background: "transparent", color: "#991B1B", cursor: "pointer", fontSize: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}
              >×</button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStaffMembers(ms => [...ms, { id: crypto.randomUUID(), name: "", role: "", photo_url: null }])}
          style={{ marginTop: staffMembers.length > 0 ? 8 : 0, width: "100%", height: 46, borderRadius: 12, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--color-surface)", border: "1.5px dashed var(--color-cream-2)", color: "var(--color-dark)", cursor: "pointer", transition: "border-color 0.15s, color 0.15s, background 0.15s", boxShadow: "var(--shadow-sm)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; e.currentTarget.style.background = "var(--amber-soft)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-dark)"; e.currentTarget.style.background = "var(--color-surface)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add team member
        </button>
      </SectionCard>

      <SaveButton onClick={save} saving={saving} dirty={dirty} />

      {/* Reviews — individual adds/edits/deletes, own save per item */}
      <ReviewsSection business={business} supabase={supabase} refresh={refresh} />

      {/* Google Place ID — auto-pull live reviews */}
      <GooglePlaceIdCard business={business} supabase={supabase} refresh={refresh} />
    </div>
  );
}

// ─── Onboarding checklist ─────────────────────────────────────────────────────

function OnboardingChecklist({
  business,
  supabase,
  onNavigate,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
  onNavigate: (section: Section) => void;
}) {
  const [serviceCount, setServiceCount] = useState(0);
  // Start hidden — revealed on client once onboarding localStorage flag is confirmed.
  // Avoids server/client hydration mismatch from reading localStorage during SSR.
  const [dismissed, setDismissed] = useState(true);
  const [allDoneVisible, setAllDoneVisible] = useState(false);

  // Derive steps + completion here (before hooks) so the allRequiredDone effect can use them
  const steps: { key: Section; label: string; hint: string; done: boolean; required: boolean }[] = [
    {
      key: "business",
      label: "Business info",
      hint: "Add your tagline, phone, or address",
      done: !!(business.tagline || business.phone || business.address),
      required: true,
    },
    {
      key: "services",
      label: "Services",
      hint: "Add at least one service you offer",
      done: serviceCount > 0,
      required: true,
    },
    {
      key: "hours",
      label: "Working hours",
      hint: "Set your weekly availability",
      done: business.business_hours !== null,
      required: true,
    },
    {
      key: "website",
      label: "Reviews",
      hint: "Add your best client reviews",
      done: Array.isArray(business.google_reviews) && (business.google_reviews as GoogleReview[]).length > 0,
      required: false,
    },
  ];
  const doneCount      = steps.filter(s => s.done).length;
  const allRequiredDone = steps.filter(s => s.required).every(s => s.done);
  const pct            = Math.round((doneCount / steps.length) * 100);

  // ── ALL hooks before any early return (Rules of Hooks) ──────────────────────

  // Reveal checklist on client if the onboarding flag is present
  useEffect(() => {
    // One-time mount read of localStorage to reveal the onboarding checklist.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem("bapita_onboarding") === "1") setDismissed(false);
  }, []);

  // Re-fetch service count whenever business updates (triggered by refresh())
  useEffect(() => {
    if (dismissed) return;
    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("active", true)
      .then(({ count }) => setServiceCount(count ?? 0));
  }, [dismissed, business, supabase]);

  // Auto-dismiss with celebration when all required steps done
  useEffect(() => {
    // Syncing visibility to a derived boolean gate before the celebration timer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!allRequiredDone) { setAllDoneVisible(false); return; }
    setAllDoneVisible(true);
    const t = setTimeout(() => {
      localStorage.removeItem("bapita_onboarding");
      setDismissed(true);
    }, 2200);
    return () => clearTimeout(t);
  }, [allRequiredDone]);

  // ── Early return after all hooks ────────────────────────────────────────────

  function dismiss() {
    localStorage.removeItem("bapita_onboarding");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div style={{
      background: "var(--color-surface)",
      borderRadius: 16,
      border: "1px solid var(--color-cream-2)",
      boxShadow: "var(--shadow-sm)",
      overflow: "hidden",
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)", marginBottom: 2 }}>
            {allDoneVisible ? "🎉 You're all set!" : "Finish setting up your page"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
            {allDoneVisible
              ? "Your booking page is ready to share."
              : `${doneCount} of ${steps.length} complete · ${steps.length - doneCount} remaining`}
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss setup checklist"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", lineHeight: 1, padding: "2px 0", fontSize: 18, flexShrink: 0, marginTop: -1 }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--color-dark)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--color-muted)")}
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--color-cream-2)", margin: "0 16px 2px" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: allRequiredDone ? "var(--color-success)" : "var(--color-amber)",
          borderRadius: 9999,
          transition: "width 0.4s ease, background 0.3s ease",
        }} />
      </div>

      {/* Steps */}
      <div style={{ padding: "6px 0 4px" }}>
        {steps.map((step, idx) => (
          <button
            key={step.key}
            onClick={() => !step.done && onNavigate(step.key)}
            disabled={step.done}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "9px 16px",
              background: "none",
              border: "none",
              borderBottom: idx < steps.length - 1 ? "1px solid var(--color-cream-2)" : "none",
              cursor: step.done ? "default" : "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "background 0.12s",
            }}
            onMouseEnter={e => { if (!step.done) e.currentTarget.style.background = "var(--color-cream)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            {/* Status circle */}
            <div style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: step.done ? "rgba(34,197,94,0.12)" : "var(--color-cream)",
              border: step.done ? "1.5px solid rgba(34,197,94,0.3)" : "1.5px solid var(--color-cream-2)",
              transition: "all 0.2s",
            }}>
              {step.done ? (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="var(--color-success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-cream-2)" }} />
              )}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: step.done ? "var(--color-muted)" : "var(--color-dark)",
                  opacity: step.done ? 0.65 : 1,
                }}>
                  {step.label}
                </span>
                {!step.required && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--color-muted)",
                    background: "var(--color-cream-2)",
                    padding: "1px 6px",
                    borderRadius: 9999,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}>
                    optional
                  </span>
                )}
              </div>
              {!step.done && (
                <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 1, lineHeight: 1.4 }}>
                  {step.hint}
                </div>
              )}
            </div>

            {/* Arrow */}
            {!step.done && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard language card ──────────────────────────────────────────────────

function DashboardLanguageCard({
  business,
  supabase,
}: {
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>;
  supabase: ReturnType<typeof createClient>;
}) {
  const { showToast } = useToast();
  const { t } = useLang();
  const [value, setValue] = useState<"en" | "he">(business.dashboard_lang === "he" ? "he" : "en");
  const [saving, setSaving] = useState(false);

  async function setLang(l: "en" | "he") {
    if (l === value || saving) return;
    const prev = value;
    setValue(l);
    setSaving(true);
    const { error } = await supabase.from("businesses").update({ dashboard_lang: l }).eq("id", business.id);
    setSaving(false);
    if (error) {
      setValue(prev);
      showToast(getErrorMessage(error), "error");
      return;
    }
    // All useBusiness instances (AppShell included) refetch — UI switches instantly.
    window.dispatchEvent(new Event("bapita:business-updated"));
    showToast(t("Saved"), "success");
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionCard title="Dashboard language">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>{t("Dashboard language")}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>{t("The language this dashboard is shown in")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 9999, padding: "3px", gap: 2, background: "var(--color-cream-2)", flexShrink: 0 }}>
            {(["en", "he"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{ padding: "6px 16px", borderRadius: 9999, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s, color 0.15s", background: value === l ? "var(--color-amber)" : "transparent", color: value === l ? "var(--color-surface)" : "var(--color-muted)" }}
              >
                {l === "en" ? "EN" : "עב"}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { business, loading: bizLoading, refresh, isAdmin } = useBusiness();
  const { t } = useLang();
  const supabase = createClient();
  const [activeSection, setActiveSection] = useState<Section>("business");
  const dirtyRef = useRef(false);

  // Deep-link support: /settings?section=team lands directly on that section
  // (used by the "Add staff calendar" link in the calendar sidebar).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("section");
    if (s && SECTIONS.some((sec) => sec.id === s)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSection(s as Section);
    }
  }, []);

  if (bizLoading) return <SettingsSkeleton />;

  if (!business) {
    if (isAdmin) return <SetupForm supabase={supabase} onCreated={refresh} />;
    return <NoBusinessScreen />;
  }

  function handleSectionChange(id: Section) {
    if (dirtyRef.current) {
      if (!window.confirm("You have unsaved changes. Leave without saving?")) return;
      dirtyRef.current = false;
    }
    setActiveSection(id);
  }

  function renderSection() {
    const onDirtyChange = (d: boolean) => { dirtyRef.current = d; };
    switch (activeSection) {
      case "business": return <BusinessSection business={business!} supabase={supabase} refresh={refresh} onDirtyChange={onDirtyChange} />;
      case "services": return <ServicesSection business={business!} supabase={supabase} refresh={refresh} />;
      case "hours":    return <HoursSection business={business!} supabase={supabase} refresh={refresh} onDirtyChange={onDirtyChange} />;
      case "team":     return <TeamSection business={business!} supabase={supabase} refresh={refresh} />;
      case "website":  return <WebsiteSection business={business!} supabase={supabase} refresh={refresh} onDirtyChange={onDirtyChange} which="website" />;
      case "content":  return <WebsiteSection business={business!} supabase={supabase} refresh={refresh} onDirtyChange={onDirtyChange} which="content" />;
      case "payments": return <PaymentsSection business={business!} supabase={supabase} refresh={refresh} />;
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header + chip tabs */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)", padding: "26px 24px 0" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: "0 0 16px" }}>
          {t("Settings")}
        </h1>
        <div style={{ display: "flex", gap: 8, paddingBottom: 18, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {SECTIONS.map((s) => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSectionChange(s.id)}
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
                  color: active ? "var(--color-surface)" : "var(--color-muted)",
                }}
              >
                {t(s.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px 64px" }}>
          <OnboardingChecklist
            business={business}
            supabase={supabase}
            onNavigate={(section) => handleSectionChange(section as Section)}
          />
          {activeSection === "business" && (
            <DashboardLanguageCard business={business!} supabase={supabase} />
          )}
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
