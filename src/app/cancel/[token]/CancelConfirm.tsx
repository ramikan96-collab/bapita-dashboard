"use client";

import { useState } from "react";
import Link from "next/link";

export default function CancelConfirm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function cancel() {
    setState("loading");
    try {
      const res = await fetch("/api/public/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErrorMsg("Connection error. Please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
        <p style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>Appointment cancelled</p>
        <p style={{ color: "#888", fontSize: 14, margin: 0 }}>The time slot is now free for others to book.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {state === "error" && (
        <p style={{ color: "#EF4444", fontSize: 13, margin: 0 }}>{errorMsg}</p>
      )}
      <button
        onClick={cancel}
        disabled={state === "loading"}
        style={{
          width: "100%",
          height: 48,
          borderRadius: 14,
          border: "none",
          background: state === "loading" ? "#f0f0f0" : "#EF4444",
          color: state === "loading" ? "#aaa" : "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: state === "loading" ? "not-allowed" : "pointer",
        }}
      >
        {state === "loading" ? "Cancelling…" : "Yes, cancel appointment"}
      </button>
      <Link
        href="/"
        style={{ textAlign: "center", fontSize: 13, color: "#888", textDecoration: "none" }}
      >
        Go back
      </Link>
    </div>
  );
}
