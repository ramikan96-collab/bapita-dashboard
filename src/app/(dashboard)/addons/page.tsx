"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

interface Addon {
  id: string;
  type: "whatsapp" | "stripe" | "google";
  active: boolean;
  activated_at: string | null;
}

const ADDON_CONFIG = {
  whatsapp: {
    name: "WhatsApp Automations",
    description: "Send booking reminders, confirmations, and review requests via WhatsApp automatically.",
    price: "₪99/mo",
    icon: "💬",
  },
  stripe: {
    name: "Stripe Payments",
    description: "Accept online payments. Clients pay when they book. Includes deposit/cancellation policies.",
    price: "₪49/mo + 1.9%",
    icon: "💳",
  },
  google: {
    name: "Google Business",
    description: "Sync your Google Business profile. Show real-time availability, collect reviews.",
    price: "₪79/mo",
    icon: "📈",
  },
};

export default function AddonsPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;

    async function fetchAddons() {
      const { data } = await supabase
        .from("addons")
        .select("*")
        .eq("business_id", business.id);
      
      // If no addons exist, create default entries
      if (!data || data.length === 0) {
        const defaultAddons = [
          { business_id: business.id, type: "whatsapp", active: false },
          { business_id: business.id, type: "stripe", active: false },
          { business_id: business.id, type: "google", active: false },
        ];
        
        const { data: newData } = await supabase
          .from("addons")
          .insert(defaultAddons)
          .select();
        
        setAddons(newData || []);
      } else {
        setAddons(data);
      }
      
      setLoading(false);
    }
    
    fetchAddons();
  }, [business, supabase]);

  async function toggleAddon(addonId: string, currentActive: boolean) {
    setActivating(addonId);
    
    // This would normally contact your backend to activate/deactivate
    // For MVP, just show a contact CTA
    alert("To activate add-ons, please contact us directly: WhatsApp 050-123-4567");
    
    setActivating(null);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
             style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--color-dark)" }}>Add-ons</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
          Supercharge your business with powerful integrations
        </p>
      </div>
      
      {/* Active Add-ons Section */}
      <div className="p-4">
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--color-dark)" }}>Active</h2>
        {addons.filter(a => a.active).length === 0 ? (
          <div className="text-center py-8 rounded-xl border-2 border-dashed" style={{ borderColor: "var(--color-cream-2)" }}>
            <span style={{ fontSize: 32 }}>🔌</span>
            <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>No active add-ons yet</p>
            <p className="text-xs mt-1">Activate one below to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addons.filter(a => a.active).map((addon) => {
              const config = ADDON_CONFIG[addon.type];
              return (
                <div key={addon.id} className="p-4 rounded-xl border-2" style={{ borderColor: "var(--color-amber)", background: "#fef3c7" }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 28 }}>{config.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold">{config.name}</div>
                      <div className="text-xs opacity-60 mt-0.5">{config.description.substring(0, 60)}...</div>
                    </div>
                    <div className="px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white">Active</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Available Add-ons Section */}
      <div className="p-4 pt-0">
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--color-dark)" }}>Available</h2>
        <div className="space-y-3">
          {addons.filter(a => !a.active).map((addon) => {
            const config = ADDON_CONFIG[addon.type];
            return (
              <div key={addon.id} className="p-4 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 28 }}>{config.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold">{config.name}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{config.description}</div>
                    <div className="text-xs font-bold mt-2" style={{ color: "var(--color-amber)" }}>{config.price}</div>
                  </div>
                  <button
                    onClick={() => toggleAddon(addon.id, addon.active)}
                    disabled={activating === addon.id}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "var(--color-amber)" }}
                  >
                    {activating === addon.id ? "..." : "Contact us"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Contact Info */}
      <div className="p-4 mt-auto">
        <div className="p-4 rounded-xl text-center" style={{ background: "var(--color-cream-2)" }}>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--color-dark)" }}>Need a custom add-on?</p>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>We build integrations for your specific needs.</p>
          <button
            onClick={() => window.open("https://wa.me/972501234567", "_blank")}
            className="mt-3 px-5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--color-amber)" }}
          >
            Contact us on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
