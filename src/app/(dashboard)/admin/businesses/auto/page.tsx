"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid var(--color-cream-2)",
  background: "var(--color-surface)",
  color: "var(--color-dark)",
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
};

export default function AutoIntakePage() {
  const router = useRouter();

  const [slug,  setSlug]  = useState("");
  const [lang,  setLang]  = useState<"he" | "en">("he");
  const [raw,   setRaw]   = useState("");
  const [vibe,  setVibe]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleGenerate() {
    setError("");
    if (!slug.trim())  { setError("Slug is required."); return; }
    if (!raw.trim())   { setError("Paste some info first."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), lang, raw, vibe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push(`/admin/businesses/${data.id}`);
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Back */}
      <button
        onClick={() => router.push("/admin/businesses")}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-muted)", marginBottom: 28, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", letterSpacing: "-0.02em", marginBottom: 6, margin: "0 0 6px" }}>
        ✨ Auto-create business
      </h1>
      <p style={{ fontSize: 14, color: "var(--color-muted)", marginBottom: 32, marginTop: 0 }}>
        Paste messy info — IG bio, Google Maps text, price list, reviews — and Gemini fills every tab. You review, upload photos, then publish.
      </p>

      {/* Slug */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          Slug (URL)
        </label>
        <input
          value={slug}
          onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="studio-avi"
          style={inputStyle}
        />
        {slug && (
          <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
            book.bapita.com/<strong style={{ color: "var(--color-amber)" }}>{slug}</strong>
          </div>
        )}
      </div>

      {/* Language */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Primary language
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {(["he", "en"] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                height: 36, padding: "0 18px", borderRadius: 9,
                border: `1.5px solid ${lang === l ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                background: lang === l ? "rgba(232,146,10,0.1)" : "var(--color-surface)",
                color: lang === l ? "var(--color-amber)" : "var(--color-muted)",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {l === "he" ? "עברית (Hebrew)" : "English"}
            </button>
          ))}
        </div>
      </div>

      {/* Raw paste */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          Paste everything here
        </label>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 8px" }}>
          IG bio, service list, Google Maps (hours, address, phone, rating, reviews) — messy is fine.
        </p>
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder={"ספרות אבי, תל אביב\nחייגו: 054-1234567\nשעות: א-ה 9:00-19:00, ו 9:00-14:00\nתספורת גבר 70₪, זקן 40₪\n\nGoogle Maps reviews:\n⭐⭐⭐⭐⭐ — \"תספורת מעולה, מקצועי ומהיר\" — Moshe K."}
          rows={10}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      </div>

      {/* Vibe */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          Vibe / notes <span style={{ fontSize: 11, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </label>
        <input
          value={vibe}
          onChange={e => setVibe(e.target.value)}
          placeholder={`e.g. "small neighborhood barber, no socials" / "upscale women's salon, fancy"`}
          style={inputStyle}
        />
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: "#991B1B", marginBottom: 20 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: "100%", height: 48, borderRadius: 12, border: "none",
          background: loading ? "var(--color-cream-2)" : "var(--color-amber)",
          color: loading ? "var(--color-muted)" : "#fff",
          fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
          fontFamily: "inherit", letterSpacing: "-0.01em",
          boxShadow: loading ? "none" : "0 4px 14px rgba(232,146,10,0.28)",
          transition: "background 0.2s, box-shadow 0.2s",
        }}
      >
        {loading ? "Generating with Gemini…" : "✨ Generate with Gemini"}
      </button>

      <p style={{ fontSize: 12, color: "var(--color-muted)", textAlign: "center", marginTop: 16 }}>
        Creates a draft — you review every tab, upload photos, then publish.
      </p>
    </div>
  );
}
