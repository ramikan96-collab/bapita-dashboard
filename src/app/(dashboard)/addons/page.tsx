"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

type AddonType = "whatsapp" | "stripe" | "google" | "social" | "ads";

interface Addon {
  id: string;
  type: AddonType;
  active: boolean;
  activated_at: string | null;
}

interface AddonConfig {
  name: string;
  description: string;
  icon: React.ReactNode;
  waMsg: string;
}

const WA_NUMBER = "972501234567";
const COMING_SOON: AddonType[] = ["social", "ads"];

// Feature lists for each add-on
const ADDON_FEATURES: Record<AddonType, string[]> = {
  whatsapp: [
    "Auto reminders 24h before",
    "Booking confirmations",
    "Post-appointment review requests",
    "Two-way customer chat"
  ],
  stripe: [
    "Online payments at booking",
    "Deposit & cancellation policies",
    "Automatic invoices",
    "Refund management"
  ],
  google: [
    "Live availability on Google",
    "Review collection",
    "Click-to-book from search",
    "Analytics dashboard"
  ],
  social: [
    "Coming soon — Auto-post to Instagram & Facebook",
    "Share reviews",
    "Promote last-minute openings"
  ],
  ads: [
    "Coming soon — Managed Google & Meta campaigns",
    "Audience targeting",
    "Performance reporting"
  ]
};

// Tooltip descriptions for each feature
const FEATURE_TOOLTIPS: Record<string, string> = {
  "Auto reminders 24h before": "Sends automatic WhatsApp reminder 24 hours before appointment time",
  "Booking confirmations": "Instant confirmation sent to customer when they book",
  "Post-appointment review requests": "Asks customers for a review after service completion",
  "Two-way customer chat": "Chat with customers directly through WhatsApp",
  "Online payments at booking": "Customers pay instantly when scheduling",
  "Deposit & cancellation policies": "Set deposit requirements and cancellation fees",
  "Automatic invoices": "Generate and send invoices automatically",
  "Refund management": "Process refunds directly from dashboard",
  "Live availability on Google": "Show real-time availability in Google Search",
  "Review collection": "Collect and manage Google reviews",
  "Click-to-book from search": "Customers book directly from Google",
  "Analytics dashboard": "Track views, clicks, and bookings from Google",
  "Coming soon — Auto-post to Instagram & Facebook": "Automatically post to social media - launching soon",
  "Share reviews": "Share customer reviews to social media - launching soon",
  "Promote last-minute openings": "Auto-promote open slots - launching soon",
  "Coming soon — Managed Google & Meta campaigns": "Professional ad management - launching soon",
  "Audience targeting": "Precise audience targeting - launching soon",
  "Performance reporting": "Detailed campaign analytics - launching soon"
};

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

const ADDON_CATALOG: Record<AddonType, AddonConfig> = {
  whatsapp: {
    name: "WhatsApp Automations",
    description: "Reminders, confirmations, and reviews — sent automatically via WhatsApp.",
    icon: <WhatsAppIcon />,
    waMsg: "Hi, I want to activate WhatsApp Automations",
  },
  stripe: {
    name: "Online Payments",
    description: "Customers pay at booking. Includes cancellation policy and deposit support.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    ),
    waMsg: "Hi, I want to activate Online Payments via Stripe",
  },
  google: {
    name: "Google Business",
    description: "Sync with Google Business Profile. Show real-time availability and collect reviews.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    ),
    waMsg: "Hi, I want to sync Google Business",
  },
  social: {
    name: "Social Media",
    description: "Auto-post to Instagram and Facebook. Increase digital presence.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    ),
    waMsg: "Hi, I want to activate Social Media integration",
  },
  ads: {
    name: "Ad Management",
    description: "Google & Meta campaigns managed for you. More customers, less work.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
    waMsg: "Hi, I want to activate Ad Management service",
  },
};

const ALL_TYPES: AddonType[] = ["whatsapp", "stripe", "google", "social", "ads"];

function contactUs(msg: string) {
  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/${WA_NUMBER}?text=${encoded}`, "_blank");
}

// Tooltip component
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(!show)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1E1A14] text-white text-[11px] leading-relaxed rounded-lg whitespace-nowrap z-50 pointer-events-none shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1E1A14]" />
        </div>
      )}
    </div>
  );
}

export default function AddonsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappUsage, setWhatsappUsage] = useState<number | null>(null);
  const [stripeConnected, setStripeConnected] = useState<boolean>(false);

  useEffect(() => {
    async function fetchAddons() {
      if (!business) { 
        setLoading(false); 
        return; 
      }

      // Check Stripe connection
      if (business.stripe_account_id) {
        setStripeConnected(true);
      }

      // Fetch WhatsApp usage for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: msgCount } = await supabase
        .from('messages_log')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('created_at', startOfMonth.toISOString());
      
      setWhatsappUsage(msgCount || 0);

      const { data } = await supabase
        .from("addons")
        .select("*")
        .eq("business_id", business.id);

      if (!data || data.length === 0) {
        const defaults = ALL_TYPES.map((type) => ({
          business_id: business.id,
          type,
          active: false,
        }));
        const { data: newData } = await supabase
          .from("addons")
          .insert(defaults)
          .select();
        setAddons(newData || []);
      } else {
        const existing = new Set(data.map((a: Addon) => a.type));
        const missing = ALL_TYPES.filter((t) => !existing.has(t)).map((type) => ({
          business_id: business.id,
          type,
          active: false,
        }));
        if (missing.length) {
          const { data: added } = await supabase.from("addons").insert(missing).select();
          setAddons([...data, ...(added || [])]);
        } else {
          setAddons(data);
        }
      }
      setLoading(false);
    }
    fetchAddons();
  }, [business, supabase]);

  if (bizLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center"
        style={{ background: "var(--color-cream)" }}>
        <p className="text-[15px] text-muted mb-4">Set up your business first in settings</p>
        <a href="/settings" className="px-5 py-3 rounded-xl text-[15px] font-semibold text-white bg-amber">
          Go to Settings
        </a>
      </div>
    );
  }

  const activeAddons = addons.filter((a) => a.active);
  const inactiveAddons = addons.filter((a) => !a.active);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-[var(--color-cream-2)] bg-white">
        <h1 className="text-[28px] font-extrabold leading-tight text-dark">Extras</h1>
        <p className="text-[15px] mt-1 text-muted">Upgrade your business with smart integrations</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Active Extras */}
        {activeAddons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-dark uppercase tracking-wide">Active</span>
              <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white"
                style={{ background: "var(--color-amber)" }}>
                {activeAddons.length}
              </span>
            </div>
            {activeAddons.map((addon) => {
              const cfg = ADDON_CATALOG[addon.type as AddonType];
              const features = ADDON_FEATURES[addon.type as AddonType];
              const isComingSoon = COMING_SOON.includes(addon.type as AddonType);
              if (!cfg) return null;
              
              return (
                <div
                  key={addon.id}
                  className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]"
                  style={{ borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--color-amber)" }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)" }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-bold text-dark">{cfg.name}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(232,146,10,0.15)", color: "#B86800" }}>
                          Active
                        </span>
                      </div>
                      <p className="text-[13px] text-muted mt-1 leading-relaxed">{cfg.description}</p>
                      
                      {/* Feature list with tooltips */}
                      <ul className="mt-3 space-y-1.5">
                        {features.map((feature, idx) => (
                          <Tooltip key={idx} content={FEATURE_TOOLTIPS[feature] || feature}>
                            <li className="text-[13px] text-muted flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-[var(--color-amber)]" />
                              {feature}
                            </li>
                          </Tooltip>
                        ))}
                      </ul>

                      {/* Usage information */}
                      {addon.type === "whatsapp" && whatsappUsage !== null && (
                        <div className="mt-3 pt-2 text-[12px] font-medium" style={{ color: "var(--color-amber)" }}>
                          📨 {whatsappUsage} messages this month
                        </div>
                      )}
                      {addon.type === "stripe" && (
                        <div className="mt-3 pt-2 text-[12px]" style={{ color: stripeConnected ? "var(--color-amber)" : "var(--color-muted)" }}>
                          {stripeConnected ? "💳 Ready to accept payments" : "⚙️ Connect Stripe in settings to start"}
                        </div>
                      )}
                      {addon.type === "google" && (
                        <div className="mt-3 pt-2 text-[12px]" style={{ color: "var(--color-muted)" }}>
                          🔗 Configure in settings to see insights
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Pause button for active extras */}
                  {!isComingSoon && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-cream-2)]">
                      <button
                        onClick={() => contactUs(`I want to pause ${cfg.name} for ${business.name}`)}
                        className="text-[13px] font-semibold transition-colors hover:opacity-70"
                        style={{ color: "var(--color-muted)" }}
                      >
                        Pause extra →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Available Extras */}
        {inactiveAddons.length > 0 && (
          <div className="space-y-3">
            <span className="text-[13px] font-semibold text-dark uppercase tracking-wide">
              {activeAddons.length > 0 ? "Available to activate" : "All extras"}
            </span>
            {inactiveAddons.map((addon) => {
              const cfg = ADDON_CATALOG[addon.type as AddonType];
              const features = ADDON_FEATURES[addon.type as AddonType];
              const isComingSoon = COMING_SOON.includes(addon.type as AddonType);
              if (!cfg) return null;
              
              return (
                <div
                  key={addon.id}
                  className={`bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)] ${
                    isComingSoon ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--color-cream)", color: isComingSoon ? "var(--color-muted)" : "var(--color-amber)" }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-bold text-dark">{cfg.name}</span>
                        {isComingSoon && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-muted mt-1 leading-relaxed">{cfg.description}</p>
                      
                      {/* Feature list with tooltips */}
                      <ul className="mt-3 space-y-1.5">
                        {features.map((feature, idx) => (
                          <Tooltip key={idx} content={FEATURE_TOOLTIPS[feature] || feature}>
                            <li className="text-[13px] text-muted flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-[var(--color-amber)]" />
                              {feature}
                            </li>
                          </Tooltip>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Request or Coming Soon button */}
                  {!isComingSoon && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-cream-2)]">
                      <button
                        onClick={() => contactUs(cfg.waMsg)}
                        className="w-full py-2.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2
                          text-white bg-[#25D366] hover:bg-[#1da851] active:bg-[#18a349] transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                        </svg>
                        Request via WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Custom extra CTA */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--color-cream)", color: "var(--color-muted)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-dark">Need a custom extra?</div>
              <p className="text-[13px] text-muted mt-1">We build integrations for your specific needs.</p>
              <button
                onClick={() => contactUs("Hi, I need a custom integration for my business")}
                className="mt-3 text-[13px] font-semibold transition-colors"
                style={{ color: "var(--color-amber)" }}
              >
                Talk to us →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
