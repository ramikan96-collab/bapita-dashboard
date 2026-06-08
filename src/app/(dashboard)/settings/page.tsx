"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import type { Service } from "@/types";

type Tab = "business" | "services" | "hours" | "dates";

function SetupForm({ supabase, onCreated }: { supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>; onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createBusiness() {
    if (!name.trim()) { setError("Business name is required"); return; }
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setSaving(false); return; }

    const { error: insertError } = await supabase
      .from("businesses")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    await onCreated();
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--color-dark)" }}>Set up your business</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Fill in your details to get started</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-sm font-bold mb-1 block">Business name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dana Hair Studio"
            className="w-full px-4 py-3 rounded-xl border"
            style={{ borderColor: "var(--color-cream-2)" }}
          />
        </div>
        <div>
          <label className="text-sm font-bold mb-1 block">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-000-0000"
            className="w-full px-4 py-3 rounded-xl border"
            style={{ borderColor: "var(--color-cream-2)" }}
          />
        </div>
        <div>
          <label className="text-sm font-bold mb-1 block">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, City"
            className="w-full px-4 py-3 rounded-xl border"
            style={{ borderColor: "var(--color-cream-2)" }}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={createBusiness}
          disabled={saving || !name.trim()}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "var(--color-amber)" }}
        >
          {saving ? "Creating..." : "Create business"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { business, loading: bizLoading, refresh } = useBusiness();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("business");
  const [saving, setSaving] = useState(false);
  
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [googleReviewLink, setGoogleReviewLink] = useState("");
  
  const [services, setServices] = useState<Service[]>([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState(30);
  const [newServicePrice, setNewServicePrice] = useState(100);

  useEffect(() => {
    if (business) {
      setBusinessName(business.name || "");
      setBusinessPhone(business.phone || "");
      setBusinessAddress(business.address || "");
      setInstagramUrl(business.instagram_url || "");
      setGoogleReviewLink(business.google_review_link || "");
    }
  }, [business]);

  useEffect(() => {
    if (!business) return;
    
    async function fetchServices() {
      if (!business) return;
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", business.id)
        .order("display_order");

      setServices(data || []);
    }

    fetchServices();
  }, [business, supabase]);

  async function saveBusinessInfo() {
    if (!business) return;
    setSaving(true);
    
    await supabase
      .from("businesses")
      .update({
        name: businessName,
        phone: businessPhone,
        address: businessAddress,
        instagram_url: instagramUrl || null,
        google_review_link: googleReviewLink || null,
      })
      .eq("id", business.id);
    
    setSaving(false);
    await refresh();
    alert("Business info saved");
  }

  async function addService() {
    if (!business || !newServiceName) return;
    setSaving(true);
    
    const { error } = await supabase
      .from("services")
      .insert({
        business_id: business.id,
        name: newServiceName,
        duration: newServiceDuration,
        price: newServicePrice,
        active: true,
        display_order: services.length,
      });
    
    if (!error) {
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
    
    setSaving(false);
  }

  async function deleteService(serviceId: string) {
    if (!confirm("Delete this service?")) return;
    
    await supabase
      .from("services")
      .delete()
      .eq("id", serviceId);
    
    setServices(services.filter(s => s.id !== serviceId));
  }

  async function toggleServiceActive(serviceId: string, currentActive: boolean) {
    await supabase
      .from("services")
      .update({ active: !currentActive })
      .eq("id", serviceId);
    
    setServices(services.map(s => 
      s.id === serviceId ? { ...s, active: !currentActive } : s
    ));
  }

  if (bizLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
             style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!business) {
    return <SetupForm supabase={supabase} onCreated={refresh} />;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--color-dark)" }}>Settings</h1>
      </div>
      
      <div className="shrink-0 px-4 py-2 border-b flex gap-1 overflow-x-auto" style={{ borderColor: "var(--color-cream-2)" }}>
        {[
          { id: "business", label: "Business" },
          { id: "services", label: "Services" },
          { id: "hours", label: "Hours" },
          { id: "dates", label: "Blocked dates" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? "text-white" : "opacity-60"
            }`}
            style={{
              background: activeTab === tab.id ? "var(--color-amber)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--color-dark)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "business" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold mb-1 block">Business name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-4 py-3 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }} />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Phone</label>
              <input type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }} />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Address</label>
              <input type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }} />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Instagram URL (optional)</label>
              <input type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/yourbusiness" className="w-full px-4 py-3 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }} />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Google review link (optional)</label>
              <input type="url" value={googleReviewLink} onChange={(e) => setGoogleReviewLink(e.target.value)} placeholder="https://g.page/r/.../review" className="w-full px-4 py-3 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }} />
            </div>
            <button onClick={saveBusinessInfo} disabled={saving} className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: "var(--color-amber)" }}>{saving ? "Saving..." : "Save changes"}</button>
          </div>
        )}
        
        {activeTab === "services" && (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }}>
                <div className="flex-1">
                  <div className="font-bold">{service.name}</div>
                  <div className="text-xs opacity-60">{service.duration} min · ₪{service.price}</div>
                </div>
                <button onClick={() => toggleServiceActive(service.id, service.active)} className={`px-3 py-1 rounded-lg text-xs font-bold ${service.active ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>{service.active ? "Active" : "Inactive"}</button>
                <button onClick={() => deleteService(service.id)} className="text-red-500 text-xl">×</button>
              </div>
            ))}
            
            {showServiceForm ? (
              <div className="p-4 rounded-xl border-2" style={{ borderColor: "var(--color-amber)" }}>
                <input type="text" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Service name" className="w-full px-4 py-2 rounded-lg border mb-2" />
                <div className="flex gap-2 mb-2">
                  <input type="number" value={newServiceDuration} onChange={(e) => setNewServiceDuration(parseInt(e.target.value))} placeholder="Duration (min)" className="flex-1 px-4 py-2 rounded-lg border" />
                  <input type="number" value={newServicePrice} onChange={(e) => setNewServicePrice(parseInt(e.target.value))} placeholder="Price (₪)" className="flex-1 px-4 py-2 rounded-lg border" />
                </div>
                <div className="flex gap-2">
                  <button onClick={addService} disabled={saving || !newServiceName} className="flex-1 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{ background: "var(--color-amber)" }}>Add</button>
                  <button onClick={() => setShowServiceForm(false)} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--color-cream-2)" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowServiceForm(true)} className="w-full py-3 rounded-xl text-sm font-bold" style={{ background: "var(--color-cream-2)", color: "var(--color-dark)" }}>+ Add service</button>
            )}
          </div>
        )}
        
        {activeTab === "hours" && (
          <p className="text-sm text-center opacity-60 py-8">Business hours configuration coming soon.<br />Default hours: Mon-Fri 9am-7pm, Sat 9am-2pm, Sun closed.</p>
        )}
        
        {activeTab === "dates" && (
          <p className="text-sm text-center opacity-60 py-8">Blocked dates (holidays, vacations) coming soon.<br />Contact support to block dates.</p>
        )}
      </div>
    </div>
  );
}
