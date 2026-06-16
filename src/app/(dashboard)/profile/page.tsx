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

  const [email,              setEmail]              = useState("");
  const [newPassword,        setNewPassword]        = useState("");
  const [confirmPassword,    setConfirmPassword]    = useState("");
  const [loading,            setLoading]            = useState(false);
  const [showNew,            setShowNew]            = useState(false);
  const [showConfirm,        setShowConfirm]        = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [deletingAccount,    setDeletingAccount]    = useState(false);

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

  async function deleteAccount() {
    setDeletingAccount(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDeletingAccount(false); return; }
    const res = await fetch("/api/delete-account", { method: "POST" });
    if (!res.ok) {
      showToast("Couldn't delete account. Contact support.", "error");
      setDeletingAccount(false);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "https://bapita.com";
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
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "24px 24px 64px" }}>

          {/* Email */}
          <div style={cardStyle}>
            <span style={labelStyle}>Email</span>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
              {email || "—"}
            </p>
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

          {/* Delete account */}
          <div style={{ ...cardStyle, padding: "14px 20px" }}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 11,
                border: "none",
                background: "#FEE2E2",
                color: "#B91C1C",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FECACA")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#FEE2E2")}
            >
              Delete my account
            </button>
          </div>

          {/* Sign out */}
          <div style={{ ...cardStyle, marginBottom: 0, padding: "14px 20px" }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "https://bapita.com"; }}
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

          {/* Delete account confirm dialog */}
          {showDeleteConfirm && (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,26,20,0.48)", backdropFilter: "blur(4px)", padding: 20 }}
              onClick={() => !deletingAccount && setShowDeleteConfirm(false)}
            >
              <div
                style={{ width: "100%", maxWidth: 380, background: "var(--color-surface)", borderRadius: 20, padding: "28px 24px", border: "1px solid var(--color-cream-2)", boxShadow: "0 8px 48px rgba(30,26,20,0.18)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "#FEE2E2", color: "#B91C1C", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, color: "var(--color-dark)", margin: "0 0 8px" }}>Delete your account?</p>
                <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 6px", lineHeight: 1.6 }}>
                  This will permanently delete your account, business profile, all clients, and all booking history.
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C", margin: "0 0 22px" }}>This action cannot be undone.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingAccount}
                    style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid var(--color-cream-2)", background: "transparent", fontSize: 14, fontWeight: 600, color: "var(--color-dark)", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteAccount}
                    disabled={deletingAccount}
                    style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "#B91C1C", color: "white", fontSize: 14, fontWeight: 700, cursor: deletingAccount ? "not-allowed" : "pointer", opacity: deletingAccount ? 0.7 : 1 }}
                  >
                    {deletingAccount ? "Deleting…" : "Yes, delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
