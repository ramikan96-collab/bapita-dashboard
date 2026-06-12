"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import type { Service, BusinessHours, DayKey } from "@/types";

type Tab = "business" | "services" | "hours";

// Israeli calendar order: Sun first
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
  monday:    { open: true,  start: "09:00", end: "19:00" },
  tuesday:   { open: true,  start: "09:00", end: "19:00" },
  wednesday: { open: true,  start: "09:00", end: "19:00" },
  thursday:  { open: true,  start: "09:00", end: "19:00" },
  friday:    { open: true,  start: "09:00", end: "16:00" },
  saturday:  { open: false, start: "09:00", end: "14:00" },
  sunday:    { open: true,  start: "09:00", end: "17:00" },
};

const CARD =
  "bg-white rounded-2xl shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]";

// ─── Icons ─────────────────────────────────────────────────────────────────

function IconCopy({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

function IconCheckSm({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function IconExternal({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}

function IconPencil({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  );
}

function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
    </svg>
  );
}

function IconPlus({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function IconScissors({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
      <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
      <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
    </svg>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3 px-1">
      <div>
        <h2 className="text-[17px] font-bold text-dark leading-snug">{title}</h2>
        <p className="text-[13px] text-muted mt-0.5 leading-snug">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-dark">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="h-12 px-4 rounded-[10px] border border-[var(--color-cream-2)]
          bg-white text-[15px] text-dark placeholder:text-muted
          focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20
          hover:border-[#E5DBC8] transition-all"
      />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-11 h-6 rounded-full transition-colors shrink-0 relative active:scale-95"
      style={{ background: on ? "var(--color-amber)" : "var(--color-cream-2)" }}
      aria-checked={on}
      role="switch"
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full"
        style={{
          insetInlineStart: on ? "22px" : "2px",
          boxShadow: "0 1px 3px rgba(30,26,20,0.25)",
          transition: "inset-inline-start 0.18s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </button>
  );
}

// ─── Sticky "unsaved changes" save bar ───────────────────────────────────────

function SaveBar({ visible, onSave, onDiscard }: { visible: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div
      className="shrink-0 border-t bg-white"
      style={{
        borderColor: "var(--color-cream-2)",
        transform: visible ? "translateY(0)" : "translateY(110%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        boxShadow: "0 -6px 28px rgba(30,26,20,0.10)",
        transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease",
      }}
    >
      <div className="flex items-center gap-3 px-5 py-3.5 max-w-2xl mx-auto w-full">
        <span className="flex-1 flex items-center gap-2 text-[14px] font-medium text-dark">
          <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          You have unsaved changes
        </span>
        <button
          onClick={onDiscard}
          className="px-4 py-2.5 rounded-xl text-[14px] font-medium text-dark
            bg-transparent border border-[var(--color-cream-2)] hover:bg-cream active:scale-[0.97] transition-all"
        >
          Discard
        </button>
        <button
          onClick={onSave}
          className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white
            bg-amber hover:bg-[#D4830A] active:bg-[#B86800] active:scale-[0.97]
            shadow-[0_4px_14px_rgba(232,146,10,0.30)] transition-all"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

// ─── Service form (add + edit) ───────────────────────────────────────────────

function ServiceForm({
  title,
  initialName,
  initialDuration,
  initialPrice,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  title: string;
  initialName: string;
  initialDuration: number;
  initialPrice: number;
  submitLabel: string;
  onSubmit: (name: string, duration: number, price: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [duration, setDuration] = useState(initialDuration);
  const [price, setPrice] = useState(initialPrice);

  const numberInput =
    "h-12 px-4 rounded-[10px] border border-[var(--color-cream-2)] bg-white text-[15px] text-dark " +
    "focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 hover:border-[#E5DBC8] transition-all";

  return (
    <div className={`${CARD} p-4 space-y-3`} style={{ animation: "settingsPop 0.22s cubic-bezier(0.16,1,0.3,1)" }}>
      <h3 className="text-[16px] font-bold text-dark">{title}</h3>
      <InputField label="Service name" value={name} onChange={setName} placeholder="e.g. Men's haircut" />
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-dark">Duration (min)</label>
          <input type="number" value={duration} min={5} step={5}
            onChange={(e) => setDuration(parseInt(e.target.value) || 30)} className={numberInput} />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-dark">Price (₪)</label>
          <input type="number" value={price} min={0}
            onChange={(e) => setPrice(parseInt(e.target.value) || 0)} className={numberInput} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSubmit(name.trim(), duration, price)}
          disabled={!name.trim()}
          className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white
            bg-amber hover:bg-[#D4830A] active:scale-[0.98] shadow-[0_4px_14px_rgba(232,146,10,0.25)]
            transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-[15px] font-medium text-dark
            bg-transparent border border-[var(--color-cream-2)] hover:bg-cream active:scale-[0.98] transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── First-time setup ────────────────────────────────────────────────────────

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

  async function createBusiness() {
    if (!name.trim()) return showToast("Business name is required", "error");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return showToast("Not logged in", "error");

    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9א-ת]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      slug,
    });
    if (error) return showToast(error.message, "error");
    await onCreated();
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "var(--color-cream)" }}>
      <div className="w-full max-w-2xl mx-auto px-5 md:px-6 py-10">
        <h1 className="text-[28px] md:text-[32px] font-extrabold leading-tight text-dark">Set up your business</h1>
        <p className="text-[15px] mt-1.5 text-muted">A few details to get you started.</p>
        <div className={`${CARD} p-5 space-y-4 mt-6`}>
          <InputField label="Business name" value={name} onChange={setName} placeholder="e.g. Dana Hair Studio" />
          <InputField label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="050-000-0000" />
          <InputField label="Address" value={address} onChange={setAddress} placeholder="Street, city" />
        </div>
        <button
          onClick={createBusiness}
          disabled={!name.trim()}
          className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white mt-4
            bg-amber hover:bg-[#D4830A] active:scale-[0.98] shadow-[0_4px_14px_rgba(232,146,10,0.25)]
            transition-all disabled:opacity-50 disabled:shadow-none"
        >
          Create business
        </button>
      </div>
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { business, loading: bizLoading, refresh } = useBusiness();
  const { showToast } = useToast();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("business");

  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");

  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);

  const [services, setServices] = useState<Service[]>([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (business) {
      setBusinessName(business.name || "");
      setBusinessPhone(business.phone || "");
      setBusinessAddress(business.address || "");
      setBusinessSlug(business.slug || "");
      setHours(business.business_hours || DEFAULT_HOURS);
    }
  }, [business]);

  useEffect(() => {
    if (!business) return;
    supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .order("display_order")
      .then(({ data }) => setServices(data || []));
  }, [business, supabase]);

  const businessDirty = useMemo(() => {
    if (!business) return false;
    return (
      businessName !== (business.name || "") ||
      businessPhone !== (business.phone || "") ||
      businessAddress !== (business.address || "") ||
      businessSlug !== (business.slug || "")
    );
  }, [business, businessName, businessPhone, businessAddress, businessSlug]);

  const hoursDirty = useMemo(() => {
    if (!business) return false;
    return JSON.stringify(hours) !== JSON.stringify(business.business_hours || DEFAULT_HOURS);
  }, [business, hours]);

  const saveBarVisible =
    (activeTab === "business" && businessDirty) || (activeTab === "hours" && hoursDirty);

  function discardChanges() {
    if (!business) return;
    if (activeTab === "business") {
      setBusinessName(business.name || "");
      setBusinessPhone(business.phone || "");
      setBusinessAddress(business.address || "");
      setBusinessSlug(business.slug || "");
    } else if (activeTab === "hours") {
      setHours(business.business_hours || DEFAULT_HOURS);
    }
  }

  async function saveChanges() {
    if (!business) return;
    if (activeTab === "business") {
      let finalSlug = businessSlug;
      if (!finalSlug?.trim()) {
        const baseSlug = businessName.trim().toLowerCase().replace(/[^a-z0-9א-ת]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
        setBusinessSlug(finalSlug);
      }
      const { error } = await supabase
        .from("businesses")
        .update({ name: businessName, phone: businessPhone || null, address: businessAddress || null, slug: finalSlug })
        .eq("id", business.id);
      if (error) return showToast("Could not save changes", "error");
      await refresh();
      showToast("Changes saved", "success");
    } else if (activeTab === "hours") {
      const { error } = await supabase.from("businesses").update({ business_hours: hours }).eq("id", business.id);
      if (error) return showToast("Could not save hours", "error");
      await refresh();
      showToast("Hours saved", "success");
    }
  }

  async function reloadServices() {
    if (!business) return;
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .order("display_order");
    setServices(data || []);
  }

  async function addService(name: string, duration: number, price: number) {
    if (!business || !name) return;
    const { error } = await supabase.from("services").insert({
      business_id: business.id, name, duration, price, active: true, display_order: services.length,
    });
    if (error) return showToast("Could not add service", "error");
    setShowServiceForm(false);
    await reloadServices();
    showToast("Service added", "success");
  }

  async function updateService(id: string, name: string, duration: number, price: number) {
    if (!name) return;
    const { error } = await supabase.from("services").update({ name, duration, price }).eq("id", id);
    if (error) return showToast("Could not update service", "error");
    setEditingId(null);
    await reloadServices();
    showToast("Service updated", "success");
  }

  async function deleteService(serviceId: string) {
    await supabase.from("services").delete().eq("id", serviceId);
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    showToast("Service removed", "success");
  }

  async function toggleServiceActive(serviceId: string, currentActive: boolean) {
    await supabase.from("services").update({ active: !currentActive }).eq("id", serviceId);
    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, active: !currentActive } : s)));
  }

  function applyHoursToAll() {
    const template = DAYS.map((d) => hours[d.key]).find((h) => h.open);
    if (!template) return;
    setHours((h) => {
      const next = { ...h };
      (Object.keys(next) as DayKey[]).forEach((k) => {
        if (next[k].open) next[k] = { ...next[k], start: template.start, end: template.end };
      });
      return next;
    });
    showToast("Applied to all open days", "success");
  }

  function copySlug() {
    navigator.clipboard?.writeText(`bapita.com/${businessSlug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (bizLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!business) return <SetupForm supabase={supabase} onCreated={refresh} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "services", label: "Services" },
    { id: "hours", label: "Hours" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <style>{`
        @keyframes settingsFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes settingsPop  { from { opacity: 0; transform: translateY(6px) scale(0.99); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Scroll area — full width, content centered inside */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-5 md:px-6 pt-8 pb-10">
          {/* Title */}
          <h1 className="text-[28px] md:text-[32px] font-extrabold leading-tight text-dark mb-5">Settings</h1>

          {/* Segmented tabs */}
          <div className="inline-flex p-1 rounded-full mb-7" style={{ background: "var(--color-cream-2)" }}>
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-5 py-2 rounded-full text-[14px] font-semibold transition-all active:scale-[0.97]"
                  style={{
                    background: active ? "#fff" : "transparent",
                    color: active ? "var(--color-dark)" : "var(--color-muted)",
                    boxShadow: active ? "0 1px 3px rgba(30,26,20,0.10)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content (fades on switch) */}
          <div key={activeTab} style={{ animation: "settingsFade 0.28s cubic-bezier(0.16,1,0.3,1)" }}>
            {/* ─── Business ─── */}
            {activeTab === "business" && (
              <div className="space-y-8">
                <section>
                  <SectionHeader title="Business details" subtitle="How your shop shows up to customers." />
                  <div className={`${CARD} p-5 space-y-4`}>
                    <InputField label="Business name" value={businessName} onChange={setBusinessName} placeholder="e.g. Dana Hair Studio" />
                    <InputField label="Phone" type="tel" value={businessPhone} onChange={setBusinessPhone} placeholder="050-000-0000" />
                    <InputField label="Address" value={businessAddress} onChange={setBusinessAddress} placeholder="Street, city" />
                  </div>
                </section>

                <section>
                  <SectionHeader title="Booking page" subtitle="The link customers use to book you online." />
                  <div className={`${CARD} p-5 space-y-3`}>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-dark">Your address</label>
                      <div className="flex items-center h-12 rounded-[10px] border border-[var(--color-cream-2)] bg-white overflow-hidden
                        focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/20 hover:border-[#E5DBC8] transition-all">
                        <span className="px-3 text-[13px] font-medium text-muted bg-[var(--color-cream)] border-e border-[var(--color-cream-2)] h-full flex items-center shrink-0">
                          bapita.com/
                        </span>
                        <input
                          type="text"
                          value={businessSlug}
                          onChange={(e) => setBusinessSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          placeholder="your-slug"
                          className="flex-1 h-full px-3 text-[15px] text-dark placeholder:text-muted bg-transparent outline-none"
                        />
                      </div>
                      <p className="text-[12px] text-muted">Lowercase letters, numbers and hyphens only.</p>
                    </div>

                    {businessSlug && (
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--color-cream)" }}>
                        <span className="flex-1 min-w-0 text-[14px] font-semibold text-dark truncate">bapita.com/{businessSlug}</span>
                        <button onClick={copySlug}
                          className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-[13px] font-medium text-muted hover:text-dark hover:bg-white active:scale-95 transition-all"
                          aria-label="Copy link">
                          {copied ? <span className="text-[#16A34A]"><IconCheckSm /></span> : <IconCopy />}
                          {copied ? "Copied" : "Copy"}
                        </button>
                        <a href={`https://bapita.com/${businessSlug}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-[13px] font-medium text-muted hover:text-dark hover:bg-white active:scale-95 transition-all">
                          <IconExternal />
                          Visit
                        </a>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ─── Services ─── */}
            {activeTab === "services" && (
              <section>
                <SectionHeader title="Services" subtitle="What clients can book, how long it takes, and the price." />
                <div className="space-y-3">
                  {services.length === 0 && !showServiceForm && (
                    <div className={`${CARD} p-8 text-center`}>
                      <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(232,146,10,0.1)" }}>
                        <IconScissors />
                      </div>
                      <p className="text-[16px] font-semibold text-dark mb-1">No services yet</p>
                      <p className="text-[13px] text-muted">Add the services you offer so clients can book them.</p>
                    </div>
                  )}

                  {services.map((service) =>
                    editingId === service.id ? (
                      <ServiceForm
                        key={service.id}
                        title="Edit service"
                        initialName={service.name}
                        initialDuration={service.duration}
                        initialPrice={service.price}
                        submitLabel="Save service"
                        onSubmit={(n, d, p) => updateService(service.id, n, d, p)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div key={service.id}
                        className={`${CARD} p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(30,26,20,0.08),0_6px_18px_rgba(30,26,20,0.08)]`}>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-semibold text-dark truncate">{service.name}</div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium" style={{ background: "var(--color-cream)", color: "var(--color-muted)" }}>
                                {service.duration} min
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: "rgba(232,146,10,0.10)", color: "var(--color-amber-dark)" }}>
                                ₪{service.price}
                              </span>
                              {!service.active && (
                                <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium" style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}>
                                  Hidden
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Toggle on={service.active} onChange={() => toggleServiceActive(service.id, service.active)} />
                            <button onClick={() => { setEditingId(service.id); setShowServiceForm(false); }}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-dark hover:bg-cream active:scale-90 transition-all"
                              aria-label="Edit service">
                              <IconPencil />
                            </button>
                            <button onClick={() => deleteService(service.id)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-[#EF4444]/8 active:scale-90"
                              style={{ color: "#EF4444" }} aria-label="Delete service">
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {showServiceForm ? (
                    <ServiceForm
                      title="New service"
                      initialName=""
                      initialDuration={30}
                      initialPrice={100}
                      submitLabel="Add service"
                      onSubmit={addService}
                      onCancel={() => setShowServiceForm(false)}
                    />
                  ) : (
                    <button
                      onClick={() => { setShowServiceForm(true); setEditingId(null); }}
                      className="w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2
                        bg-transparent border-2 border-dashed text-muted
                        hover:border-amber hover:text-amber hover:bg-amber/[0.03] active:scale-[0.99] transition-all"
                      style={{ borderColor: "var(--color-cream-2)" }}
                    >
                      <IconPlus />
                      Add service
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* ─── Hours ─── */}
            {activeTab === "hours" && (
              <section>
                <SectionHeader
                  title="Business hours"
                  subtitle="When clients can book appointments."
                  action={
                    <button onClick={applyHoursToAll}
                      className="shrink-0 text-[13px] font-semibold text-amber hover:text-[#B86800] active:scale-95 transition-all whitespace-nowrap">
                      Apply to all open days
                    </button>
                  }
                />
                <div className={`${CARD} overflow-hidden`}>
                  {DAYS.map(({ key, label }, idx) => (
                    <div key={key}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                      style={{
                        borderBottom: idx < DAYS.length - 1 ? "1px solid var(--color-cream-2)" : "none",
                        background: hours[key].open ? "white" : "var(--color-cream)",
                      }}>
                      <Toggle on={hours[key].open}
                        onChange={() => setHours((h) => ({ ...h, [key]: { ...h[key], open: !h[key].open } }))} />
                      <span className="w-24 text-[15px] font-semibold shrink-0"
                        style={{ color: hours[key].open ? "var(--color-dark)" : "var(--color-muted)" }}>
                        {label}
                      </span>
                      {hours[key].open ? (
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <input type="time" value={hours[key].start}
                            onChange={(e) => setHours((h) => ({ ...h, [key]: { ...h[key], start: e.target.value } }))}
                            className="h-9 px-2 rounded-[8px] border border-[var(--color-cream-2)] text-[14px] text-dark focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 transition-all" />
                          <span className="text-[13px] text-muted">to</span>
                          <input type="time" value={hours[key].end}
                            onChange={(e) => setHours((h) => ({ ...h, [key]: { ...h[key], end: e.target.value } }))}
                            className="h-9 px-2 rounded-[8px] border border-[var(--color-cream-2)] text-[14px] text-dark focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 transition-all" />
                        </div>
                      ) : (
                        <span className="flex-1 text-end text-[13px] text-muted">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <SaveBar visible={saveBarVisible} onSave={saveChanges} onDiscard={discardChanges} />
    </div>
  );
}
