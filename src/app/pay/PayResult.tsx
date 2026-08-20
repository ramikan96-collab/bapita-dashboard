"use client";

import { useEffect, useState } from "react";

// Shared shell for the two payment return pages. Standalone from the booking
// page themes on purpose: Green Invoice redirects here directly, so the page
// must render with no business context loaded.

export type PayLang = "he" | "en";

export function PayCard({
  lang,
  icon,
  title,
  body,
  children,
}: {
  lang: PayLang;
  icon: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      dir={lang === "he" ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#FAF5EC", padding: 24,
      }}
    >
      <div style={{
        maxWidth: 420, width: "100%", background: "#fff", borderRadius: 20,
        boxShadow: "0 2px 16px rgba(30,26,20,0.08)", padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 44, marginBottom: 8 }} aria-hidden="true">{icon}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E1A14", margin: "0 0 8px" }}>{title}</h1>
        <p style={{ fontSize: 15, color: "#6B6257", margin: 0, lineHeight: 1.6 }}>{body}</p>
        {children}
      </div>
    </div>
  );
}

// A business slug: lowercase letters, digits and dashes only — the same charset
// the booking pages use.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function BackLink({ slug, label }: { slug: string; label: string }) {
  // SECURITY: `slug` arrives from the ?s= query parameter, which anyone can set.
  // Interpolating it unchecked lets `?s=/evil.com` render href="//evil.com" — a
  // protocol-relative link that leaves the site entirely. On a payment return
  // page that is a ready-made phishing hop, so anything that is not a plain
  // slug renders no link at all.
  if (!SLUG_RE.test(slug)) return null;
  return (
    <a
      href={`/${slug}`}
      style={{
        display: "inline-block", marginTop: 20, padding: "12px 24px", borderRadius: 9999,
        background: "#1E1A14", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none",
      }}
    >
      {label}
    </a>
  );
}

export type PayStatus = "pending" | "paid" | "expired" | "confirmed" | "unknown";

/**
 * Polls the booking's payment state. Green Invoice's callback settles the
 * booking server-side; the same endpoint also reconciles directly with Green
 * Invoice, so a customer who really paid gets confirmed even when the callback
 * never arrives. Stops on any terminal state, and after ~90s regardless.
 */
export function usePaymentStatus(bookingId: string): { status: PayStatus; timedOut: boolean } {
  const [status, setStatus] = useState<PayStatus>(bookingId ? "pending" : "unknown");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let stop = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // ~90s at 3s intervals

    async function tick() {
      if (stop) return;
      attempts++;
      try {
        const res = await fetch(`/api/public/payment-status?b=${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        const data = await res.json();
        const next = String(data.status || "unknown") as PayStatus;
        if (stop) return;
        setStatus(next);
        if (next === "paid" || next === "expired" || next === "confirmed") return;
      } catch {
        // Network hiccup — keep polling until the attempt budget runs out.
      }
      if (attempts >= MAX_ATTEMPTS) {
        if (!stop) setTimedOut(true);
        return;
      }
      setTimeout(tick, 3000);
    }

    tick();
    return () => { stop = true; };
  }, [bookingId]);

  return { status, timedOut };
}
