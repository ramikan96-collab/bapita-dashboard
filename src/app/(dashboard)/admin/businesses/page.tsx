"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types";

const TEMPLATE_LABELS: Record<string, string> = { classic: "Classic", clean: "Clean", dark: "Dark" };
const TEMPLATE_COLORS: Record<string, string> = { classic: "#B8862A", clean: "#0A0A0A", dark: "#C9A84C" };

type Tab = "businesses" | "leads";

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

const LEAD_STATUS: Record<Lead["status"], { bg: string; text: string; label: string }> = {
  pending:   { bg: "#FEF3C7", text: "#92400E", label: "Pending"   },
  contacted: { bg: "#DBEAFE", text: "#1E40AF", label: "Contacted" },
  converted: { bg: "#D1FAE5", text: "#065F46", label: "Converted" },
  rejected:  { bg: "#F3F4F6", text: "#6B7280", label: "Rejected"  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("businesses");

  // ── Businesses state ──────────────────────────────────────────────────────
  const [businesses,    setBusinesses]    = useState<Business[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [bizLoading,    setBizLoading]    = useState(true);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    setBizLoading(true);
    const { data } = await supabase
      .from("businesses")
      .select("id, name, slug, template_style, tagline, phone, address, status, hero_image_url, gallery_images, whatsapp_number, about_text")
      .order("created_at", { ascending: false });
    const biz = (data as Business[]) || [];
    setBusinesses(biz);
    if (biz.length > 0) {
      const { data: svcs } = await supabase.from("services").select("business_id").in("business_id", biz.map(b => b.id)).eq("active", true);
      const counts: Record<string, number> = {};
      svcs?.forEach((s: { business_id: string }) => { counts[s.business_id] = (counts[s.business_id] || 0) + 1; });
      setServiceCounts(counts);
    }
    setBizLoading(false);
  }, [supabase]);

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from("bookings").delete().eq("business_id", id);
    await supabase.from("customers").delete().eq("business_id", id);
    await supabase.from("services").delete().eq("business_id", id);
    await supabase.from("businesses").delete().eq("id", id);
    setDeleting(null);
    setDeleteId(null);
    loadBusinesses();
  }

  // ── Leads state ───────────────────────────────────────────────────────────
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsLoaded,  setLeadsLoaded]  = useState(false);
  const [updatingLead, setUpdatingLead] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads((data as Lead[]) || []);
    setLeadsLoading(false);
    setLeadsLoaded(true);
  }, [supabase]);

  async function updateLeadStatus(id: string, status: Lead["status"]) {
    setUpdatingLead(id);
    await supabase.from("leads").update({ status }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    setUpdatingLead(null);
  }

  // ── Load on mount / tab switch ────────────────────────────────────────────
  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);
  useEffect(() => { if (tab === "leads" && !leadsLoaded) loadLeads(); }, [tab, leadsLoaded, loadLeads]);

  const pendingCount = leads.filter(l => l.status === "pending").length;

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "businesses", label: "Businesses" },
    { key: "leads",      label: "Leads", badge: pendingCount > 0 ? pendingCount : undefined },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0 }}>
              Admin
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4, marginBottom: 0 }}>
              {tab === "businesses" ? "Each barber you manage." : "Requests from bapita.com"}
            </p>
          </div>
          {tab === "businesses" && (
            <button
              onClick={() => router.push("/admin/businesses/new")}
              style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "none", background: "var(--color-amber)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(232,146,10,0.28)", transition: "transform 0.15s, box-shadow 0.15s", fontFamily: "inherit", marginTop: 4 }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(232,146,10,0.36)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(232,146,10,0.28)"; }}
            >
              + Add Business
            </button>
          )}
          {tab === "leads" && (
            <button onClick={loadLeads} style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
              Refresh
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0, marginTop: 16 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                height: 40, padding: "0 16px", background: "none", border: "none",
                borderBottom: `2px solid ${tab === t.key ? "var(--color-amber)" : "transparent"}`,
                color: tab === t.key ? "var(--color-amber)" : "var(--color-muted)",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {t.label}
              {t.badge !== undefined && (
                <span style={{ background: "var(--color-amber)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "1px 6px" }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 64px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* ── BUSINESSES TAB ── */}
          {tab === "businesses" && (
            <>
              {bizLoading && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-muted)", fontSize: 14 }}>Loading…</div>}
              {!bizLoading && businesses.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>No businesses yet</p>
                  <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 20 }}>Add your first barber to get started.</p>
                  <button onClick={() => router.push("/admin/businesses/new")} style={{ height: 36, padding: "0 18px", borderRadius: 9, border: "none", background: "var(--color-amber)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Add First Business
                  </button>
                </div>
              )}
              {businesses.map(b => (
                <BusinessRow
                  key={b.id} business={b} serviceCount={serviceCounts[b.id] || 0}
                  deleting={deleting === b.id} confirmDelete={deleteId === b.id}
                  onEdit={() => router.push(`/admin/businesses/${b.id}`)}
                  onDeleteRequest={() => setDeleteId(b.id)}
                  onDeleteConfirm={() => handleDelete(b.id)}
                  onDeleteCancel={() => setDeleteId(null)}
                />
              ))}
            </>
          )}

          {/* ── LEADS TAB ── */}
          {tab === "leads" && (
            <>
              {leadsLoading && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-muted)", fontSize: 14 }}>Loading…</div>}
              {!leadsLoading && leads.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>No leads yet</p>
                  <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Requests submitted on bapita.com will appear here.</p>
                </div>
              )}
              {leads.map(lead => {
                const sc   = LEAD_STATUS[lead.status];
                const busy = updatingLead === lead.id;
                return (
                  <div key={lead.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>{lead.name}</p>
                        {lead.business_name && <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-muted)" }}>{lead.business_name}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: "var(--color-muted)" }}>{timeAgo(lead.created_at)}</span>
                        <span style={{ background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 9px" }}>{sc.label}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
                      <a href={`mailto:${lead.email}`} style={{ fontSize: 13, color: "var(--color-amber)", textDecoration: "none", fontWeight: 600 }}>{lead.email}</a>
                      {lead.phone && <a href={`tel:${lead.phone}`} style={{ fontSize: 13, color: "var(--color-dark)", textDecoration: "none" }}>{lead.phone}</a>}
                      {lead.city && <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{lead.city}</span>}
                    </div>
                    {lead.message && (
                      <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)", lineHeight: 1.5, background: "var(--color-cream)", borderRadius: 8, padding: "8px 12px" }}>{lead.message}</p>
                    )}
                    {lead.status !== "converted" && lead.status !== "rejected" && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                        {lead.status === "pending" && (
                          <button disabled={busy} onClick={() => updateLeadStatus(lead.id, "contacted")} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>
                            Mark contacted
                          </button>
                        )}
                        <button disabled={busy} onClick={() => updateLeadStatus(lead.id, "converted")} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", background: "var(--color-amber)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>
                          Convert → client
                        </button>
                        <button disabled={busy} onClick={() => updateLeadStatus(lead.id, "rejected")} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function BusinessRow({ business: b, serviceCount, deleting, confirmDelete, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel }: {
  business: Business; serviceCount: number; deleting: boolean; confirmDelete: boolean;
  onEdit: () => void; onDeleteRequest: () => void; onDeleteConfirm: () => void; onDeleteCancel: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const template = b.template_style || "classic";
  const color    = TEMPLATE_COLORS[template] || "#B8862A";
  const status   = (b as any).status || "draft";
  const hasHero     = !!((b as any).hero_image_url);
  const hasGallery  = ((b as any).gallery_images?.length || 0) > 0;
  const hasWhatsApp = !!((b as any).whatsapp_number);
  const hasAbout    = !!((b as any).about_text);
  const checks = [
    { label: `${serviceCount} service${serviceCount !== 1 ? "s" : ""}`, ok: serviceCount > 0 },
    { label: "Hero",     ok: hasHero     },
    { label: "Gallery",  ok: hasGallery  },
    { label: "WhatsApp", ok: hasWhatsApp },
    { label: "About",    ok: hasAbout    },
  ];

  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: "var(--color-surface)", borderRadius: 13, boxShadow: hovered ? "0 4px 16px rgba(30,26,20,0.09)" : "0 1px 3px rgba(30,26,20,0.06)", border: `1.5px solid ${hovered ? "var(--color-cream-2)" : "transparent"}`, padding: "14px 18px", transform: hovered ? "translateY(-1px)" : "translateY(0)", transition: "all 0.15s ease" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: "var(--amber-soft)", color: "var(--color-amber)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>
          {b.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>{b.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: color + "20", color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{TEMPLATE_LABELS[template] || template}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.04em", background: status === "live" ? "#D1FAE5" : "var(--color-cream-2)", color: status === "live" ? "#065F46" : "var(--color-muted)" }}>
              {status === "live" ? "● LIVE" : "○ DRAFT"}
            </span>
          </div>
          {b.slug && (
            <a href={`https://book.bapita.com/${b.slug}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: "var(--color-amber)", textDecoration: "none", fontWeight: 600 }}>
              book.bapita.com/{b.slug} ↗
            </a>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <button onClick={onEdit} style={{ height: 32, padding: "0 14px", borderRadius: 8, cursor: "pointer", background: "var(--color-cream)", border: "1.5px solid var(--color-cream-2)", fontSize: 13, fontWeight: 600, color: "var(--color-dark)", fontFamily: "inherit", transition: "border-color 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-amber)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; }}>Edit</button>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--color-muted)" }}>Delete?</span>
              <button onClick={onDeleteConfirm} disabled={deleting} style={{ height: 28, padding: "0 10px", borderRadius: 7, border: "none", background: "#EF4444", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{deleting ? "…" : "Yes"}</button>
              <button onClick={onDeleteCancel} style={{ height: 28, padding: "0 10px", borderRadius: 7, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>No</button>
            </div>
          ) : (
            <button onClick={onDeleteRequest} style={{ height: 32, padding: "0 12px", borderRadius: 8, cursor: "pointer", background: "transparent", border: "1.5px solid transparent", fontSize: 13, fontWeight: 600, color: "#EF4444", fontFamily: "inherit", transition: "border-color 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF4444"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; }}>Delete</button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {checks.map(c => (
          <span key={c.label} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.ok ? "#D1FAE520" : "var(--color-cream-2)", color: c.ok ? "#065F46" : "var(--color-muted)", border: `1px solid ${c.ok ? "#D1FAE5" : "transparent"}` }}>
            {c.ok ? "✓" : "✗"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
