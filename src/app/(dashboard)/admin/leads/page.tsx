"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string;
  city: string | null;
  message: string | null;
  status: "pending" | "contacted" | "converted" | "rejected";
  created_at: string;
};

const STATUS_COLORS: Record<Lead["status"], { bg: string; text: string; label: string }> = {
  pending:   { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
  contacted: { bg: "#DBEAFE", text: "#1E40AF", label: "Contacted" },
  converted: { bg: "#D1FAE5", text: "#065F46", label: "Converted" },
  rejected:  { bg: "#F3F4F6", text: "#6B7280", label: "Rejected" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminLeadsPage() {
  const supabase = createClient();
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: Lead["status"]) {
    setUpdating(id);
    await supabase.from("leads").update({ status }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    setUpdating(null);
  }

  const pending = leads.filter(l => l.status === "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "var(--line)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0 }}>
                Leads
              </h1>
              {pending > 0 && (
                <span style={{ background: "var(--color-amber)", color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "2px 8px" }}>
                  {pending} new
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4, marginBottom: 0 }}>
              Requests from bapita.com
            </p>
          </div>
          <button
            onClick={load}
            style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 64px", display: "flex", flexDirection: "column", gap: 10 }}>

          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-muted)", fontSize: 14 }}>Loading…</div>
          )}

          {!loading && leads.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--amber-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>📥</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>No leads yet</p>
              <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Requests submitted on bapita.com will appear here.</p>
            </div>
          )}

          {leads.map(lead => {
            const sc = STATUS_COLORS[lead.status];
            const busy = updating === lead.id;
            return (
              <div
                key={lead.id}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-cream-2)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {/* Row 1: name + status + time */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>{lead.name}</p>
                    {lead.business_name && (
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-muted)" }}>{lead.business_name}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "var(--color-muted)" }}>{timeAgo(lead.created_at)}</span>
                    <span style={{ background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 9px" }}>
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Row 2: contact info */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
                  <a href={`mailto:${lead.email}`} style={{ fontSize: 13, color: "var(--color-amber)", textDecoration: "none", fontWeight: 600 }}>
                    {lead.email}
                  </a>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} style={{ fontSize: 13, color: "var(--color-dark)", textDecoration: "none" }}>
                      {lead.phone}
                    </a>
                  )}
                  {lead.city && (
                    <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{lead.city}</span>
                  )}
                </div>

                {/* Row 3: message */}
                {lead.message && (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)", lineHeight: 1.5, background: "var(--color-cream)", borderRadius: 8, padding: "8px 12px" }}>
                    {lead.message}
                  </p>
                )}

                {/* Row 4: actions */}
                {lead.status !== "converted" && lead.status !== "rejected" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                    {lead.status === "pending" && (
                      <button
                        disabled={busy}
                        onClick={() => updateStatus(lead.id, "contacted")}
                        style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}
                      >
                        Mark contacted
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => updateStatus(lead.id, "converted")}
                      style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", background: "var(--color-amber)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}
                    >
                      Convert → client
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => updateStatus(lead.id, "rejected")}
                      style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
