"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Signup is disabled — new clients go through bapita.com lead form → admin approval


function BapitaMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 90) / 110} viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M8 16 Q8 86 55 86 Q102 86 102 16 Z" fill="#E8920A" />
      <rect x="8" y="6" width="94" height="14" rx="7" fill="#B86800" />
      <path d="M18 34 Q55 52 92 34" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M24 56 Q55 72 86 56" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" />
    </svg>
  );
}

export default function LoginPage() {
  const [tab,          setTab]          = useState<"login" | "forgot">("login");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [resetSent,    setResetSent]    = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); }
    else        { window.location.href = "/calendar"; }
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Enter your email address first."); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) { setError("Something went wrong. Try again."); }
    else          { setResetSent(true); }
  }

  function switchTab(t: "login" | "forgot") {
    setTab(t);
    setError("");
    setResetSent(false);
  }

  const inputStyle: React.CSSProperties = {
    height: 44,
    width: "100%",
    padding: "0 13px",
    borderRadius: 11,
    border: "1.5px solid var(--color-cream-2)",
    background: "var(--color-cream)",
    fontSize: 14,
    color: "var(--color-dark)",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  const errorBorder: React.CSSProperties = error ? { borderColor: "#EF4444" } : {};

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", background: "var(--color-cream)" }}>

      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <BapitaMark size={30} />
        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--color-dark)", letterSpacing: "-0.03em" }}>bapita</span>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 360, background: "var(--color-surface)", borderRadius: 20, boxShadow: "0 2px 4px rgba(30,26,20,0.06), 0 8px 32px rgba(30,26,20,0.08)", overflow: "hidden", border: "1px solid var(--color-cream-2)" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px 0", borderBottom: "1px solid var(--color-cream-2)", paddingBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>Log in to your dashboard</p>
        </div>

        <div style={{ padding: "24px 24px 28px" }}>
          {tab === "forgot" ? (
            resetSent ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--amber-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <MailIcon />
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, color: "var(--color-dark)", marginBottom: 6 }}>Check your email</p>
                <p style={{ fontSize: 13, color: "var(--color-muted)", lineHeight: 1.5, marginBottom: 20 }}>
                  Password reset link sent to <strong style={{ color: "var(--color-dark)" }}>{email}</strong>
                </p>
                <button type="button" onClick={() => switchTab("login")} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-amber)", background: "none", border: "none", cursor: "pointer" }}>
                  Back to log in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 14, color: "var(--color-muted)", margin: "0 0 4px", lineHeight: 1.5 }}>Enter your email and we'll send a reset link.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    style={{ ...inputStyle, ...(error ? { borderColor: "#EF4444" } : {}) }}
                    onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--color-amber)"; }}
                    onBlur={(e)  => { if (!error) e.currentTarget.style.borderColor = "var(--color-cream-2)"; }}
                  />
                </div>
                {error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: -4 }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ width: "100%", height: 46, borderRadius: 12, border: "none", background: "var(--wash-amber)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 14px rgba(232,146,10,0.30)" }}>
                  {loading ? "…" : "Send reset link"}
                </button>
                <button type="button" onClick={() => switchTab("login")} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  Back to log in
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{ ...inputStyle, ...errorBorder }}
                  onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--color-amber)"; }}
                  onBlur={(e)  => { if (!error) e.currentTarget.style.borderColor = "var(--color-cream-2)"; }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  style={{ ...inputStyle, ...errorBorder }}
                  onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--color-amber)"; }}
                  onBlur={(e)  => { if (!error) e.currentTarget.style.borderColor = "var(--color-cream-2)"; }}
                />
                <button
                  type="button"
                  onClick={() => switchTab("forgot")}
                  style={{ alignSelf: "flex-end", fontSize: 12, fontWeight: 600, color: "var(--color-amber)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "#EF4444", marginTop: -4 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 12,
                  border: "none",
                  background: "var(--wash-amber)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 4px 14px rgba(232,146,10,0.30)",
                  transition: "opacity 0.15s, transform 0.15s, box-shadow 0.15s",
                  marginTop: 4,
                }}
                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(232,146,10,0.38)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(232,146,10,0.30)"; }}
              >
                {loading ? "…" : "Log in"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--color-muted)" }}>
        Your business, online. Done for you.
      </p>
    </div>
  );
}
