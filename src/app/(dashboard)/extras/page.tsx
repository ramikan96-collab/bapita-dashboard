"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

type AddonType = "whatsapp" | "stripe" | "google" | "ads" | "google_business";

// Email is a UI-only card — always active, not stored in addons table

interface Addon {
  id: string;
  type: AddonType;
  active: boolean;
  activated_at: string | null;
}

const MONTHLY: AddonType[] = ["whatsapp", "stripe", "google", "ads"];
const ONETIME: AddonType[] = ["google_business"];
const ALL_TYPES: AddonType[] = [...MONTHLY, ...ONETIME];

type ChannelUsage = { used: number; total: number; label: string };

const CHANNEL_USAGE: Record<string, ChannelUsage> = {
  WhatsApp: { used: 0, total: 2500, label: "WhatsApp messages" },
  SMS:      { used: 0, total: 1000, label: "SMS messages"      },
};

const EMAIL_USAGE = { used: 0, total: 500, label: "emails sent" };

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function IconCheck({ size = 10 }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

interface Entry {
  name: string;
  blurb: string;
  color: string;
  icon: React.ReactNode;
  tags?: string[];
  statLabel: string;
  recurring: boolean;
}

const CATALOG: Record<AddonType, Entry> = {
  whatsapp: {
    name: "Reminders & Confirmations",
    blurb: "Automatic booking confirmations and reminders over WhatsApp or SMS.",
    color: "#25D366",
    icon: <IconWA />,
    tags: ["WhatsApp", "SMS"],
    statLabel: "Messages sent",
    recurring: true,
  },
  stripe: {
    name: "Online Payments",
    blurb: "Collect deposits or full payment at the time of booking.",
    color: "#635BFF",
    icon: <IconCard />,
    statLabel: "Payments collected",
    recurring: true,
  },
  google: {
    name: "Google Reviews",
    blurb: "Automatic review requests sent to happy clients at the right moment.",
    color: "#FBBC05",
    icon: <IconStar />,
    statLabel: "Reviews collected",
    recurring: true,
  },
  ads: {
    name: "Paid Ads",
    blurb: "Meta campaigns that bring new clients straight into your booking flow.",
    color: "#0866FF",
    icon: <IconTarget />,
    statLabel: "Ad impressions",
    recurring: true,
  },
  google_business: {
    name: "Google Business Setup",
    blurb: "Full profile setup so you appear when someone nearby searches for what you do.",
    color: "#0F9D58",
    icon: <IconPin />,
    statLabel: "Profile views",
    recurring: false,
  },
};

const EMAIL_CARD = {
  name: "Email Notifications",
  blurb: "Booking confirmations, reminders, and updates via email. 500 free emails/month included.",
  color: "#EA4335",
  icon: <IconMail />,
  statLabel: "Emails sent",
  recurring: true,
};

// ─── Toggle — chip-style for clarity ─────────────────────────────────────────

function Toggle({ active, onEnable }: { active: boolean; onEnable: () => void }) {
  const [hovered, setHovered] = useState(false);

  if (active) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 11px",
          borderRadius: 99,
          background: "rgba(34,197,94,0.10)",
          border: "1.5px solid rgba(34,197,94,0.22)",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#16A34A", display: "flex" }}><IconCheck size={10} /></span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", whiteSpace: "nowrap" }}>Active</span>
      </div>
    );
  }

  return (
    <button
      onClick={onEnable}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Enable"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 32,
        padding: "0 13px",
        borderRadius: 99,
        border: "1.5px solid var(--color-amber)",
        background: hovered ? "var(--color-amber)" : "var(--amber-soft)",
        color: hovered ? "#fff" : "var(--color-amber)",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        flexShrink: 0,
        whiteSpace: "nowrap",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      Enable
      <span style={{ fontSize: 13, fontWeight: 400 }}>→</span>
    </button>
  );
}

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({
  active,
  selectedTag,
  emailMode = false,
}: {
  active: boolean;
  selectedTag: string | null;
  emailMode?: boolean;
}) {
  const TRACK_H = 4;

  if (!active) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: "100%", height: TRACK_H, borderRadius: 4, background: "rgba(34,197,94,0.12)", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, width: "100%", height: "100%", background: "linear-gradient(90deg, #7EDB9E 0%, #3B9B54 100%)", borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-dark)" }}>
            {emailMode ? `${EMAIL_USAGE.total} emails left` : "100% left"}
          </span>
        </div>
      </div>
    );
  }

  if (emailMode) {
    const usedPct = Math.round((EMAIL_USAGE.used / EMAIL_USAGE.total) * 100);
    const remainingPct = 100 - usedPct;
    const remainingEmails = EMAIL_USAGE.total - EMAIL_USAGE.used;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: "100%", height: TRACK_H, borderRadius: 4, background: "var(--color-cream-2)", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, width: `${usedPct}%`, height: "100%", background: "var(--color-amber)", borderRadius: 4, transition: "width 0.4s ease-out" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-dark)" }}>{remainingPct}% remaining</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-muted)" }}>{remainingEmails} emails left</span>
        </div>
      </div>
    );
  }

  if (selectedTag && CHANNEL_USAGE[selectedTag]) {
    const usage = CHANNEL_USAGE[selectedTag];
    const usedPct = Math.round((usage.used / usage.total) * 100);
    const remainingPct = 100 - usedPct;
    const remainingAmount = usage.total - usage.used;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: "100%", height: TRACK_H, borderRadius: 4, background: "var(--color-cream-2)", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, width: `${usedPct}%`, height: "100%", background: "var(--color-amber)", borderRadius: 4, transition: "width 0.4s ease-out" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-dark)" }}>{remainingPct}% remaining</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-muted)" }}>{remainingAmount} {usage.label} left</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ width: "100%", height: TRACK_H, borderRadius: 4, background: "rgba(34,197,94,0.12)", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, width: "100%", height: "100%", background: "linear-gradient(90deg, #7EDB9E 0%, #3B9B54 100%)", borderRadius: 4 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-dark)" }}>100% available</span>
      </div>
    </div>
  );
}

// ─── Shared close button ──────────────────────────────────────────────────────

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "var(--color-cream-2)", color: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

// ─── Modal shell — bottom-sheet on mobile, centered on desktop ────────────────

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .extras-backdrop { display:flex; align-items:flex-end; justify-content:center; }
        .extras-modal-inner { border-radius: 20px 20px 0 0; width:100%; }
        @media(min-width:640px){
          .extras-backdrop { align-items:center; }
          .extras-modal-inner { border-radius: 20px !important; max-width: 440px; }
        }
      `}</style>
      <div
        className="extras-backdrop"
        style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(30,26,20,0.48)", backdropFilter: "saturate(140%) blur(4px)" }}
        onClick={onClose}
      >
        <div
          className="extras-modal-inner"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", boxShadow: "0 8px 48px rgba(30,26,20,0.16)", padding: "24px 24px 28px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );
}

// ─── Shared request form fields ───────────────────────────────────────────────

type ContactMethod = "whatsapp" | "email" | "phone";

interface RequestFormState {
  name: string;
  phone: string;
  email: string;
  preferredContact: ContactMethod;
  notes: string;
}

function RequestForm({
  state,
  onChange,
  submitting,
  onSubmit,
  submitLabel,
}: {
  state: RequestFormState;
  onChange: (patch: Partial<RequestFormState>) => void;
  submitting: boolean;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 13px", borderRadius: 11,
    border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)",
    fontSize: 13, color: "var(--color-dark)", outline: "none", fontFamily: "inherit",
    transition: "border-color 0.15s", boxSizing: "border-box" as const,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.05em", color: "var(--color-muted)", display: "block", marginBottom: 6,
  };
  const canSubmit = !!state.name.trim() && (!!state.phone.trim() || !!state.email.trim()) && !submitting;
  const CONTACT_OPTIONS: { value: ContactMethod; label: string }[] = [
    { value: "whatsapp", label: "WhatsApp" },
    { value: "email",    label: "Email"     },
    { value: "phone",    label: "Phone"     },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Name */}
      <div>
        <label style={labelStyle}>Your name *</label>
        <input
          type="text" value={state.name} placeholder="e.g. Avi Cohen"
          onChange={(e) => onChange({ name: e.target.value })}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
        />
      </div>

      {/* Phone */}
      <div>
        <label style={labelStyle}>Phone (at least one contact required)</label>
        <input
          type="tel" value={state.phone} placeholder="05X XXX XXXX"
          onChange={(e) => onChange({ phone: e.target.value })}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
        />
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle}>Email</label>
        <input
          type="email" value={state.email} placeholder="name@example.com"
          onChange={(e) => onChange({ email: e.target.value })}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
        />
      </div>

      {/* Preferred contact */}
      <div>
        <label style={labelStyle}>Preferred contact method</label>
        <div style={{ display: "flex", gap: 8 }}>
          {CONTACT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ preferredContact: opt.value })}
              style={{
                flex: 1, height: 34, borderRadius: 9, border: `1.5px solid ${state.preferredContact === opt.value ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                background: state.preferredContact === opt.value ? "var(--amber-soft)" : "var(--color-cream)",
                color: state.preferredContact === opt.value ? "var(--color-amber)" : "var(--color-muted)",
                fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes (optional)</label>
        <textarea
          value={state.notes} placeholder="Any questions or details…" rows={2}
          onChange={(e) => onChange({ notes: e.target.value })}
          style={{ ...inputStyle, height: "auto", padding: "10px 13px", resize: "none" as const, lineHeight: 1.5 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{ width: "100%", height: 46, borderRadius: 14, border: "none", background: canSubmit ? "var(--wash-amber)" : "var(--color-cream-2)", color: canSubmit ? "#fff" : "var(--color-muted)", fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 6px 18px rgba(232,146,10,0.28)" : "none", transition: "all 0.15s", marginTop: 2 }}
      >
        {submitting ? "Sending…" : submitLabel}
      </button>
    </div>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(34,197,94,0.12)", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>✓</div>
      <p style={{ fontSize: 17, fontWeight: 800, color: "var(--color-dark)", margin: "0 0 6px" }}>Request received!</p>
      <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>We&apos;ll reach out via your preferred contact method soon.</p>
      <button
        onClick={onClose}
        style={{ height: 42, padding: "0 24px", borderRadius: 12, border: "none", background: "var(--color-amber)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(232,146,10,0.28)" }}
      >
        Done
      </button>
    </div>
  );
}

// ─── Addon request modal ──────────────────────────────────────────────────────

function AddonRequestModal({
  addonType,
  addonName,
  addonColor,
  addonIcon,
  businessId,
  businessName,
  onClose,
}: {
  addonType: string;
  addonName: string;
  addonColor: string;
  addonIcon: React.ReactNode;
  businessId: string;
  businessName: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = React.useState<RequestFormState>({ name: "", phone: "", email: "", preferredContact: "whatsapp", notes: "" });
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function submit() {
    setSubmitting(true);
    await supabase.from("addon_requests").insert({
      business_id: businessId,
      addon_type: addonType,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      preferred_contact: form.preferredContact,
      notes: form.notes.trim() || null,
    });
    await fetch("/api/notify-addon-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addonType, addonName, businessName, name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, preferredContact: form.preferredContact, notes: form.notes.trim() || null }),
    });
    setSubmitting(false);
    setDone(true);
  }

  return (
    <ModalShell onClose={onClose}>
      {done ? (
        <SuccessView onClose={onClose} />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${addonColor}18`, color: addonColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {addonIcon}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--color-dark)", lineHeight: 1.2, margin: 0 }}>Enable {addonName}</p>
                <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>Fill in your details and we&apos;ll set you up.</p>
              </div>
            </div>
            <CloseBtn onClick={onClose} />
          </div>
          <div style={{ height: 1, background: "var(--color-cream-2)", marginBottom: 16 }} />
          <RequestForm
            state={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            submitting={submitting}
            onSubmit={submit}
            submitLabel="Send request"
          />
        </>
      )}
    </ModalShell>
  );
}

// ─── Custom request modal ─────────────────────────────────────────────────────

function CustomRequestModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const supabase = createClient();
  const [form, setForm] = React.useState<RequestFormState>({ name: "", phone: "", email: "", preferredContact: "whatsapp", notes: "" });
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function submit() {
    setSubmitting(true);
    await supabase.from("addon_requests").insert({
      business_id: businessId,
      addon_type: "custom",
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      preferred_contact: form.preferredContact,
      notes: form.notes.trim() || null,
    });
    setSubmitting(false);
    setDone(true);
  }

  return (
    <ModalShell onClose={onClose}>
      {done ? (
        <SuccessView onClose={onClose} />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--color-dark)", lineHeight: 1.2, margin: 0 }}>Need something custom?</p>
              <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 3 }}>Tell us what you need — we&apos;ll build it.</p>
            </div>
            <CloseBtn onClick={onClose} />
          </div>
          <div style={{ height: 1, background: "var(--color-cream-2)", marginBottom: 16 }} />
          <RequestForm
            state={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            submitting={submitting}
            onSubmit={submit}
            submitLabel="Send request"
          />
        </>
      )}
    </ModalShell>
  );
}

// ─── Email card ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EmailCard({ selectedTag, onTagClick }: { selectedTag: string | null; onTagClick: (tag: string) => void }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: "18px 20px",
        background: "var(--color-surface)",
        boxShadow: "0 2px 12px rgba(232,146,10,0.10), 0 1px 2px rgba(30,26,20,0.04)",
        border: "1.5px solid var(--color-amber)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${EMAIL_CARD.color}18`, color: EMAIL_CARD.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {EMAIL_CARD.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", lineHeight: 1.3 }}>{EMAIL_CARD.name}</p>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#E8F0FE", color: "#1A73E8", textTransform: "uppercase", letterSpacing: "0.04em" }}>monthly</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4, lineHeight: 1.5 }}>{EMAIL_CARD.blurb}</p>
            </div>
            {/* Always-active indicator */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 99, background: "rgba(34,197,94,0.10)", border: "1.5px solid rgba(34,197,94,0.22)", flexShrink: 0 }}>
              <span style={{ color: "#16A34A", display: "flex" }}><IconCheck size={10} /></span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", whiteSpace: "nowrap" }}>Active</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--color-cream-2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-muted)" }}>{EMAIL_CARD.statLabel}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-muted)" }}>Monthly quota</span>
        </div>
        <UsageBar active={true} selectedTag={null} emailMode={true} />
      </div>
    </div>
  );
}

// ─── Addon card ───────────────────────────────────────────────────────────────

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

  return (
    <div
      style={{
        borderRadius: 16,
        padding: "18px 20px",
        background: "var(--color-surface)",
        boxShadow: isActive
          ? "0 2px 12px rgba(232,146,10,0.10), 0 1px 2px rgba(30,26,20,0.04)"
          : "var(--shadow-sm)",
        border: isActive ? "1.5px solid var(--color-amber)" : "1.5px solid var(--color-cream-2)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${cfg.color}18`, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {cfg.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", lineHeight: 1.3 }}>{cfg.name}</p>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.04em", background: cfg.recurring ? "#E8F0FE" : "#F0E8FE", color: cfg.recurring ? "#1A73E8" : "#8B5CF6" }}>
                  {cfg.recurring ? "monthly" : "one-time"}
                </span>
              </div>
              {cfg.tags && (
                <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                  {cfg.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => onTagClick(t)}
                      disabled={!isActive}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 99,
                        border: "none",
                        cursor: isActive ? "pointer" : "not-allowed",
                        transition: "all 0.15s",
                        background: selectedTag === t ? cfg.color : "var(--color-cream-2)",
                        color: selectedTag === t ? "white" : "var(--color-muted)",
                        opacity: isActive ? 1 : 0.5,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: "var(--color-muted)", lineHeight: 1.5 }}>{cfg.blurb}</p>
            </div>
            <Toggle active={isActive} onEnable={() => onRequest(addon.type)} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--color-cream-2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-muted)" }}>{cfg.statLabel}</span>
          {isActive && (
            <span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-muted)" }}>
              {selectedTag ? `${selectedTag} channel` : "All channels"}
            </span>
          )}
        </div>
        <UsageBar active={isActive} selectedTag={selectedTag} emailMode={false} />
      </div>
    </div>
  );
}

// SectionLinks moved into white header strip — see ExtrasPage render

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExtrasPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [addons,          setAddons]          = useState<Addon[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [requesting,      setRequesting]      = useState<AddonType | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedTag,     setSelectedTag]     = useState<string | null>(null);

  const recurringRef = React.useRef<HTMLDivElement>(null);
  const onetimeRef   = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!business) { setLoading(false); return; }

      const { data } = await supabase.from("addons").select("*").eq("business_id", business.id);

      if (!data || data.length === 0) {
        const ins = ALL_TYPES.map((type) => ({ business_id: business.id, type, active: false }));
        const { data: nd } = await supabase.from("addons").insert(ins).select();
        setAddons((nd || []) as Addon[]);
      } else {
        const have = new Set(data.map((a: Addon) => a.type));
        const miss = ALL_TYPES.filter((t) => !have.has(t)).map((type) => ({ business_id: business.id, type, active: false }));
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
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", background: "var(--color-cream)" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--color-amber)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  function get(type: AddonType): Addon {
    return addons.find((a) => a.type === type) ?? { id: type, type, active: false, activated_at: null };
  }

  const handleTagClick = (tag: string) => setSelectedTag(selectedTag === tag ? null : tag);

  return (
    <>
      {/* White header strip */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", width: "100%", padding: "26px 24px 0" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: "0 0 14px" }}>Extras</h1>
          {/* Scroll-anchor tabs */}
          <div style={{ display: "flex", marginBottom: -1 }}>
            {[
              { label: "Recurring", onClick: () => recurringRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
              { label: "One-time",  onClick: () => onetimeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
            ].map(({ label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                style={{ padding: "0 2px 12px", marginInlineEnd: 22, fontSize: 14, fontWeight: 600, color: "var(--color-dark)", background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer", transition: "color 0.15s, border-color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-amber)"; e.currentTarget.style.borderBottomColor = "var(--color-amber)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-dark)"; e.currentTarget.style.borderBottomColor = "transparent"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "var(--color-cream)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", width: "100%", padding: "24px 24px 64px" }}>

          {/* Email card */}
          <div style={{ marginBottom: 16 }}>
            <EmailCard selectedTag={selectedTag} onTagClick={handleTagClick} />
          </div>

          {/* Recurring */}
          <div ref={recurringRef} style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
            {MONTHLY.map((t) => (
              <AddonCard key={t} addon={get(t)} onRequest={setRequesting} selectedTag={selectedTag} onTagClick={handleTagClick} />
            ))}
          </div>

          {/* One-time */}
          <div ref={onetimeRef} style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
            {ONETIME.map((t) => (
              <AddonCard key={t} addon={get(t)} onRequest={setRequesting} selectedTag={selectedTag} onTagClick={handleTagClick} />
            ))}
          </div>

          {/* Custom CTA */}
          <div
            style={{ borderRadius: 16, padding: "14px 18px", background: "var(--color-surface)", boxShadow: "var(--shadow-sm)", border: "1.5px solid var(--color-cream-2)", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "border-color 0.15s" }}
            onClick={() => setShowCustomModal(true)}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-amber)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-cream-2)")}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--color-cream-2)", color: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)" }}>Need something custom?</p>
              <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>We build integrations for specific needs.</p>
            </div>
            <button
              style={{ fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 99, background: "var(--amber-soft)", color: "var(--color-amber)", border: "none", cursor: "pointer", flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); setShowCustomModal(true); }}
            >
              Talk to us
            </button>
          </div>

        </div>
      </div>

      {requesting && business && (
        <AddonRequestModal
          addonType={requesting}
          addonName={CATALOG[requesting].name}
          addonColor={CATALOG[requesting].color}
          addonIcon={CATALOG[requesting].icon}
          businessId={business.id}
          businessName={business.name}
          onClose={() => setRequesting(null)}
        />
      )}

      {showCustomModal && business && <CustomRequestModal businessId={business.id} onClose={() => setShowCustomModal(false)} />}
    </>
  );
}

// needed for ref
import React from "react";
