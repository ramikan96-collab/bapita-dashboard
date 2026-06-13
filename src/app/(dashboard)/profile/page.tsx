"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, [supabase]);

  async function updatePassword() {
    if (newPassword !== confirmPassword) {
      showToast("הסיסמאות אינן תואמות", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("הסיסמה חייבת להכיל לפחות 6 תווים", "error");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("הסיסמה עודכנה בהצלחה", "success");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-[var(--color-cream-2)]" style={{ background: "var(--color-surface)" }}>
        <h1 className="text-[28px] font-extrabold leading-tight text-dark">פרופיל</h1>
        <p className="text-[15px] mt-1 text-muted">ניהול חשבון</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Email card */}
        <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(232,146,10,0.12)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-muted">כתובת מייל</div>
              <div className="text-[15px] font-semibold text-dark truncate mt-0.5">
                {email || "..."}
              </div>
            </div>
            <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full"
              style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}>
              קריאה בלבד
            </span>
          </div>
        </div>

        {/* Password change */}
        <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-[18px] font-bold text-dark">שינוי סיסמה</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-dark">סיסמה חדשה</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="h-12 w-full px-4 pe-11 rounded-[10px] border border-[var(--color-cream-2)]
                  text-[15px] text-dark placeholder:text-muted
                  focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                style={{ background: "var(--color-surface)" }}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 end-3 flex items-center text-muted hover:text-dark transition-colors"
              >
                {showNew ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-dark">אישור סיסמה</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="חזור על הסיסמה החדשה"
                className="h-12 w-full px-4 pe-11 rounded-[10px] border border-[var(--color-cream-2)]
                  text-[15px] text-dark placeholder:text-muted
                  focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors"
                style={{
                  background: "var(--color-surface)",
                  ...(confirmPassword && newPassword !== confirmPassword ? { borderColor: "#EF4444" } : {}),
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 end-3 flex items-center text-muted hover:text-dark transition-colors"
              >
                {showConfirm ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[12px]" style={{ color: "#EF4444" }}>הסיסמאות אינן תואמות</p>
            )}
          </div>

          <button
            onClick={updatePassword}
            disabled={loading || !newPassword || newPassword !== confirmPassword}
            className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white
              bg-amber hover:bg-[#D4830A] active:bg-[#B86800] transition-colors disabled:opacity-50"
          >
            {loading ? "מעדכן..." : "עדכן סיסמה"}
          </button>
        </div>

        {/* Sign out */}
        <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="w-full py-3.5 rounded-xl text-[15px] font-medium flex items-center justify-center gap-2
              text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444]/8 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            התנתקות
          </button>
        </div>
      </div>
    </div>
  );
}
