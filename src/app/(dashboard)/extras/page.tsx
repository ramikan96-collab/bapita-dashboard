"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

type AddonType = "whatsapp" | "stripe" | "google" | "ads" | "google_business" | "email";

interface Addon {
  id: string;
  type: AddonType;
  active: boolean;
  activated_at: string | null;
}

const WA_NUMBER = "972501234567";
const MONTHLY: AddonType[] = ["whatsapp", "stripe", "google", "ads", "email"];
const ONETIME: AddonType[] = ["google_business"];
const ALL_TYPES: AddonType[] = [...MONTHLY, ...ONETIME];

// Usage data per channel (for WhatsApp, SMS tags)
type ChannelUsage = {
  used: number;
  total: number;
  label: string;
};

const CHANNEL_USAGE: Record<string, ChannelUsage> = {
  WhatsApp: { used: 1247, total: 2500, label: "WhatsApp messages" },
  SMS: { used: 342, total: 1000, label: "SMS messages" },
};

// Email usage data (500 free, monthly)
const EMAIL_USAGE = { used: 0, total: 500, label: "emails sent" };

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

function IconMail({ size = 20 }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" />
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
  recurring: boolean;
  emailOnly?: boolean;
  defaultActive?: boolean;
}

const CATALOG: Record<AddonType, Entry> = {
  email: {
    name: "Email Notifications",
    blurb: "Send booking confirmations, reminders, and updates via email. 500 free emails/month included.",
    color: "#EA4335",
    icon: <IconMail />,
    waMsg: "Hi, I want to enable Email Notifications",
    statLabel: "Emails sent",
    recurring: true,
    emailOnly: true,
    defaultActive: true,
  },
  whatsapp: {
    name: "Reminders & Confirmations",
    blurb: "Automatic booking confirmations and reminders over WhatsApp or SMS.",
    color: "#25D366",
    icon: <IconWA />,
    waMsg: "Hi, I want to enable Reminders & Confirmations",
    tags: ["WhatsApp", "SMS"],
    statLabel: "Messages sent",
    recurring: true,
  },
  stripe: {
    name: "Online Payments",
    blurb: "Collect deposits or full payment at the time of booking.",
    color: "#635BFF",
    icon: <IconCard />,
    waMsg: "Hi, I want to set up Online Payments",
    statLabel: "Payments collected",
    recurring: true,
  },
  google: {
    name: "Google Reviews",
    blurb: "Automatic review requests sent to happy clients at the right moment.",
    color: "#FBBC05",
    icon: <IconStar />,
    waMsg: "Hi, I want to enable Google Reviews automation",
    statLabel: "Reviews collected",
    recurring: true,
  },
  ads: {
    name: "Paid Ads",
    blurb: "Meta campaigns that bring new clients straight into your booking flow.",
    color: "#0866FF",
    icon: <IconTarget />,
    waMsg: "Hi, I want to run Paid Ads",
    statLabel: "Ad impressions",
    recurring: true,
  },
  google_business: {
    name: "Google Business Setup",
    blurb: "Full profile setup so you appear when someone nearby searches for what you do.",
    color: "#0F9D58",
    icon: <IconPin />,
    waMsg: "Hi, I want to set up my Google Business profile",
    statLabel: "Profile views",
    recurring: false,
  },
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ active, onEnable, disabled }: { active: boolean; onEnable: () => void; disabled?: boolean }) {
  const [tip, setTip] = useState(false);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      {tip && !active && !disabled && (
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
        onClick={disabled ? undefined : (active ? undefined : onEnable)}
        aria-pressed={active}
        aria-label={active ? "Active" : "Enable"}
        className="relative transition-colors duration-200"
        style={{
          width: 40,
          height: 24,
          borderRadius: 12,
          background: active ? "var(--color-amber)" : "var(--color-cream-2)",
          cursor: disabled ? "default" : (active ? "default" : "pointer"),
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <span
          className="absolute transition-all duration-200 bg-white"
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            left: active ? 19 : 3,
            boxShadow: "0 1px 4px rgba(30,26,20,0.25)",
          }}
        />
      </button>
    </div>
  );
}

// ─── Usage Bar — Premium Claude-style thin horizontal bar ─────────────────────

function BarChart({ 
  active, 
  selectedTag, 
  emailMode = false,
}: { 
  active: boolean; 
  selectedTag: string | null;
  emailMode?: boolean;
}) {
  const BAR_HEIGHT = 4;

  // INACTIVE: Full 100% green bar
  if (!active) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            width: "100%",
            height: BAR_HEIGHT,
            borderRadius: 4,
            backgroundColor: "#E5EFE8",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              width: "100%",
              height: "100%",
              background: "linear-gradient(90deg, #7EDB9E 0%, #3B9B54 100%)",
              borderRadius: 4,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#1E2A3A" }}>
            {emailMode ? `${EMAIL_USAGE.total} emails left` : "100%"}
          </span>
        </div>
      </div>
    );
  }

  // Email mode active
  if (emailMode) {
    const usedPct = Math.round((EMAIL_USAGE.used / EMAIL_USAGE.total) * 100);
    const remainingPct = 100 - usedPct;
    const remainingEmails = EMAIL_USAGE.total - EMAIL_USAGE.used;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            width: "100%",
            height: BAR_HEIGHT,
            borderRadius: 4,
            backgroundColor: "#F0F2F5",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              width: `${usedPct}%`,
              height: "100%",
              background: "linear-gradient(90deg, #F5B042 0%, #E8890A 100%)",
              borderRadius: 4,
              transition: "width 0.4s ease-out",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#1E2A3A" }}>
            {remainingPct}% remaining
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#B0B8C4" }}>
            {remainingEmails} emails left
          </span>
        </div>
      </div>
    );
  }

  // ACTIVE: Show usage based on selected tag (WhatsApp or SMS)
  if (selectedTag && CHANNEL_USAGE[selectedTag]) {
    const usage = CHANNEL_USAGE[selectedTag];
    const usedPct = Math.round((usage.used / usage.total) * 100);
    const remainingPct = 100 - usedPct;
    const remainingAmount = usage.total - usage.used;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            width: "100%",
            height: BAR_HEIGHT,
            borderRadius: 4,
            backgroundColor: "#F0F2F5",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              width: `${usedPct}%`,
              height: "100%",
              background: "linear-gradient(90deg, #F5B042 0%, #E8890A 100%)",
              borderRadius: 4,
              transition: "width 0.4s ease-out",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#1E2A3A" }}>
            {remainingPct}% remaining
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#B0B8C4" }}>
            {remainingAmount} {usage.label} left
          </span>
        </div>
      </div>
    );
  }

  // No tag selected but active — show full green (all channels available)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          width: "100%",
          height: BAR_HEIGHT,
          borderRadius: 4,
          backgroundColor: "#E5EFE8",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, #7EDB9E 0%, #3B9B54 100%)",
            borderRadius: 4,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#1E2A3A" }}>
          100% available
        </span>
      </div>
    </div>
  );
}

// ─── Custom Request Modal ────────────────────────────────────────────────────

function CustomRequestModal({ onClose }: { onClose: () => void }) {
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");

  function send() {
    const msg = `Custom integration request.${notes ? ` Notes: ${notes}` : ""}${contact ? ` Contact: ${contact}` : ""}`;
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
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@media(min-width:640px){.extras-modal{border-radius:20px!important}}`}</style>
        <div className="extras-modal">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[18px] font-extrabold" style={{ color: "var(--color-dark)" }}>
                Need something custom?
              </p>
              <p className="text-[12px] mt-1 leading-snug" style={{ color: "var(--color-muted)" }}>
                Tell us what you need, we'll build it.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-colors hover:bg-[var(--color-cream-2)] ml-4 shrink-0"
              style={{ color: "var(--color-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the integration you need..."
            rows={3}
            className="w-full rounded-xl px-3 py-2 text-[13px] resize-none outline-none transition-all mb-3"
            style={{
              border: "1.5px solid var(--color-cream-2)",
              background: "var(--color-cream)",
              color: "var(--color-dark)",
              fontSize: 13,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
          />

          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Your email or phone (optional)"
            className="w-full rounded-xl px-3 py-2 text-[13px] outline-none transition-all mb-4"
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
            className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ background: "var(--wash-amber)", boxShadow: "0 6px 18px rgba(232,146,10,0.32)" }}
          >
            Send request <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Enable Request Modal ────────────────────────────────────────────────────

function EnableRequestModal({
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
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@media(min-width:640px){.extras-modal{border-radius:20px!important}}`}</style>
        <div className="extras-modal">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[18px] font-extrabold" style={{ color: "var(--color-dark)" }}>
                Enable {addonName}
              </p>
              <p className="text-[12px] mt-1 leading-snug" style={{ color: "var(--color-muted)" }}>
                We will reach out to get you set up.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-colors hover:bg-[var(--color-cream-2)] ml-4 shrink-0"
              style={{ color: "var(--color-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes or questions? (optional)"
            rows={3}
            className="w-full rounded-xl px-3 py-2 text-[13px] resize-none outline-none transition-all"
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
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
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

function AddonCard({
  addon,
  onRequest,
  selectedTag,
  onTagClick,
}: {
  addon: Addon;
  onRequest: (t: AddonType) => void;
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
}) {
  const cfg = CATALOG[addon.type];
  const isActive = addon.active;
  const isEmailCard = addon.type === "email";
  const isDefaultActive = cfg.defaultActive === true;

  return (
    <div
      className="bg-white rounded-xl"
      style={{
        padding: "16px 20px",
        boxShadow: isActive
          ? "0 2px 12px rgba(232,146,10,0.1), 0 1px 2px rgba(30,26,20,0.04)"
          : "var(--shadow-sm)",
        border: isActive ? "1.5px solid var(--color-amber)" : "1.5px solid transparent",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="rounded-lg flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            background: `${cfg.color}15`,
            color: cfg.color,
          }}
        >
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[14px] font-bold leading-snug" style={{ color: "var(--color-dark)" }}>
                  {cfg.name}
                </p>
                <span
                  className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: cfg.recurring ? "#E8F0FE" : "#F0E8FE",
                    color: cfg.recurring ? "#1A73E8" : "#8B5CF6",
                  }}
                >
                  {cfg.recurring ? "monthly" : "one-time"}
                </span>
              </div>
              {cfg.tags && !isEmailCard && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {cfg.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => onTagClick(t)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all hover:scale-105"
                      style={{
                        background: selectedTag === t ? cfg.color : "var(--color-cream-2)",
                        color: selectedTag === t ? "white" : "var(--color-muted)",
                        opacity: isActive ? 1 : 0.5,
                        cursor: isActive ? "pointer" : "not-allowed",
                      }}
                      disabled={!isActive}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {cfg.blurb}
              </p>
            </div>
            <Toggle 
              active={isActive} 
              onEnable={() => onRequest(addon.type)} 
              disabled={isDefaultActive}
            />
          </div>
        </div>
      </div>

      {/* Chart row - more space above (mt-6 for separation) */}
      <div className="mt-6 pt-3 border-t" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-muted)" }}
          >
            {cfg.statLabel}
          </span>
          {isActive && selectedTag && !isEmailCard && (
            <span className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>
              {selectedTag} channel
            </span>
          )}
          {isActive && !selectedTag && !isEmailCard && (
            <span className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>
              All channels
            </span>
          )}
          {isEmailCard && isActive && (
            <span className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>
              Monthly quota
            </span>
          )}
        </div>
        <BarChart active={isActive} selectedTag={selectedTag} emailMode={isEmailCard} />
      </div>
    </div>
  );
}

// ─── Section Links ────────────────────────────────────────────────────────────

function SectionLinks({
  onRecurringClick,
  onOnetimeClick,
}: {
  onRecurringClick: () => void;
  onOnetimeClick: () => void;
}) {
  return (
    <div className="flex gap-6 mb-5 pb-2 border-b" style={{ borderBottomColor: "var(--color-cream-2)" }}>
      <button
        onClick={onRecurringClick}
        className="text-[13px] font-semibold transition-colors hover:opacity-70"
        style={{ color: "var(--color-dark)" }}
      >
        Recurring
      </button>
      <button
        onClick={onOnetimeClick}
        className="text-[13px] font-semibold transition-colors hover:opacity-70"
        style={{ color: "var(--color-dark)" }}
      >
        One-time
      </button>
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
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const recurringRef = useRef<HTMLDivElement>(null);
  const onetimeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!business) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("addons").select("*").eq("business_id", business.id);

      if (!data || data.length === 0) {
        // Create default addons with email active by default
        const ins = ALL_TYPES.map((type) => ({ 
          business_id: business.id, 
          type, 
          active: type === "email" ? true : false,
        }));
        const { data: nd } = await supabase.from("addons").insert(ins).select();
        setAddons((nd || []) as Addon[]);
      } else {
        const have = new Set(data.map((a: Addon) => a.type));
        const miss = ALL_TYPES.filter((t) => !have.has(t)).map((type) => ({
          business_id: business.id,
          type,
          active: type === "email" ? true : false,
        }));
        if (miss.length) {
          const { data: nd } = await supabase.from("addons").insert(miss).select();
          setAddons([...data, ...(nd || [])] as Addon[]);
        } else {
          // Ensure email is active by default if it exists in data
          const updatedData = data.map((item: Addon) => {
            if (item.type === "email" && item.active === false) {
              return { ...item, active: true };
            }
            return item;
          });
          setAddons(updatedData as Addon[]);
        }
      }
      setLoading(false);
    }
    load();
  }, [business, supabase]);

  const scrollToRecurring = () => {
    recurringRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToOnetime = () => {
    onetimeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (bizLoading || (business && loading)) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  function get(type: AddonType): Addon {
    const found = addons.find((a) => a.type === type);
    if (found) return found;
    return { id: type, type, active: type === "email" ? true : false, activated_at: null };
  }

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  // Order: email first, then other monthly addons
  const orderedMonthly = ["email", ...MONTHLY.filter(t => t !== "email")];

  return (
    <>
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-cream)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", width: "100%", padding: "24px 16px 64px" }}>
          {/* Header */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--color-dark)",
              marginBottom: 18,
            }}
          >
            Extras
          </h1>

          {/* Section Links */}
          <SectionLinks onRecurringClick={scrollToRecurring} onOnetimeClick={scrollToOnetime} />

          {/* Recurring Section */}
          <div ref={recurringRef} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {orderedMonthly.map((t) => (
                <AddonCard
                  key={t}
                  addon={get(t)}
                  onRequest={setRequesting}
                  selectedTag={selectedTag}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          </div>

          {/* One-time Section */}
          <div ref={onetimeRef} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ONETIME.map((t) => (
                <AddonCard
                  key={t}
                  addon={get(t)}
                  onRequest={setRequesting}
                  selectedTag={selectedTag}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          </div>

          {/* Custom CTA */}
          <div
            className="bg-white rounded-xl cursor-pointer transition-all hover:shadow-sm"
            style={{
              padding: "14px 18px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
            onClick={() => setShowCustomModal(true)}
          >
            <div
              className="rounded-lg flex items-center justify-center shrink-0"
              style={{ width: 34, height: 34, background: "var(--color-cream-2)", color: "var(--color-muted)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)" }}>
                Need something custom?
              </p>
              <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>
                We build integrations for specific needs.
              </p>
            </div>
            <button
              className="shrink-0 font-semibold rounded-full transition-colors hover:opacity-80"
              style={{
                fontSize: 12,
                padding: "5px 14px",
                background: "var(--amber-soft)",
                color: "var(--color-amber)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomModal(true);
              }}
            >
              Talk to us
            </button>
          </div>
        </div>
      </div>

      {requesting && (
        <EnableRequestModal
          addonName={CATALOG[requesting].name}
          waMsg={CATALOG[requesting].waMsg}
          onClose={() => setRequesting(null)}
        />
      )}

      {showCustomModal && <CustomRequestModal onClose={() => setShowCustomModal(false)} />}
    </>
  );
}
