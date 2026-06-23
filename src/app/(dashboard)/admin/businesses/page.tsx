"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
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
  const router      = useRouter();
  const supabase    = createClient();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>("businesses");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Businesses state ──────────────────────────────────────────────────────
  const [businesses,    setBusinesses]    = useState<Business[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [bizLoading,    setBizLoading]    = useState(true);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [draggingIdx,   setDraggingIdx]   = useState<number | null>(null);
  const dragIdx     = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  function onBizDragStart(index: number) {
    dragIdx.current = index;
    setDraggingIdx(index);
  }
  function onBizDragEnter(index: number) { dragOverIdx.current = index; }
  async function onBizDragEnd() {
    const from = dragIdx.current;
    const to   = dragOverIdx.current;
    dragIdx.current = null; dragOverIdx.current = null; setDraggingIdx(null);
    if (from === null || to === null || from === to) return;
    let next: Business[] = [];
    setBusinesses(prev => {
      next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    // Persist order to Supabase so it syncs across devices
    await supabase.from("businesses").upsert(
      next.map((b, i) => ({ id: b.id, display_order: i })),
      { onConflict: "id" }
    );
  }

  const loadBusinesses = useCallback(async () => {
    setBizLoading(true);
    const { data } = await supabase
      .from("businesses")
      .select("id, name, slug, template_style, tagline, phone, address, status, hero_image_url, gallery_images, whatsapp_number, about_text, display_order")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    const biz = (data as unknown as Business[]) || [];
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
    try {
      const res = await fetch(`/api/admin/delete-business/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      showToast("Business deleted", "success");
      setDeleteId(null);
      loadBusinesses();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  }

  // ── Leads state ───────────────────────────────────────────────────────────
  const [leads,          setLeads]          = useState<Lead[]>([]);
  const [leadsLoading,   setLeadsLoading]   = useState(false);
  const [leadsLoaded,    setLeadsLoaded]    = useState(false);
  const [updatingLead,   setUpdatingLead]   = useState<string | null>(null);
  const [filterStatus,        setFilterStatus]        = useState<Lead["status"] | "all">("all");
  const [justConverted,       setJustConverted]       = useState(false);
  const [editingLeadId,       setEditingLeadId]       = useState<string | null>(null);
  const [editDraft,           setEditDraft]           = useState<Partial<Lead>>({});
  const [savingLead,          setSavingLead]          = useState(false);
  const [confirmDeleteLeadId, setConfirmDeleteLeadId] = useState<string | null>(null);
  const [deletingLeadId,      setDeletingLeadId]      = useState<string | null>(null);

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
    if (status === "converted") setJustConverted(true);
    setUpdatingLead(null);
  }

  async function handleLeadSave(id: string) {
    setSavingLead(true);
    await supabase.from("leads").update(editDraft).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...editDraft } : l));
    setEditingLeadId(null);
    setEditDraft({});
    setSavingLead(false);
  }

  async function handleLeadDelete(id: string) {
    setDeletingLeadId(id);
    await supabase.from("leads").delete().eq("id", id);
    setLeads(prev => prev.filter(l => l.id !== id));
    setDeletingLeadId(null);
    setConfirmDeleteLeadId(null);
  }

  function downloadLeadsCSV() {
    const rows = leads.map(l => ({
      Name: l.name, Business: l.business_name ?? "", Phone: l.phone ?? "",
      Email: l.email, City: l.city ?? "", Status: l.status,
      Message: l.message ?? "", Date: new Date(l.created_at).toLocaleDateString(),
    }));
    csvDownload(rows, "bapita-leads.csv");
  }

  function downloadBusinessesCSV() {
    const rows = businesses.map(b => ({
      Name: b.name, Slug: b.slug ?? "", Template: b.template_style ?? "",
      Status: (b as any).status ?? "", Phone: b.phone ?? "", Address: b.address ?? "",
    }));
    csvDownload(rows, "bapita-businesses.csv");
  }

  // ── Load on mount / tab switch ────────────────────────────────────────────
  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);
  useEffect(() => { if (tab === "leads" && !leadsLoaded) loadLeads(); }, [tab, leadsLoaded, loadLeads]);

  const pendingCount    = leads.filter(l => l.status === "pending").length;
  const filteredLeads   = filterStatus === "all" ? leads : leads.filter(l => l.status === filterStatus);
  const statusCounts    = leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  const q = searchQuery.trim().toLowerCase();
  const filteredBusinesses = q
    ? businesses.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.slug ?? "").toLowerCase().includes(q) ||
        ((b as any).status ?? "draft").toLowerCase().includes(q) ||
        (b.template_style ?? "").toLowerCase().includes(q)
      )
    : businesses;

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
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexShrink: 0 }}>
              {/* CSV — icon only on mobile */}
              <button
                onClick={downloadBusinessesCSV}
                disabled={businesses.length === 0}
                title="Download CSV"
                style={{ height: 34, padding: "0 10px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-muted)", fontSize: 13, fontWeight: 600, cursor: businesses.length === 0 ? "default" : "pointer", opacity: businesses.length === 0 ? 0.4 : 1, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span className="hidden sm:inline">CSV</span>
              </button>
              {/* Auto-create — icon only on mobile */}
              <button
                onClick={() => router.push("/admin/businesses/auto")}
                title="Auto-create"
                style={{ height: 34, padding: "0 10px", borderRadius: 9, border: "1.5px solid var(--color-amber)", background: "rgba(232,146,10,0.08)", color: "var(--color-amber)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background 0.15s", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,146,10,0.16)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(232,146,10,0.08)"; }}
              >
                <span>✨</span>
                <span className="hidden sm:inline">Auto-create</span>
              </button>
              {/* Add Business — always full label */}
              <button
                onClick={() => router.push("/admin/businesses/new")}
                style={{ height: 34, padding: "0 12px", borderRadius: 9, border: "none", background: "var(--color-amber)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(232,146,10,0.28)", transition: "transform 0.15s, box-shadow 0.15s", fontFamily: "inherit", whiteSpace: "nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(232,146,10,0.36)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(232,146,10,0.28)"; }}
              >
                + Add
              </button>
            </div>
          )}
          {tab === "leads" && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={downloadLeadsCSV}
                disabled={leads.length === 0}
                style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-muted)", fontSize: 13, fontWeight: 600, cursor: leads.length === 0 ? "default" : "pointer", opacity: leads.length === 0 ? 0.4 : 1, fontFamily: "inherit" }}
              >
                ↓ CSV
              </button>
              <button onClick={loadLeads} style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Search — businesses tab only */}
        {tab === "businesses" && (
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 24px 0", position: "relative" }}>
            <span style={{ position: "absolute", left: 36, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--color-muted)", pointerEvents: "none", paddingTop: 12 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, URL, status, template…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", height: 38, padding: "0 36px 0 34px", borderRadius: 10, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 13, color: "var(--color-dark)", fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 36, top: "50%", transform: "translateY(-50%)", paddingTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-muted)", lineHeight: 1 }}
              >✕</button>
            )}
          </div>
        )}

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
              {q && !bizLoading && businesses.length > 0 && (
                <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 4px" }}>
                  {filteredBusinesses.length} of {businesses.length} businesses
                </p>
              )}
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
              {!bizLoading && businesses.length > 0 && filteredBusinesses.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <p style={{ fontSize: 14, color: "var(--color-muted)" }}>No businesses match "{searchQuery}"</p>
                  <button onClick={() => setSearchQuery("")} style={{ marginTop: 8, height: 30, padding: "0 14px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Clear search</button>
                </div>
              )}
              {filteredBusinesses.map((b, idx) => (
                <BusinessRow
                  key={b.id} business={b} serviceCount={serviceCounts[b.id] || 0}
                  deleting={deleting === b.id} confirmDelete={deleteId === b.id}
                  onEdit={() => router.push(`/admin/businesses/${b.id}`)}
                  onDeleteRequest={() => setDeleteId(b.id)}
                  onDeleteConfirm={() => handleDelete(b.id)}
                  onDeleteCancel={() => setDeleteId(null)}
                  canDrag={!q}
                  isDragging={draggingIdx === idx}
                  onDragStart={() => onBizDragStart(idx)}
                  onDragEnter={() => onBizDragEnter(idx)}
                  onDragEnd={onBizDragEnd}
                />
              ))}
            </>
          )}

          {/* ── LEADS TAB ── */}
          {tab === "leads" && (
            <>
              {/* Filter bar */}
              {!leadsLoading && leads.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  {(["all", "pending", "contacted", "converted", "rejected"] as const).map(s => {
                    const count = s === "all" ? leads.length : (statusCounts[s] || 0);
                    const active = filterStatus === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        style={{
                          height: 28, padding: "0 12px", borderRadius: 20,
                          border: active ? "none" : "1.5px solid var(--color-cream-2)",
                          background: active ? "var(--color-amber)" : "var(--color-surface)",
                          color: active ? "#fff" : "var(--color-muted)",
                          fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                        {count > 0 && <span style={{ background: active ? "rgba(255,255,255,0.3)" : "var(--color-cream-2)", borderRadius: 99, padding: "0 5px", fontSize: 10 }}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Converted banner */}
              {justConverted && (
                <div style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#065F46" }}>
                    Lead converted! Remember to create the business record.
                  </span>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => router.push("/admin/businesses/new")}
                      style={{ height: 28, padding: "0 12px", borderRadius: 7, border: "none", background: "#065F46", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      + Create business →
                    </button>
                    <button
                      onClick={() => setJustConverted(false)}
                      style={{ height: 28, padding: "0 10px", borderRadius: 7, border: "1px solid #A7F3D0", background: "transparent", color: "#065F46", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {leadsLoading && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-muted)", fontSize: 14 }}>Loading…</div>}
              {!leadsLoading && leads.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>No leads yet</p>
                  <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Requests submitted on bapita.com will appear here.</p>
                </div>
              )}
              {!leadsLoading && leads.length > 0 && filteredLeads.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-muted)", fontSize: 13 }}>
                  No {filterStatus} leads.
                </div>
              )}
              {filteredLeads.map(lead => {
                const sc        = LEAD_STATUS[lead.status];
                const busy      = updatingLead === lead.id;
                const isEditing = editingLeadId === lead.id;
                const isDeleting = deletingLeadId === lead.id;
                const confirmDelete = confirmDeleteLeadId === lead.id;
                const inp: React.CSSProperties = { height: 32, padding: "0 10px", borderRadius: 7, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 13, color: "var(--color-dark)", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
                return (
                  <div key={lead.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Row 1: name + controls */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>{lead.name}</p>
                        {lead.business_name && <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-muted)" }}>{lead.business_name}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: "var(--color-muted)" }}>{timeAgo(lead.created_at)}</span>
                        <span style={{ background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 9px" }}>{sc.label}</span>
                        {!isEditing && (
                          <button
                            onClick={() => { setEditingLeadId(lead.id); setEditDraft({ name: lead.name, business_name: lead.business_name, phone: lead.phone, email: lead.email, city: lead.city, message: lead.message }); }}
                            style={{ height: 28, padding: "0 10px", borderRadius: 7, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", color: "var(--color-dark)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                          >Edit</button>
                        )}
                        {!isEditing && (confirmDelete ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--color-muted)" }}>Delete?</span>
                            <button onClick={() => handleLeadDelete(lead.id)} disabled={isDeleting} style={{ height: 26, padding: "0 9px", borderRadius: 6, border: "none", background: "#EF4444", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{isDeleting ? "…" : "Yes"}</button>
                            <button onClick={() => setConfirmDeleteLeadId(null)} style={{ height: 26, padding: "0 9px", borderRadius: 6, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteLeadId(lead.id)} style={{ height: 28, padding: "0 10px", borderRadius: 7, border: "1.5px solid transparent", background: "transparent", color: "#EF4444", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                        ))}
                      </div>
                    </div>

                    {/* Edit form */}
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 3 }}>Name</label><input style={inp} value={editDraft.name ?? ""} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} /></div>
                          <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 3 }}>Business name</label><input style={inp} value={editDraft.business_name ?? ""} onChange={e => setEditDraft(d => ({ ...d, business_name: e.target.value || null }))} /></div>
                          <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 3 }}>Phone</label><input style={inp} value={editDraft.phone ?? ""} onChange={e => setEditDraft(d => ({ ...d, phone: e.target.value || null }))} /></div>
                          <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 3 }}>Email</label><input style={inp} value={editDraft.email ?? ""} onChange={e => setEditDraft(d => ({ ...d, email: e.target.value }))} /></div>
                          <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 3 }}>City</label><input style={inp} value={editDraft.city ?? ""} onChange={e => setEditDraft(d => ({ ...d, city: e.target.value || null }))} /></div>
                        </div>
                        <div><label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 3 }}>Message</label><textarea style={{ ...inp, height: 64, padding: "8px 10px", resize: "vertical" }} value={editDraft.message ?? ""} onChange={e => setEditDraft(d => ({ ...d, message: e.target.value || null }))} /></div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleLeadSave(lead.id)} disabled={savingLead} style={{ height: 30, padding: "0 14px", borderRadius: 8, border: "none", background: "var(--color-amber)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: savingLead ? "not-allowed" : "pointer", opacity: savingLead ? 0.6 : 1, fontFamily: "inherit" }}>{savingLead ? "Saving…" : "Save"}</button>
                          <button onClick={() => { setEditingLeadId(null); setEditDraft({}); }} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
                          <a href={`mailto:${lead.email}`} style={{ fontSize: 13, color: "var(--color-amber)", textDecoration: "none", fontWeight: 600 }}>{lead.email}</a>
                          {lead.phone && <a href={`tel:${lead.phone}`} style={{ fontSize: 13, color: "var(--color-dark)", textDecoration: "none" }}>{lead.phone}</a>}
                          {lead.city && <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{lead.city}</span>}
                        </div>
                        {lead.message && (
                          <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)", lineHeight: 1.5, background: "var(--color-cream)", borderRadius: 8, padding: "8px 12px" }}>{lead.message}</p>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2, alignItems: "center" }}>
                          {lead.status === "pending" && (
                            <button disabled={busy} onClick={() => updateLeadStatus(lead.id, "contacted")} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>Mark contacted</button>
                          )}
                          {lead.status !== "converted" && (
                            <button disabled={busy} onClick={() => updateLeadStatus(lead.id, "converted")} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", background: "var(--color-amber)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>Convert → client</button>
                          )}
                          {lead.status !== "rejected" && (
                            <button disabled={busy} onClick={() => updateLeadStatus(lead.id, "rejected")} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>Reject</button>
                          )}
                          {lead.status !== "pending" && (
                            <button disabled={busy} onClick={() => updateLeadStatus(lead.id, "pending")} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-muted)", fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>↺ Reset</button>
                          )}
                        </div>
                      </>
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

function csvDownload(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function BusinessRow({ business: b, serviceCount, deleting, confirmDelete, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel, canDrag, isDragging, onDragStart, onDragEnter, onDragEnd }: {
  business: Business; serviceCount: number; deleting: boolean; confirmDelete: boolean;
  onEdit: () => void; onDeleteRequest: () => void; onDeleteConfirm: () => void; onDeleteCancel: () => void;
  canDrag?: boolean; isDragging?: boolean;
  onDragStart?: () => void; onDragEnter?: () => void; onDragEnd?: () => void;
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
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnter={canDrag ? onDragEnter : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: "var(--color-surface)", borderRadius: 13, boxShadow: hovered ? "0 4px 16px rgba(30,26,20,0.09)" : "0 1px 3px rgba(30,26,20,0.06)", border: `1.5px solid ${hovered ? "var(--color-cream-2)" : "transparent"}`, padding: "14px 18px", transform: hovered ? "translateY(-1px)" : "translateY(0)", transition: "all 0.15s ease", opacity: isDragging ? 0.4 : 1, cursor: canDrag ? "grab" : "default" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {canDrag && (
          <div style={{ color: "var(--color-cream-2)", flexShrink: 0, display: "flex", alignItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </div>
        )}
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
