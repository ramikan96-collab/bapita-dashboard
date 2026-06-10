"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/components/Toast";
import type { Service, BusinessHours, DayKey } from "@/types";

type Tab = "business" | "services" | "hours";

// Israeli calendar order: Sun first
const DAYS: { key: DayKey; label: string; labelShort: string }[] = [
  { key: "sunday",    label: "ראשון",   labelShort: "א'" },
  { key: "monday",    label: "שני",     labelShort: "ב'" },
  { key: "tuesday",   label: "שלישי",   labelShort: "ג'" },
  { key: "wednesday", label: "רביעי",   labelShort: "ד'" },
  { key: "thursday",  label: "חמישי",   labelShort: "ה'" },
  { key: "friday",    label: "שישי",    labelShort: "ו'" },
  { key: "saturday",  label: "שבת",     labelShort: "ש'" },
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

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-dark">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="h-12 px-4 rounded-[10px] border border-[var(--color-cream-2)]
          bg-white text-[15px] text-dark placeholder:text-muted
          focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30
          transition-colors disabled:opacity-50"
        style={readOnly ? { opacity: 0.6, cursor: "not-allowed" } : {}}
      />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-11 h-6 rounded-full transition-colors shrink-0 relative"
      style={{ background: on ? "var(--color-amber)" : "var(--color-cream-2)" }}
      aria-checked={on}
      role="switch"
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
        style={{ insetInlineStart: on ? "22px" : "2px" }}
      />
    </button>
  );
}

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
    if (!name.trim()) {
      showToast("Business name is required", "error");
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast("Not logged in", "error");
      setSaving(false);
      return;
    }

    // Generate slug from name
    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9א-ת]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${randomSuffix}`;

    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      slug,
    });

    if (error) {
      showToast(error.message, "error");
      setSaving(false);
      return;
    }

    await onCreated();
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <div className="shrink-0 px-4 pt-6 pb-4 border-b border-[var(--color-cream-2)] bg-white">
        <h1 className="text-[28px] font-extrabold leading-tight text-dark">הגדרת העסק</h1>
        <p className="text-[15px] mt-1 text-muted">מלא את הפרטים כדי להתחיל</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)] space-y-4">
          <InputField label="שם העסק *" value={name} onChange={setName} placeholder='לדוגמה: סטודיו שיער דנה' />
          <InputField label="טלפון" type="tel" value={phone} onChange={setPhone} placeholder="050-000-0000" />
          <InputField label="כתובת" value={address} onChange={setAddress} placeholder="רחוב, עיר" />
        </div>
        <button
          onClick={createBusiness}
          disabled={saving || !name.trim()}
          className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white
            bg-amber hover:bg-[#D4830A] active:bg-[#B86800] transition-colors disabled:opacity-50"
        >
          {saving ? "יוצר..." : "צור עסק"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { business, loading: bizLoading, refresh } = useBusiness();
  const { showToast } = useToast();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("business");
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [savingHours, setSavingHours] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState(30);
  const [newServicePrice, setNewServicePrice] = useState(100);
  const [savingService, setSavingService] = useState(false);

  useEffect(() => {
    if (business) {
      setBusinessName(business.name || "");
      setBusinessPhone(business.phone || "");
      setBusinessAddress(business.address || "");
      setBusinessSlug(business.slug || "");
      if (business.business_hours) setHours(business.business_hours);
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

  async function saveBusinessInfo() {
    if (!business) return;
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name: businessName,
        phone: businessPhone || null,
        address: businessAddress || null,
        slug: businessSlug || null,
      })
      .eq("id", business.id);
    setSaving(false);
    if (error) {
      showToast("שגיאה בשמירה", "error");
    } else {
      await refresh();
      showToast("הפרטים נשמרו בהצלחה", "success");
    }
  }

  async function saveHours() {
    if (!business) return;
    setSavingHours(true);
    const { error } = await supabase
      .from("businesses")
      .update({ business_hours: hours })
      .eq("id", business.id);
    setSavingHours(false);
    if (error) {
      showToast("שגיאה בשמירה", "error");
    } else {
      await refresh();
      showToast("שעות הפעילות נשמרו", "success");
    }
  }

  async function addService() {
    if (!business || !newServiceName.trim()) return;
    setSavingService(true);
    const { error } = await supabase.from("services").insert({
      business_id: business.id,
      name: newServiceName.trim(),
      duration: newServiceDuration,
      price: newServicePrice,
      active: true,
      display_order: services.length,
    });
    if (error) {
      showToast("שגיאה בהוספת שירות", "error");
    } else {
      setNewServiceName("");
      setNewServiceDuration(30);
      setNewServicePrice(100);
      setShowServiceForm(false);
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", business.id)
        .order("display_order");
      setServices(data || []);
    }
    setSavingService(false);
  }

  async function deleteService(serviceId: string) {
    await supabase.from("services").delete().eq("id", serviceId);
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  }

  async function toggleServiceActive(serviceId: string, currentActive: boolean) {
    await supabase.from("services").update({ active: !currentActive }).eq("id", serviceId);
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, active: !currentActive } : s))
    );
  }

  if (bizLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!business) {
    return <SetupForm supabase={supabase} onCreated={refresh} />;
  }

  const tabs = [
    { id: "business" as Tab, label: "פרטי העסק" },
    { id: "services" as Tab, label: "שירותים" },
    { id: "hours" as Tab, label: "שעות פעילות" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-0 bg-white border-b border-[var(--color-cream-2)]">
        <h1 className="text-[28px] font-extrabold leading-tight text-dark mb-4">הגדרות</h1>
        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 pb-3 pt-1 text-[14px] font-semibold whitespace-nowrap transition-colors relative"
              style={{
                color: activeTab === tab.id ? "var(--color-dark)" : "var(--color-muted)",
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 start-2 end-2 h-0.5 rounded-full"
                  style={{ background: "var(--color-amber)" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ─── Business Info ─── */}
        {activeTab === "business" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)] space-y-4">
              <InputField label="שם העסק" value={businessName} onChange={setBusinessName} placeholder='לדוגמה: סטודיו שיער דנה' />
              <InputField label="טלפון" type="tel" value={businessPhone} onChange={setBusinessPhone} placeholder="050-000-0000" />
              <InputField label="כתובת" value={businessAddress} onChange={setBusinessAddress} placeholder="רחוב, עיר" />
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-dark">כתובת דף ההזמנה</label>
                <div className="flex items-center h-12 rounded-[10px] border border-[var(--color-cream-2)] bg-white overflow-hidden
                  focus-within:border-amber focus-within:ring-1 focus-within:ring-amber/30 transition-colors">
                  <span className="px-3 text-[13px] font-medium text-muted bg-[var(--color-cream)] border-e border-[var(--color-cream-2)] h-full flex items-center shrink-0">
                    bapita.com/
                  </span>
                  <input
                    type="text"
                    value={businessSlug}
                    onChange={(e) => setBusinessSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="slug-שלך"
                    className="flex-1 h-full px-3 text-[15px] text-dark placeholder:text-muted bg-transparent outline-none"
                  />
                </div>
                <p className="text-[12px] text-muted">רק אותיות לטיניות קטנות, מספרים ומקפים</p>
              </div>
            </div>
            <button
              onClick={saveBusinessInfo}
              disabled={saving}
              className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white
                bg-amber hover:bg-[#D4830A] active:bg-[#B86800] transition-colors disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור שינויים"}
            </button>
          </div>
        )}

        {/* ─── Services ─── */}
        {activeTab === "services" && (
          <div className="space-y-3">
            {services.length === 0 && !showServiceForm && (
              <div className="bg-white rounded-2xl p-8 text-center shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "rgba(232,146,10,0.1)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                  </svg>
                </div>
                <p className="text-[15px] font-semibold text-dark mb-1">אין שירותים עדיין</p>
                <p className="text-[13px] text-muted">הוסף את השירותים שאתה מציע</p>
              </div>
            )}

            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-dark truncate">{service.name}</div>
                    <div className="text-[13px] text-muted mt-0.5">
                      {service.duration} דקות · ₪{service.price}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleServiceActive(service.id, service.active)}
                      className="px-3 py-1 rounded-full text-[12px] font-medium transition-colors"
                      style={
                        service.active
                          ? { background: "rgba(34,197,94,0.12)", color: "#16A34A" }
                          : { background: "var(--color-cream-2)", color: "var(--color-muted)" }
                      }
                    >
                      {service.active ? "פעיל" : "לא פעיל"}
                    </button>
                    <button
                      onClick={() => deleteService(service.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[#EF4444]/8"
                      style={{ color: "#EF4444" }}
                      aria-label="מחק שירות"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {showServiceForm ? (
              <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)] space-y-3">
                <h3 className="text-[16px] font-bold text-dark">שירות חדש</h3>
                <InputField
                  label="שם השירות"
                  value={newServiceName}
                  onChange={setNewServiceName}
                  placeholder='לדוגמה: תספורת גברים'
                />
                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-dark">משך (דקות)</label>
                    <input
                      type="number"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(parseInt(e.target.value) || 30)}
                      min={5}
                      step={5}
                      className="h-12 px-4 rounded-[10px] border border-[var(--color-cream-2)]
                        bg-white text-[15px] text-dark focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-dark">מחיר (₪)</label>
                    <input
                      type="number"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(parseInt(e.target.value) || 0)}
                      min={0}
                      className="h-12 px-4 rounded-[10px] border border-[var(--color-cream-2)]
                        bg-white text-[15px] text-dark focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={addService}
                    disabled={savingService || !newServiceName.trim()}
                    className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white
                      bg-amber hover:bg-[#D4830A] transition-colors disabled:opacity-50"
                  >
                    {savingService ? "מוסיף..." : "הוסף שירות"}
                  </button>
                  <button
                    onClick={() => { setShowServiceForm(false); setNewServiceName(""); }}
                    className="flex-1 py-3 rounded-xl text-[15px] font-medium text-dark
                      bg-transparent border border-[var(--color-cream-2)] hover:bg-cream transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowServiceForm(true)}
                className="w-full py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2
                  bg-white border border-[var(--color-cream-2)] text-dark
                  hover:border-amber hover:text-amber transition-colors
                  shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                הוסף שירות
              </button>
            )}
          </div>
        )}

        {/* ─── Business Hours ─── */}
        {activeTab === "hours" && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
              {DAYS.map(({ key, label }, idx) => (
                <div
                  key={key}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderBottom: idx < DAYS.length - 1 ? "1px solid var(--color-cream-2)" : "none",
                    background: hours[key].open ? "white" : "var(--color-cream)",
                  }}
                >
                  <Toggle
                    on={hours[key].open}
                    onChange={() =>
                      setHours((h) => ({
                        ...h,
                        [key]: { ...h[key], open: !h[key].open },
                      }))
                    }
                  />
                  <span
                    className="w-14 text-[15px] font-semibold shrink-0"
                    style={{ color: hours[key].open ? "var(--color-dark)" : "var(--color-muted)" }}
                  >
                    {label}
                  </span>
                  {hours[key].open ? (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <input
                        type="time"
                        value={hours[key].start}
                        onChange={(e) =>
                          setHours((h) => ({
                            ...h,
                            [key]: { ...h[key], start: e.target.value },
                          }))
                        }
                        className="h-9 px-2 rounded-[8px] border border-[var(--color-cream-2)]
                          text-[14px] text-dark focus:outline-none focus:border-amber transition-colors"
                      />
                      <span className="text-[13px] text-muted">–</span>
                      <input
                        type="time"
                        value={hours[key].end}
                        onChange={(e) =>
                          setHours((h) => ({
                            ...h,
                            [key]: { ...h[key], end: e.target.value },
                          }))
                        }
                        className="h-9 px-2 rounded-[8px] border border-[var(--color-cream-2)]
                          text-[14px] text-dark focus:outline-none focus:border-amber transition-colors"
                      />
                    </div>
                  ) : (
                    <span className="flex-1 text-end text-[13px] text-muted">סגור</span>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={saveHours}
              disabled={savingHours}
              className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white
                bg-amber hover:bg-[#D4830A] active:bg-[#B86800] transition-colors disabled:opacity-50"
            >
              {savingHours ? "שומר..." : "שמור שעות"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
