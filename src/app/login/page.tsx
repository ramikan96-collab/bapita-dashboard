"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/calendar");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) {
        setError(error.message);
      } else {
        setSignupDone(true);
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--color-cream)" }}>

      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-3xl font-black tracking-tight" style={{ color: "var(--color-dark)" }}>
          bapita
        </span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--color-cream-2)" }}>
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setSignupDone(false); }}
              className="flex-1 py-3.5 text-sm font-bold transition-colors"
              style={{
                color: tab === t ? "var(--color-amber)" : "var(--color-muted)",
                borderBottom: tab === t ? "2px solid var(--color-amber)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {t === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {signupDone ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-3">✉️</div>
              <p className="font-bold mb-1" style={{ color: "var(--color-dark)" }}>Check your email</p>
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                We sent a confirmation link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {tab === "signup" && (
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-muted)" }}>
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-colors"
                    style={{
                      borderColor: "var(--color-cream-2)",
                      background: "var(--color-cream)",
                      color: "var(--color-dark)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-muted)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-colors"
                  style={{
                    borderColor: "var(--color-cream-2)",
                    background: "var(--color-cream)",
                    color: "var(--color-dark)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-muted)" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-colors"
                  style={{
                    borderColor: "var(--color-cream-2)",
                    background: "var(--color-cream)",
                    color: "var(--color-dark)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
                />
              </div>

              {error && (
                <p className="text-xs text-center" style={{ color: "var(--color-cancelled)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold mt-1 transition-opacity disabled:opacity-60"
                style={{ background: "var(--color-amber)", color: "#fff" }}
              >
                {loading ? "…" : tab === "login" ? "Log In" : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs" style={{ color: "var(--color-muted)" }}>
        © 2026 Bapita
      </p>
    </div>
  );
}
