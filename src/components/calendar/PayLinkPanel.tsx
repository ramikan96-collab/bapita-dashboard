"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { payLinkUrl, LINK_DEFAULT_HOURS } from "@/lib/payment-links-shared";

// Booking drawer → stay request → private pay link (spec: docs/specs/2026-11-10-stay-pay-link.md).
// The host sets the agreed total, creates the link and sends it to the guest
// himself (copy or WhatsApp). Creating a new link cancels the previous one.

interface ActiveLink {
  token: string;
  amount: number;
  lang: "en" | "he";
  expires_at: string;
}

interface Props {
  bookingId: string;
  defaultAmount: number | null;
  defaultLang: "en" | "he";
  guestPhone: string | null;
  guestEmail?: string | null;
  summary: string;
  /** Open the share view straight away (host just created this booking). */
  onChange?: () => void;
}

/** 05X-XXXXXXX / +972 / 972 → 9725XXXXXXXX for wa.me. Null when not a usable number. */
function waNumber(phone: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("972")) return d;
  if (d.startsWith("0")) return "972" + d.slice(1);
  return d.length >= 8 ? d : null;
}

export default function PayLinkPanel({ bookingId, defaultAmount, defaultLang, guestPhone, guestEmail, summary, onChange }: Props) {
  const supabase = createClient();
  const [link, setLink] = useState<ActiveLink | null | "loading">("loading");
  const [amount, setAmount] = useState(defaultAmount != null ? String(defaultAmount) : "");
  const [lang, setLang] = useState<"en" | "he">(defaultLang);
  const [hours, setHours] = useState(String(LINK_DEFAULT_HOURS));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("payment_links")
        .select("token, amount, lang, expires_at")
        .eq("booking_id", bookingId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (cancelled) return;
      if (err) { setError("Could not load the payment link."); setLink(null); return; }
      setLink(data ? { ...(data as ActiveLink), amount: Number(data.amount) } : null);
    })();
    return () => { cancelled = true; };
  }, [supabase, bookingId]);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/payments/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, amount, lang, hours: Number(hours) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || "Could not create the link."); return; }
      setLink({ token: body.link.token, amount: body.link.amount, lang: body.link.lang, expires_at: body.link.expires_at });
      onChange?.();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/payments/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error || "Could not cancel."); return; }
      setLink(null);
      onChange?.();
    } finally {
      setBusy(false);
    }
  }

  const box: React.CSSProperties = {
    background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 16, padding: "14px 18px",
  };
  const label: React.CSSProperties = { fontSize: 13, color: "var(--color-muted)", display: "block", marginBottom: 4 };
  const input: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-cream-2)",
    background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 15,
  };
  const btn = (primary: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, border: 0, cursor: "pointer",
    background: primary ? "var(--color-amber)" : "rgba(232,146,10,0.12)", color: primary ? "#fff" : "var(--color-amber)",
    opacity: busy ? 0.6 : 1,
  });

  if (link === "loading") return <div style={box}><span style={label}>Payment link…</span></div>;

  if (link) {
    const url = payLinkUrl(link.token);
    const wa = waNumber(guestPhone);
    const text = link.lang === "he"
      ? `קישור לתשלום מאובטח עבור ${summary}: ${url}`
      : `Here is your secure payment link for ${summary}: ${url}`;
    const until = new Date(link.expires_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return (
      <div style={box}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>Payment link sent for</span>
          <span className="text-[15px] font-bold" style={{ color: "var(--color-dark)" }}>₪{link.amount}</span>
        </div>
        <div className="text-[12px]" style={{ color: "var(--color-muted)", wordBreak: "break-all", marginBottom: 6 }} dir="ltr">{url}</div>
        <div className="text-[12px]" style={{ color: "var(--color-muted)", marginBottom: 10 }}>
          Valid until {until} · {link.lang === "he" ? "Hebrew" : "English"} page
        </div>
        <div className="flex gap-2">
          <button style={btn(true)} disabled={busy} onClick={async () => {
            try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
          }}>{copied ? "Copied ✓" : "Copy link"}</button>
          {guestEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) && (
            <a style={{ ...btn(false), textAlign: "center", textDecoration: "none" }}
              href={`mailto:${guestEmail}?subject=${encodeURIComponent(link.lang === "he" ? "קישור לתשלום" : "Your payment link")}&body=${encodeURIComponent(text)}`}>
              Email
            </a>
          )}
          {wa && (
            <a style={{ ...btn(false), textAlign: "center", textDecoration: "none" }}
              href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          )}
          <button style={btn(false)} disabled={busy} onClick={cancel}>Cancel link</button>
        </div>
        {error && <p className="text-[13px]" style={{ color: "var(--color-danger)", marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={box}>
      <div className="text-[14px] font-bold" style={{ color: "var(--color-dark)", marginBottom: 10 }}>Send a payment link</div>
      <label style={label} htmlFor={`pl-amount-${bookingId}`}>Total the guest pays (₪)</label>
      <input id={`pl-amount-${bookingId}`} style={input} inputMode="decimal" value={amount}
        onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 4700" />
      <div className="flex gap-2" style={{ marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={label} htmlFor={`pl-lang-${bookingId}`}>Page language</label>
          <select id={`pl-lang-${bookingId}`} style={input} value={lang} onChange={(e) => setLang(e.target.value === "he" ? "he" : "en")}>
            <option value="en">English</option>
            <option value="he">עברית</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={label} htmlFor={`pl-hours-${bookingId}`}>Valid for</label>
          <select id={`pl-hours-${bookingId}`} style={input} value={hours} onChange={(e) => setHours(e.target.value)}>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">3 days</option>
            <option value="168">7 days</option>
          </select>
        </div>
      </div>
      <div className="flex" style={{ marginTop: 12 }}>
        <button style={btn(true)} disabled={busy || !amount} onClick={create}>{busy ? "Creating…" : "Create link"}</button>
      </div>
      {error && <p className="text-[13px]" style={{ color: "var(--color-danger)", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
