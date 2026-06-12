"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

type AddonType = "stripe" | "whatsapp" | "google" | "social" | "ads";

interface Addon {
  id: string;
  type: AddonType;
  active: boolean;
  activated_at: string | null;
}

const WA_NUMBER = "972501234567";
const ORDER: AddonType[] = ["stripe", "whatsapp", "google", "social", "ads"];

// ─── Icons ───────────────────────────────────────────────────────────────────

type IconProps = { size?: number };

function IconPayments({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  );
}

function IconReminders({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function IconReviews({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
}

function IconSocial({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

function IconAds({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.07 9.18 19.79 19.79 0 0 1 .69 .57 2 2 0 0 1 2 .07H5a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L6.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 20 15h.92z"></path>
    </svg>
  );
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

interface CatalogEntry {
  name: string;
  tagline: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  waMsg: string;
  statLabels: string[];
}

const CATALOG: Record<AddonType, CatalogEntry> = {
  stripe: {
    name: "Online Payments",
    tagline: "Get paid at booking",
    description: "Clients pay a deposit when they book. Fewer no-shows, guaranteed revenue.",
    color: "#635BFF",
    icon: <IconPayments />,
    waMsg: "Hi, I want to set up online payments for my business",
    statLabels: ["Payments", "Volume", "Payouts"],
  },
  whatsapp: {
    name: "Booking Reminders",
    tagline: "Cut no-shows",
    description: "Automatic WhatsApp messages confirm every booking and remind clients before the day.",
    color: "#25D366",
    icon: <IconReminders />,
    waMsg: "Hi, I want to enable booking reminders for my clients",
    statLabels: ["Sent this month", "Confirmations", "Reviews asked"],
  },
  google: {
    name: "Reviews & Reputation",
    tagline: "More 5-star reviews",
    description: "Automatically ask happy clients for a Google review right after their appointment.",
    color: "#4285F4",
    icon: <IconReviews />,
    waMsg: "Hi, I want to start collecting Google reviews automatically",
    statLabels: ["Profile views", "New reviews"],
  },
  social: {
    name: "Social Media",
    tagline: "Always active, never busy",
    description: "Auto-post your work to Instagram and Facebook. Stay visible without the effort.",
    color: "#E1306C",
    icon: <IconSocial />,
    waMsg: "Hi, I want to automate my social media posts",
    statLabels: ["Posts shared", "Total reach"],
  },
  ads: {
    name: "Paid Ads",
    tagline: "More bookings on autopilot",
    description: "Google and Meta campaigns managed for you. You focus on clients, we bring them in.",
    color: "#FF6B35",
    icon: <IconAds />,
    waMsg: "Hi, I want to run paid ads to get more bookings",
    statLabels: ["Impressions", "Clicks", "Ad spend"],
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-semibold uppercase tracking-widest mb-3"
      style={{ color: "var(--color-muted)" }}
    >
      {children}
    </div>
  );
}

function StatBox({ label }: { label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[20px] font-black leading-none" style={{ color: "var(--color-dark)" }}>
        <span className="text-[15px] font-medium" style={{ color: "var(--color-muted)" }}>—</span>
      </div>
      <div className="text-[11px] mt-1 font-medium truncate" style={{ color: "var(--color-muted)" }}>
        {label}
      </div>
    </div>
  );
}

function AddonCard({ addon }: { addon: Addon }) {
  const cfg = CATALOG[addon.type];

  function contactUs() {
    const encoded = encodeURIComponent(cfg.waMsg);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encoded}`, "_blank");
  }

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: addon.active
          ? `0 6px 24px ${cfg.color}1A, 0 2px 6px rgba(30,26,20,0.05)`
          : "var(--shadow-md)",
        border: addon.active
          ? "1.5px solid var(--color-amber)"
          : "1.5px solid transparent",
      }}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: `${cfg.color}14`,
              color: cfg.color,
            }}
          >
            {cfg.icon}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[16px] font-bold" style={{ color: "var(--color-dark)" }}>
                {cfg.name}
              </span>
              {addon.active ? (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "var(--color-amber)" }}
                >
                  Active
                </span>
              ) : (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--color-cream-2)",
                    color: "var(--color-muted)",
                  }}
                >
                  {cfg.tagline}
                </span>
              )}
            </div>
            <p
              className="text-[13px] leading-relaxed mt-1.5"
              style={{ color: "var(--color-muted)" }}
            >
              {cfg.description}
            </p>
          </div>
        </div>

        {/* Stats or CTA */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-cream-2)" }}>
          {addon.active ? (
            <div className="flex gap-6">
              {cfg.statLabels.map((label) => (
                <StatBox key={label} label={label} />
              ))}
            </div>
          ) : (
            <button
              onClick={contactUs}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: "var(--wash-amber)",
                boxShadow: "0 4px 14px rgba(232,146,10,0.28)",
              }}
            >
              I want this
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExtrasPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAddons() {
      if (!business) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("addons")
        .select("*")
        .eq("business_id", business.id);

      if (!data || data.length === 0) {
        const defaults = ORDER.map((type) => ({
          business_id: business.id,
          type,
          active: false,
        }));
        const { data: newData } = await supabase
          .from("addons")
          .insert(defaults)
          .select();
        setAddons((newData || []) as Addon[]);
      } else {
        const existing = new Set(data.map((a: Addon) => a.type));
        const missing = ORDER.filter((t) => !existing.has(t)).map((type) => ({
          business_id: business.id,
          type,
          active: false,
        }));
        if (missing.length) {
          const { data: added } = await supabase.from("addons").insert(missing).select();
          setAddons([...data, ...(added || [])] as Addon[]);
        } else {
          setAddons(data as Addon[]);
        }
      }
      setLoading(false);
    }

    fetchAddons();
  }, [business, supabase]);

  if (bizLoading || (business && loading)) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--color-cream)" }}
      >
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{
            borderColor: "var(--color-amber)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  const ordered = ORDER
    .map((type) => addons.find((a) => a.type === type))
    .filter(Boolean) as Addon[];

  const active = ordered.filter((a) => a.active);
  const available = ordered.filter((a) => !a.active);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-cream)" }}>
      <div className="mx-auto w-full max-w-2xl px-4 md:px-6 pt-6 pb-12">

        {/* Page header */}
        <div className="flex items-start justify-between mb-2">
          <h1
            className="text-[28px] md:text-[32px] font-extrabold leading-tight"
            style={{ color: "var(--color-dark)" }}
          >
            Extras
          </h1>
          {active.length > 0 && (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium mt-1"
              style={{
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-sm)",
                color: "var(--color-dark)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-amber)" }}
              />
              {active.length} active
            </span>
          )}
        </div>
        <p className="text-[14px] mb-7" style={{ color: "var(--color-muted)" }}>
          Smart tools you can switch on when you are ready.
        </p>

        {/* Active section */}
        {active.length > 0 && (
          <div className="mb-6">
            <SectionLabel>Active</SectionLabel>
            <div className="space-y-3">
              {active.map((addon) => (
                <AddonCard key={addon.id} addon={addon} />
              ))}
            </div>
          </div>
        )}

        {/* Available section */}
        {available.length > 0 && (
          <div className="mb-4">
            {active.length > 0 && <SectionLabel>Available</SectionLabel>}
            <div className="space-y-3">
              {available.map((addon) => (
                <AddonCard key={addon.id} addon={addon} />
              ))}
            </div>
          </div>
        )}

        {/* Custom integration CTA */}
        <div
          className="bg-white rounded-2xl p-5 flex items-center gap-4"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--color-cream-2)",
              color: "var(--color-muted)",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold" style={{ color: "var(--color-dark)" }}>
              Need something custom?
            </div>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-muted)" }}>
              We build integrations for specific needs.
            </p>
          </div>
          <button
            onClick={() => {
              const msg = encodeURIComponent("Hi, I need a custom integration for my business");
              window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank");
            }}
            className="shrink-0 text-[13px] font-semibold px-4 py-2 rounded-full transition-colors hover:opacity-80 active:scale-[0.97]"
            style={{
              background: "var(--amber-soft)",
              color: "var(--color-amber)",
            }}
          >
            Talk to us
          </button>
        </div>

      </div>
    </div>
  );
}
