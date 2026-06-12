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

type IP = { size?: number };

function IconWA({ size = 20 }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function IconCard({ size = 20 }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconStar({ size = 20 }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconTarget({ size = 20 }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconPin({ size = 20 }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

interface Entry {
  name: string;
  blurb: string;
  color: string;
  icon: React.ReactNode;
  waMsg: string;
  tags?: string[];
  statLabel: string;
}

const CATALOG: Record<AddonType, Entry> = {
  whatsapp: {
    name: "Reminders & Confirmations",
    blurb: "Automatic booking confirmations and reminders over WhatsApp, SMS, or Email.",
    color: "#25D366",
    icon: <IconWA />,
    waMsg: "Hi, I want to enable Reminders & Confirmations",
    tags: ["WhatsApp", "SMS", "Email"],
    statLabel: "Reminders sent",
  },
  stripe: {
    name: "Online Payments",
    blurb: "Collect deposits or full payment at the time of booking.",
    color: "#635BFF",
    icon: <IconCard />,
    waMsg: "Hi, I want to set up Online Payments",
    statLabel: "Payments collected",
  },
  google: {
    name: "Google Reviews",
    blurb: "Automatic review requests sent to happy clients at the right moment.",
    color: "#FBBC05",
    icon: <IconStar />,
    waMsg: "Hi, I want to enable Google Reviews automation",
    statLabel: "Reviews collected",
  },
  ads: {
    name: "Paid Ads",
    blurb: "Meta campaigns that bring new clients straight into your booking flow.",
    color: "#0866FF",
    icon: <IconTarget />,
    waMsg: "Hi, I want to run Paid Ads",
    statLabel: "Ad impressions",
  },
  google_business: {
    name: "Google Business Setup",
    blurb: "Full profile setup so you appear when someone nearby searches for what you do.",
    color: "#0F9D58",
    icon: <IconPin />,
    waMsg: "Hi, I want to set up my Google Business profile",
    statLabel: "Profile views",
  },
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ active, onEnable }: { active: boolean; onEnable: () => void }) {
  const [tip, setTip] = useState(false);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      {tip && !active && (
        <div
          className="absolute pointer-events-none whitespace-nowrap text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg z-20"
          style={{
            bottom: "calc(100% + 8px)",
            right: 0,
            background: "var(--color-dark)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          I want this
          <span
            className="absolute right-3.5"
            style={{
              top: "100%",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid var(--color-dark)",
            }}
          />
        </div>
      )}
      <button
        onClick={active ? undefined : onEnable}
        aria-pressed={active}
        aria-label={active ? "Active" : "Enable"}
        className="relative transition-colors duration-200"
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          background: active ? "var(--color-amber)" : "var(--color-cream-2)",
          cursor: active ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span
          className="absolute transition-all duration-200 bg-white"
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            left: active ? 21 : 3,
            boxShadow: "0 1px 4px rgba(30,26,20,0.25)",
          }}
        />
      </button>
    </div>
  );
}

// ─── Usage Column ─────────────────────────────────────────────────────────────

// Simulated 30-day usage: percentage of capacity consumed each day
const DAILY_USAGE = [
  0.12, 0.28, 0.19, 0.41, 0.55, 0.38, 0.22,
  0.60, 0.74, 0.48, 0.33, 0.80, 0.65, 0.50,
  0.42, 0.71, 0.88, 0.63, 0.45, 0.30,
  0.55, 0.68, 0.79, 0.52, 0.40, 0.85, 0.92,
  0.70, 0.58, 0.45,
];

function BarChart({ active }: { active: boolean }) {
  const COLUMN_HEIGHT = 72;
  const totalCapacity = 100;
  // Simulate cumulative used % — peaks at ~73% used of total limit
  const usedPct = active ? 73 : 0;
  const remainingPct = totalCapacity - usedPct;

  if (!active) {
    // INACTIVE STATE: Clean vertical column showing 100% available with subtle green tint
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        {/* Vertical stacked capacity column - always shows 100% available when inactive */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {/* Column track - full height represents 100% capacity */}
          <div
            style={{
              height: COLUMN_HEIGHT,
              borderRadius: 10,
              background: "#E8F3EC",   // subtle greenish background (inactive track)
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column-reverse",
            }}
          >
            {/* Fill is 100% of the column, showing full green gradient availability */}
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(180deg, rgba(74, 174, 96, 0.85) 0%, rgba(74, 174, 96, 0.55) 100%)",
                borderRadius: "0 0 10px 10px",
                transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                position: "relative",
              }}
            >
              {/* Soft shimmer line at top of fill */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "10%",
                  right: "10%",
                  height: 1.5,
                  borderRadius: 1,
                  background: "rgba(255,255,255,0.35)",
                }}
              />
            </div>
          </div>

          {/* Mini sparkline area - neutral/grey when inactive */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 18, opacity: 0.5 }}>
            {DAILY_USAGE.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.round(v * 100)}%`,
                  minHeight: 2,
                  borderRadius: 2,
                  background: "#C0D4C5",  // muted green-grey for inactive preview
                }}
              />
            ))}
          </div>
        </div>

        {/* Stats column - shows full capacity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingBottom: 24,
            minWidth: 64,
          }}
        >
          {/* Remaining shows 100% */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-dark)", lineHeight: 1 }}>
              100%
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              available
            </div>
          </div>

          {/* Divider tick with 0% used */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 10, color: "var(--color-muted)", fontWeight: 500 }}>
              0% used
            </div>
            <div style={{ width: 8, height: 1.5, borderRadius: 1, background: "#4AAE60" }} />
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE STATE: Shows actual usage (73% used, 27% remaining)
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
      {/* Vertical stacked capacity column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {/* Column track */}
        <div
          style={{
            height: COLUMN_HEIGHT,
            borderRadius: 10,
            background: "var(--color-cream-2)",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            flexDirection: "column-reverse",
          }}
        >
          {/* Used fill — grows from bottom */}
          <div
            style={{
              width: "100%",
              height: `${usedPct}%`,
              background: "linear-gradient(180deg, rgba(232,146,10,0.85) 0%, rgba(232,146,10,0.55) 100%)",
              borderRadius: "0 0 10px 10px",
              transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
              position: "relative",
            }}
          >
            {/* Shimmer line at top of fill */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "10%",
                right: "10%",
                height: 1.5,
                borderRadius: 1,
                background: "rgba(255,255,255,0.45)",
              }}
            />
          </div>
        </div>

        {/* Micro sparkline of daily activity */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 18 }}>
          {DAILY_USAGE.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.round(v * 100)}%`,
                minHeight: 2,
                borderRadius: 2,
                background: `rgba(232,146,10,${0.15 + v * 0.55})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Stats column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          paddingBottom: 24,
          minWidth: 64,
        }}
      >
        {/* Remaining */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-dark)", lineHeight: 1 }}>
            {remainingPct}%
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            remaining
          </div>
        </div>

        {/* Divider tick */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 10, color: "var(--color-muted)", fontWeight: 500 }}>
            {usedPct}% used
          </div>
          <div style={{ width: 8, height: 1.5, borderRadius: 1, background: "var(--color-amber)" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Request Modal ────────────────────────────────────────────────────────────

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

  function send() {
    const msg = notes.trim() ? `${waMsg}. Notes: ${notes.trim()}` : waMsg;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        background: "rgba(30,26,20,0.45)",
        backdropFilter: "saturate(140%) blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:w-auto sm:min-w-[360px] sm:max-w-sm p-6"
        style={{
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 48px rgba(30,26,20,0.16), 0 0 0 1px rgba(30,26,20,0.04)",
        }}
        /* Inline style can't conditionally set border-radius for sm: so we use a style tag */
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@media(min-width:640px){.extras-modal{border-radius:20px!important}}`}</style>
        <div className="extras-modal">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[18px] font-extrabold" style={{ color: "var(--color-dark)" }}>
                Enable {addonName}
              </p>
              <p className="text-[13px] mt-1 leading-snug" style={{ color: "var(--color-muted)" }}>
                We will reach out to get you set up.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-colors hover:bg-[var(--color-cream-2)] ml-4 shrink-0"
              style={{ color: "var(--color-muted)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes or questions? (optional)"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-[14px] resize-none outline-none transition-all"
            style={{
              border: "1.5px solid var(--color-cream-2)",
              background: "var(--color-cream)",
              color: "var(--color-dark)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
          />

          <button
            onClick={send}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ background: "var(--wash-amber)", boxShadow: "0 6px 18px rgba(232,146,10,0.32)" }}
          >
            Send request <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Addon Card ───────────────────────────────────────────────────────────────

function AddonCard({ addon, onRequest }: { addon: Addon; onRequest: (t: AddonType) => void }) {
  const cfg = CATALOG[addon.type];

  return (
    <div
      className="bg-white rounded-2xl"
      style={{
        padding: "20px 24px",
        boxShadow: addon.active
          ? "0 4px 20px rgba(232,146,10,0.12), 0 1px 4px rgba(30,26,20,0.04)"
          : "var(--shadow-md)",
        border: addon.active
          ? "1.5px solid var(--color-amber)"
          : "1.5px solid transparent",
      }}
    >
      {/* Top row: icon + info + toggle */}
      <div className="flex items-start gap-4">
        <div
          className="rounded-xl flex items-center justify-center shrink-0"
          style={{
            width: 44,
            height: 44,
            background: `${cfg.color}15`,
            color: cfg.color,
          }}
        >
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-snug" style={{ color: "var(--color-dark)" }}>
                {cfg.name}
              </p>
              {cfg.tags && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {cfg.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {cfg.blurb}
              </p>
            </div>
            <Toggle active={addon.active} onEnable={() => onRequest(addon.type)} />
          </div>
        </div>
      </div>

      {/* Chart row */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="flex items-center justify-between mb-2.5">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-muted)" }}
          >
            {cfg.statLabel}
          </span>
          {addon.active && (
            <span className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>
              Last 30 days
            </span>
          )}
        </div>
        <BarChart active={addon.active} />
      </div>
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function Section({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="text-[11px] font-bold uppercase tracking-widest shrink-0"
        style={{ color: "var(--color-muted)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--color-cream-2)" }} />
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
    async function load() {
      if (!business) { setLoading(false); return; }

      const { data } = await supabase
        .from("addons").select("*").eq("business_id", business.id);

      if (!data || data.length === 0) {
        const ins = ALL_TYPES.map((type) => ({ business_id: business.id, type, active: false }));
        const { data: nd } = await supabase.from("addons").insert(ins).select();
        setAddons((nd || []) as Addon[]);
      } else {
        const have = new Set(data.map((a: Addon) => a.type));
        const miss = ALL_TYPES.filter((t) => !have.has(t)).map((type) => ({
          business_id: business.id, type, active: false,
        }));
        if (miss.length) {
          const { data: nd } = await supabase.from("addons").insert(miss).select();
          setAddons([...data, ...(nd || [])] as Addon[]);
        } else {
          setAddons(data as Addon[]);
        }
      }
      setLoading(false);
    }
    load();
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

  function get(type: AddonType): Addon {
    return addons.find((a) => a.type === type) ?? { id: type, type, active: false, activated_at: null };
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-cream)" }}>
        {/* Force centering — inline max-width bypasses any Tailwind flex quirks */}
        <div style={{ maxWidth: 660, margin: "0 auto", width: "100%", padding: "28px 16px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 800,
                lineHeight: 1.2,
                color: "var(--color-dark)",
                marginBottom: 6,
              }}
            >
              Layer in what you need.
            </h1>
            <p style={{ fontSize: 14, color: "var(--color-muted)", lineHeight: 1.6 }}>
              Everything below plugs straight into your system. Pick what fits, turn it on, we handle the rest.
            </p>
          </div>

          {/* Monthly */}
          <Section label="Runs every month" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
            {MONTHLY.map((t) => (
              <AddonCard key={t} addon={get(t)} onRequest={setRequesting} />
            ))}
          </div>

          {/* One-time */}
          <Section label="Done once, works forever" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
            {ONETIME.map((t) => (
              <AddonCard key={t} addon={get(t)} onRequest={setRequesting} />
            ))}
          </div>

          {/* Custom CTA */}
          <div
            className="bg-white rounded-2xl"
            style={{
              padding: "18px 22px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              className="rounded-xl flex items-center justify-center shrink-0"
              style={{ width: 40, height: 40, background: "var(--color-cream-2)", color: "var(--color-muted)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>
                Need something custom?
              </p>
              <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                We build integrations for specific needs.
              </p>
            </div>
            <button
              onClick={() => {
                window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I need a custom integration")}`, "_blank");
              }}
              className="shrink-0 font-semibold rounded-full transition-colors hover:opacity-80"
              style={{
                fontSize: 13,
                padding: "7px 16px",
                background: "var(--amber-soft)",
                color: "var(--color-amber)",
              }}
            >
              Talk to us
            </button>
          </div>

        </div>
      </div>

      {requesting && (
        <RequestModal
          addonName={CATALOG[requesting].name}
          waMsg={CATALOG[requesting].waMsg}
          onClose={() => setRequesting(null)}
        />
      )}
    </>
  );
}
