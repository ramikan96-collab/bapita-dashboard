"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function updatePassword() {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords don't match" });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--color-dark)" }}>Profile</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
          Manage your account settings
        </p>
      </div>
      
      <div className="flex-1 p-4 space-y-6">
        {/* Email Section */}
        <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-2)" }}>
          <div className="text-sm font-bold mb-1" style={{ color: "var(--color-dark)" }}>Email address</div>
          <div className="text-sm opacity-60">Your email is managed by Supabase. Contact support to change it.</div>
        </div>
        
        {/* Change Password Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold" style={{ color: "var(--color-dark)" }}>Change password</h2>
          
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {message.text}
            </div>
          )}
          
          <div>
            <label className="text-sm font-bold mb-1 block">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border"
              style={{ borderColor: "var(--color-cream-2)" }}
              placeholder="Minimum 6 characters"
            />
          </div>
          
          <div>
            <label className="text-sm font-bold mb-1 block">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border"
              style={{ borderColor: "var(--color-cream-2)" }}
            />
          </div>
          
          <button
            onClick={updatePassword}
            disabled={loading || !newPassword}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--color-amber)" }}
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </div>
        
        {/* Sign Out Section */}
        <div className="pt-4 border-t" style={{ borderColor: "var(--color-cream-2)" }}>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
