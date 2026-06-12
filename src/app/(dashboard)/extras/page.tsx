"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

type AddonType = "whatsapp" | "stripe" | "google" | "ads" | "google_business";

interface Addon {
  id: string;
  type: AddonType;
  active: boolean;
  activated_at: string | null;
}

const WA_NUMBER = "972501234567";
const MONTHLY: AddonType[] = ["whatsapp", "stripe", "google", "ads"];
const ONETIME: AddonType[] = ["google_business"];
const ALL_TYPES: AddonType[] = [...MONTHLY, ...ONETIME];

// ─── Icons ───────────────────────────────────────────────────────────────────

type IconProps = { size?: number };

function IconReminders({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function IconPayments({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  );
}

function IconReviews({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
}

function IconAds({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z"></path>
    </svg>
  );
}

function IconGoogleBiz({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  );
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

interface CatalogEntry {
  name: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  waMsg: string;
  channels?: string[];
  statLabel: string;
}

const CATALOG: Record<AddonType, CatalogEntry> = {
  whatsapp: {
    name: "Reminders & Confirmations",
    description:
      "Clients get a WhatsApp confirmation the moment they book, and a reminder before they show up. No-shows drop. You do nothing. Works around the clock, including at 11PM when you are asleep.",
    color: "#25D366",
    icon: <IconReminders />,
    waMsg: "Hi, I want to enable Reminders & Confirmations for my business",
    channels: ["WhatsApp", "SMS", "Email"],
    statLabel: "Reminders sent",
  },
  stripe: {
    name: "Online Payments",
    description: "Collect deposits or full payment at the time of booking.",
    color: "#635BFF",
    icon: <IconPayments />,
    waMsg: "Hi, I want to set up Online Payments for my business",
    statLabel: "Payments collected",
  },
  google: {
    name: "Google Reviews",
    description: "Automatic review requests sent to happy clients at the right moment.",
    color: "#4285F4",
    icon: <IconReviews />,
    waMsg: "Hi, I want to enable Google Reviews automation for my business",
    statLabel: "Reviews collected",
  },
  ads: {
    name: "Paid Ads",
    description: "Meta campaigns that bring new clients straight into your booking flow.",
    color: "#FF6B35",
    icon: <IconAds />,
    waMsg: "Hi, I want to run Paid Ads for my business",
    statLabel: "Ad impressions",
  },
  google_business: {
    name: "Google Business Setup",
    description:
      "Full profile setup so you appear when someone nearby searches for what you do.",
    color: "#0F9D58",
    icon: <IconGoogleBiz />,
    waMsg: "Hi, I want to set up my Google Business profile",
    statLabel: "Profile views",
  },
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  active,
  onActivate,
}: {
  active: boolean;
  onActivate: () => void;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => !active && setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {/* Tooltip */}
      {showTip && !active && (
        <div
          className="absolute bottom-full mb-2 right-0 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-white whitespace-nowrap z-10 pointer-events-none"
          style={{
            background: "var(--color-dark)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          I want this
          <span
            className="absolute top-full right-3"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--color-dark)",
            }}
          />
        </div>
      )}

      {/* Toggle pill */}
      <button
        onClick={active ? undefined : onActivate}
        className="relative flex items-center transition-colors duration-200"
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: active ? "var(--color-amber)" : "var(--color-cream-2)",
          cursor: active ? "default" : "pointer",
          flexShrink: 0,
        }}
        aria-label={active ? "Active" : "Enable this add-on"}
        aria-pressed={active}
      >
        <span
          className="absolute transition-all duration-200"
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "white",
            left: active ? 23 : 3,
            boxShadow: "0 1px 4px rgba(30,26,20,0.22)",
          }}
        />
      </button>
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

const BAR_HEIGHTS = [0.45, 0.72, 0.38, 0.88, 0.60];
const BAR_LABELS = ["W1", "W2", "W3", "W4", "W5"];

function MiniBarChart({ active }: { active: boolean }) {
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: 36 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.round(h * 28)}px`,
                background: active
                  ? `rgba(232,146,10,${0.15 + h * 0.55})`
                  : "var(--color-cream-2)",
                transition: "background 0.3s",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {BAR_LABELS.map((l) => (
          <div key={l} className="flex-1 text-center text-[9px]" style={{ color: "var(--color-muted)" }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Reminders chat preview ───────────────────────────────────────────────────

function ChatBubble({ text, sent }: { text: string; sent?: boolean }) {
  return (
    <div className={`flex ${sent ? "justify-end" : "justify-start"}`}>
      <div
        className="px-3 py-1.5 text-[12px] leading-snug max-w-[88%]"
        style={{
          background: sent ? "#25D366" : "white",
          color: sent ? "white" : "var(--color-dark)",
          borderRadius: sent ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function RemindersPreview() {
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--color-cream-2)" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#25D366" }} />
        <span className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>
          Today 09:42
        </span>
      </div>
      <ChatBubble sent text="Your appointment with Avi is confirmed for Wed 14:00 ✓" />
      <ChatBubble text="Thanks! 👍" />
      <ChatBubble sent text="Reminder: you're booked tomorrow at 14:00. See you then!" />
    </div>
  );
}

// ─── Request Form Modal ───────────────────────────────────────────────────────

function RequestModal({
  addonName,
  waMsg,
  onClose,
}: {
  addonName: string;
  waMsg: string;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");

  function submit() {
    const full = notes.trim() ? `${waMsg}. Notes: ${notes.trim()}` : waMsg;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(full)}`, "_blank");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(30,26,20,0.42)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:w-96 p-6"
        style={{ borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 48px rgba(30,26,20,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Use a second rounded style for desktop via inline override */}
        <style>{`@media(min-width:768px){.rm-card{border-radius:20px!important}}`}</style>
        <div className="rm-card">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-[18px] font-extrabold" style={{ color: "var(--color-dark)" }}>
                Enable {addonName}
              </div>
              <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>
                We will reach out to get you set up.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes or questions? (optional)"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-[14px] resize-none outline-none border transition-colors"
            style={{
              borderColor: "var(--color-cream-2)",
              background: "var(--color-cream)",
              color: "var(--color-dark)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
          />

          <button
            onClick={submit}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: "var(--wash-amber)",
              boxShadow: "0 4px 16px rgba(232,146,10,0.30)",
            }}
          >
            Send request
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Addon Card ───────────────────────────────────────────────────────────────

function AddonCard({
  addon,
  onRequest,
}: {
  addon: Addon;
  onRequest: (type: AddonType) => void;
}) {
  const cfg = CATALOG[addon.type];

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: addon.active
          ? `0 4px 20px ${cfg.color}20, 0 1px 4px rgba(30,26,20,0.05)`
          : "var(--shadow-md)",
        border: addon.active
          ? "1.5px solid var(--color-amber)"
          : "1.5px solid transparent",
      }}
    >
      <div className="p-5 md:p-6">
        {/* Header: icon + name + toggle */}
        <div className="flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${cfg.color}15`, color: cfg.color }}
          >
            {cfg.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-[16px] font-bold leading-snug"
                style={{ color: "var(--color-dark)" }}
              >
                {cfg.name}
              </span>
              <Toggle active={addon.active} onActivate={() => onRequest(addon.type)} />
            </div>

            {/* Channel tags */}
            {cfg.channels && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {cfg.channels.map((ch) => (
                  <span
                    key={ch}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--color-cream-2)",
                      color: "var(--color-muted)",
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            )}

            <p
              className="text-[13px] leading-relaxed mt-2"
              style={{ color: "var(--color-muted)" }}
            >
              {cfg.description}
            </p>
          </div>
        </div>

        {/* Reminders chat preview */}
        {addon.type === "whatsapp" && (
          <div className="mt-4">
            <RemindersPreview />
          </div>
        )}

        {/* Bar chart section */}
        <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--color-cream-2)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              {cfg.statLabel}
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: addon.active ? "var(--color-amber)" : "var(--color-muted)" }}
            >
              {addon.active ? "No data yet" : "Enable to unlock"}
            </span>
          </div>
          <MiniBarChart active={addon.active} />
        </div>
      </div>
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: "var(--color-cream-2)" }} />
        <span
          className="text-[11px] font-semibold uppercase tracking-widest px-3"
          style={{ color: "var(--color-muted)" }}
        >
          {title}
        </span>
        <div className="h-px flex-1" style={{ background: "var(--color-cream-2)" }} />
      </div>
      {subtitle && (
        <p className="text-center text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExtrasPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<AddonType | null>(null);

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
        const defaults = ALL_TYPES.map((type) => ({
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
        const missing = ALL_TYPES.filter((t) => !existing.has(t)).map((type) => ({
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
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // Always render all types — DB data merged in when available.
  function getAddon(type: AddonType): Addon {
    return addons.find((a) => a.type === type) ?? { id: type, type, active: false, activated_at: null };
  }

  const requestingCfg = requesting ? CATALOG[requesting] : null;

  return (
    <>
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-cream)" }}>
        <div className="mx-auto w-full max-w-2xl px-4 md:px-8 pt-6 pb-16">

          {/* Page header */}
          <div className="mb-8">
            <h1
              className="text-[28px] md:text-[34px] font-extrabold leading-tight"
              style={{ color: "var(--color-dark)" }}
            >
              Layer in what you need.
            </h1>
            <p className="text-[14px] md:text-[15px] mt-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
              Everything below plugs straight into your system. Pick what fits, turn it on, we handle the rest.
            </p>
          </div>

          {/* Monthly section */}
          <SectionLabel title="Runs every month" />
          <div className="space-y-4 mb-10">
            {MONTHLY.map((type) => (
              <AddonCard
                key={type}
                addon={getAddon(type)}
                onRequest={setRequesting}
              />
            ))}
          </div>

          {/* One-time section */}
          <SectionLabel title="Done once, works forever" />
          <div className="space-y-4 mb-10">
            {ONETIME.map((type) => (
              <AddonCard
                key={type}
                addon={getAddon(type)}
                onRequest={setRequesting}
              />
            ))}
          </div>

          {/* Custom CTA */}
          <div
            className="bg-white rounded-2xl p-5 flex items-center gap-4"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              style={{ background: "var(--amber-soft)", color: "var(--color-amber)" }}
            >
              Talk to us
            </button>
          </div>

        </div>
      </div>

      {/* Request modal */}
      {requesting && requestingCfg && (
        <RequestModal
          addonName={requestingCfg.name}
          waMsg={requestingCfg.waMsg}
          onClose={() => setRequesting(null)}
        />
      )}
    </>
  );
}
