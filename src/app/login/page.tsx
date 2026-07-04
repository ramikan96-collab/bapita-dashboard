"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { translate, type DashboardLang } from "@/i18n/dict";

// Signup is disabled — new clients go through bapita.com lead form → admin approval

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

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
  // Login lives outside LangProvider (no business row yet, pre-auth) — read
  // the OS/browser locale directly instead. Defaults he (Hebrew-first product).
  const [lang,         setLang]         = useState<DashboardLang>("he");

  const supabase = createClient();
  const t = useCallback((key: string) => translate(lang, key), [lang]);

  useEffect(() => {
    const nav = typeof navigator !== "undefined" ? navigator.language : "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(nav.toLowerCase().startsWith("en") ? "en" : "he");
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  async function handleGoogle() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

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
    if (!email) { setError(t("Enter your email address first.")); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) { setError(t("Something went wrong. Try again.")); }
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
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>{t("Log in to your dashboard")}</p>
        </div>

        <div style={{ padding: "24px 24px 28px" }}>
          {tab === "forgot" ? (
            resetSent ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--amber-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <MailIcon />
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, color: "var(--color-dark)", marginBottom: 6 }}>{t("Check your email")}</p>
                <p style={{ fontSize: 13, color: "var(--color-muted)", lineHeight: 1.5, marginBottom: 20 }}>
                  {t("Password reset link sent to")} <strong style={{ color: "var(--color-dark)" }}>{email}</strong>
                </p>
                <button type="button" onClick={() => switchTab("login")} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-amber)", background: "none", border: "none", cursor: "pointer" }}>
                  {t("Back to log in")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 14, color: "var(--color-muted)", margin: "0 0 4px", lineHeight: 1.5 }}>{t("Enter your email and we'll send a reset link.")}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("Email")}</label>
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
                <button type="submit" disabled={loading} style={{ width: "100%", height: 44, borderRadius: 12, border: "none", background: "var(--wash-amber)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 14px rgba(232,146,10,0.30)" }}>
                  {loading ? t("Sending…") : t("Send reset link")}
                </button>
                <button type="button" onClick={() => switchTab("login")} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  {t("Back to log in")}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("Email")}</label>
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
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("Password")}</label>
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
                  {t("Forgot password?")}
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
                  height: 44,
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
                {loading ? t("Logging in…") : t("Log in")}
              </button>
            </form>
          )}

          {tab === "login" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0 14px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--color-cream-2)" }} />
                <span style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}>{t("or")}</span>
                <div style={{ flex: 1, height: 1, background: "var(--color-cream-2)" }} />
              </div>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                style={{
                  width: "100%", height: 44, borderRadius: 12,
                  border: "1.5px solid var(--color-cream-2)",
                  background: "var(--color-surface)",
                  color: "var(--color-dark)", fontSize: 15, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "border-color 0.15s", boxSizing: "border-box", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.borderColor = "var(--color-amber)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; }}
              >
                <GoogleIcon />
                {t("Continue with Google")}
              </button>
            </>
          )}
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--color-muted)" }}>
        {t("Your business, online. Done for you.")}
      </p>
    </div>
  );
}
