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

  const inputClass =
    "h-12 w-full px-4 rounded-[10px] border bg-white text-[15px] text-dark " +
    "placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 " +
    "focus:ring-amber/30 transition-colors";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "var(--color-cream)" }}
    >
      {/* Wordmark */}
      <div className="mb-8 text-center">
        <span className="text-[32px] font-black tracking-tight text-dark">bapita</span>
      </div>

      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)" }}
      >
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--color-cream-2)" }}>
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError("");
                setSignupDone(false);
              }}
              className="flex-1 py-4 text-[15px] font-bold transition-colors"
              style={{
                color: tab === t ? "var(--color-amber)" : "var(--color-muted)",
                borderBottom: tab === t ? "2px solid var(--color-amber)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {t === "login" ? "Login" : "Create account"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {signupDone ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-3">✉️</div>
              <p className="text-[18px] font-bold mb-1 text-dark">Check your email</p>
              <p className="text-[15px]" style={{ color: "var(--color-muted)" }}>
                We sent a confirmation link to <strong className="text-dark">{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {tab === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-dark">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className={inputClass}
                    style={{ borderColor: "var(--color-cream-2)" }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-dark">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className={inputClass}
                  style={{ borderColor: error ? "var(--color-cancelled)" : "var(--color-cream-2)" }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-dark">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className={inputClass}
                  style={{ borderColor: error ? "var(--color-cancelled)" : "var(--color-cream-2)" }}
                />
              </div>

              {error && (
                <p className="text-[12px] -mt-2" style={{ color: "var(--color-cancelled)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white transition-colors disabled:opacity-60 bg-amber hover:bg-[var(--color-amber-hover)] active:bg-[var(--color-amber-dark)]"
              >
                {loading ? "…" : tab === "login" ? "Login" : "Create account"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-6 text-[13px]" style={{ color: "var(--color-muted)" }}>
        Free consultation. No commitment.
      </p>
    </div>
  );
}
