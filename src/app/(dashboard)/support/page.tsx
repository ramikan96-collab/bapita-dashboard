"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

export default function SupportPage() {
  const { showToast } = useToast();

  const [name,    setName]    = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = !!subject.trim() && !!message.trim() && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, message }),
      });
      if (!res.ok) throw new Error("failed");
      showToast("Message sent — we'll get back to you soon", "success");
      setName("");
      setSubject("");
      setMessage("");
    } catch {
      showToast("Couldn't send. Please try again.", "error");
    } finally {
      setSending(false);
    }
  }

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
    padding: "0 13px",
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

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-amber)");
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-cream-2)");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "26px 24px 20px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0, lineHeight: 1.1 }}>Support</h1>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "24px 24px 64px" }}>

          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 18px", lineHeight: 1.6 }}>
              Question, bug, or feedback? Send us a message and we&apos;ll get back to you by email.
            </p>

            {/* Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Name <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
            </div>

            {/* Subject */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's going on…"
                rows={6}
                style={{ ...inputStyle, height: "auto", padding: "11px 13px", resize: "vertical", lineHeight: 1.5 }}
                onFocus={focus}
                onBlur={blur}
              />
            </div>

            <button
              onClick={send}
              disabled={!canSend}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "none",
                background: canSend ? "var(--wash-amber)" : "var(--color-cream-2)",
                color: canSend ? "#fff" : "var(--color-muted)",
                fontSize: 14,
                fontWeight: 700,
                cursor: canSend ? "pointer" : "not-allowed",
                transition: "background 0.15s, color 0.15s",
                boxShadow: canSend ? "0 4px 14px rgba(232,146,10,0.28)" : "none",
              }}
            >
              {sending ? "Sending…" : "Send message"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
