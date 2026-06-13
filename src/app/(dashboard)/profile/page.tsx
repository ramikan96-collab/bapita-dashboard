"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const [email,           setEmail]           = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, [supabase]);

  async function updatePassword() {
    if (newPassword !== confirmPassword) { showToast("Passwords don't match", "error"); return; }
    if (newPassword.length < 6)          { showToast("Password must be at least 6 characters", "error"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Password updated", "success");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const mismatch = !!confirmPassword && newPassword !== confirmPassword;
  const canSave  = !!newPassword && !mismatch && !loading;

  const cardStyle: React.CSSProperties = {
    background: "var(--color-surface)",
    borderRadius: 16,
    border: "1px solid var(--color-cream-2)",
    boxShadow: "var(--shadow-sm)",
    padding: "18px 20px",
    marginBottom: 12,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--color-muted)",
    display: "block",
    marginBottom: 7,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    padding: "0 40px 0 13px",
    borderRadius: 11,
    border: "1.5px solid var(--color-cream-2)",
    background: "var(--color-cream)",
    fontSize: 14,
    color: "var(--color-dark)",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "26px 24px 20px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0, lineHeight: 1.1 }}>Profile</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>Account settings</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "24px 24px 64px" }}>

          {/* Email */}
          <div style={cardStyle}>
            <span style={labelStyle}>Email</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                {email || "—"}
              </p>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: "var(--color-cream-2)", color: "var(--color-muted)", flexShrink: 0 }}>
                Read only
              </span>
            </div>
          </div>

          {/* Change password */}
          <div style={cardStyle}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", margin: "0 0 18px" }}>Change password</p>

            {/* New */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>New password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={inputStyle}
                  onFocus={(e)  => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                  onBlur={(e)   => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", display: "flex", padding: 0 }}
                >
                  <EyeIcon open={showNew} />
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Confirm password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{ ...inputStyle, ...(mismatch ? { borderColor: "#EF4444" } : {}) }}
                  onFocus={(e)  => { if (!mismatch) e.currentTarget.style.borderColor = "var(--color-amber)"; }}
                  onBlur={(e)   => { if (!mismatch) e.currentTarget.style.borderColor = "var(--color-cream-2)"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", display: "flex", padding: 0 }}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {mismatch && (
                <p style={{ fontSize: 12, color: "#EF4444", marginTop: 5 }}>Passwords don't match</p>
              )}
            </div>

            <button
              onClick={updatePassword}
              disabled={!canSave}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "none",
                background: canSave ? "var(--wash-amber)" : "var(--color-cream-2)",
                color: canSave ? "#fff" : "var(--color-muted)",
                fontSize: 14,
                fontWeight: 700,
                cursor: canSave ? "pointer" : "not-allowed",
                transition: "background 0.15s, color 0.15s",
                boxShadow: canSave ? "0 4px 14px rgba(232,146,10,0.28)" : "none",
              }}
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </div>

          {/* Sign out */}
          <div style={{ ...cardStyle, marginBottom: 0, padding: "14px 20px" }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 11,
                border: "1.5px solid rgba(239,68,68,0.28)",
                background: "transparent",
                color: "#EF4444",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <SignOutIcon />
              Sign out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
