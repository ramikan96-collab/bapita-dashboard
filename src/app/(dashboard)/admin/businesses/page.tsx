"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types";

const TEMPLATE_LABELS: Record<string, string> = {
  classic: "Classic",
  clean:   "Clean",
  dark:    "Dark",
};

const TEMPLATE_COLORS: Record<string, string> = {
  classic: "#B8862A",
  clean:   "#0A0A0A",
  dark:    "#C9A84C",
};

export default function AdminBusinessesPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [businesses,    setBusinesses]    = useState<Business[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [loading,       setLoading]       = useState(true);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("businesses")
      .select("id, name, slug, template_style, tagline, phone, address, status, hero_image_url, gallery_images, whatsapp_number, about_text")
      .order("created_at", { ascending: false });

    const biz = (data as Business[]) || [];
    setBusinesses(biz);

    // Load service counts
    if (biz.length > 0) {
      const ids = biz.map(b => b.id);
      const { data: svcs } = await supabase
        .from("services")
        .select("business_id")
        .in("business_id", ids)
        .eq("active", true);
      const counts: Record<string, number> = {};
      svcs?.forEach((s: { business_id: string }) => {
        counts[s.business_id] = (counts[s.business_id] || 0) + 1;
      });
      setServiceCounts(counts);
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from("services").delete().eq("business_id", id);
    await supabase.from("businesses").delete().eq("id", id);
    setDeleting(null);
    setDeleteId(null);
    load();
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"var(--color-cream)" }}>
      {/* Header */}
      <div style={{ flexShrink:0, background:"var(--color-surface)", borderBottom:"var(--line)" }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"26px 24px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:700, color:"var(--color-dark)", letterSpacing:"-0.02em", lineHeight:1.1, margin:0 }}>
              Businesses
            </h1>
            <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:4, marginBottom:0 }}>
              Each barber you manage.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/businesses/new")}
            style={{
              height:34, padding:"0 14px", borderRadius:9, border:"none",
              background:"var(--color-amber)", color:"#fff",
              fontSize:13, fontWeight:700, cursor:"pointer",
              boxShadow:"0 4px 14px rgba(232,146,10,0.28)",
              transition:"transform 0.15s, box-shadow 0.15s", fontFamily:"inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 18px rgba(232,146,10,0.36)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 4px 14px rgba(232,146,10,0.28)"; }}
          >
            + Add Business
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"20px 24px 64px", display:"flex", flexDirection:"column", gap:10 }}>

          {loading && (
            <div style={{ textAlign:"center", padding:"60px 0", color:"var(--color-muted)", fontSize:14 }}>Loading…</div>
          )}

          {!loading && businesses.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:60, height:60, borderRadius:16, background:"var(--amber-soft)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>✂️</div>
              <p style={{ fontSize:15, fontWeight:700, color:"var(--color-dark)", marginBottom:6 }}>No businesses yet</p>
              <p style={{ fontSize:13, color:"var(--color-muted)", marginBottom:20 }}>Add your first barber to get started.</p>
              <button
                onClick={() => router.push("/admin/businesses/new")}
                style={{ height:36, padding:"0 18px", borderRadius:9, border:"none", background:"var(--color-amber)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
              >
                Add First Business
              </button>
            </div>
          )}

          {businesses.map(b => (
            <BusinessRow
              key={b.id}
              business={b}
              serviceCount={serviceCounts[b.id] || 0}
              deleting={deleting === b.id}
              confirmDelete={deleteId === b.id}
              onEdit={() => router.push(`/admin/businesses/${b.id}`)}
              onDeleteRequest={() => setDeleteId(b.id)}
              onDeleteConfirm={() => handleDelete(b.id)}
              onDeleteCancel={() => setDeleteId(null)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BusinessRow({ business: b, serviceCount, deleting, confirmDelete, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel }: {
  business:        Business;
  serviceCount:    number;
  deleting:        boolean;
  confirmDelete:   boolean;
  onEdit:          () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel:  () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const template = b.template_style || "classic";
  const color    = TEMPLATE_COLORS[template] || "#B8862A";
  const status   = (b as any).status || "draft";

  const hasHero      = !!((b as any).hero_image_url);
  const hasGallery   = ((b as any).gallery_images?.length || 0) > 0;
  const hasWhatsApp  = !!((b as any).whatsapp_number);
  const hasAbout     = !!((b as any).about_text);
  const hasServices  = serviceCount > 0;

  const checks = [
    { label: `${serviceCount} service${serviceCount !== 1 ? "s" : ""}`, ok: hasServices },
    { label: "Hero",     ok: hasHero     },
    { label: "Gallery",  ok: hasGallery  },
    { label: "WhatsApp", ok: hasWhatsApp },
    { label: "About",    ok: hasAbout    },
  ];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:"var(--color-surface)", borderRadius:13,
        boxShadow: hovered ? "0 4px 16px rgba(30,26,20,0.09)" : "0 1px 3px rgba(30,26,20,0.06)",
        border: `1.5px solid ${hovered ? "var(--color-cream-2)" : "transparent"}`,
        padding:"14px 18px",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition:"all 0.15s ease",
      }}
    >
      {/* Main row */}
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        {/* Avatar */}
        <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:"var(--amber-soft)", color:"var(--color-amber)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800 }}>
          {b.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
            <span style={{ fontSize:15, fontWeight:700, color:"var(--color-dark)" }}>{b.name}</span>

            {/* Template badge */}
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background: color + "20", color, textTransform:"uppercase", letterSpacing:"0.05em" }}>
              {TEMPLATE_LABELS[template] || template}
            </span>

            {/* Status */}
            <span style={{
              fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, letterSpacing:"0.04em",
              background: status === "live" ? "#D1FAE5" : "var(--color-cream-2)",
              color:      status === "live" ? "#065F46" : "var(--color-muted)",
            }}>
              {status === "live" ? "● LIVE" : "○ DRAFT"}
            </span>
          </div>

          {b.slug && (
            <a href={`https://book.bapita.com/${b.slug}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ fontSize:12, color:"var(--color-amber)", textDecoration:"none", fontWeight:600 }}>
              book.bapita.com/{b.slug} ↗
            </a>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:8, flexShrink:0, alignItems:"center" }}>
          <button
            onClick={onEdit}
            style={{ height:32, padding:"0 14px", borderRadius:8, cursor:"pointer", background:"var(--color-cream)", border:"1.5px solid var(--color-cream-2)", fontSize:13, fontWeight:600, color:"var(--color-dark)", fontFamily:"inherit", transition:"border-color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--color-amber)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--color-cream-2)"; }}
          >
            Edit
          </button>

          {confirmDelete ? (
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              <span style={{ fontSize:11, color:"var(--color-muted)" }}>Delete?</span>
              <button onClick={onDeleteConfirm} disabled={deleting}
                style={{ height:28, padding:"0 10px", borderRadius:7, border:"none", background:"#EF4444", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {deleting ? "…" : "Yes"}
              </button>
              <button onClick={onDeleteCancel}
                style={{ height:28, padding:"0 10px", borderRadius:7, border:"1.5px solid var(--color-cream-2)", background:"transparent", color:"var(--color-muted)", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                No
              </button>
            </div>
          ) : (
            <button onClick={onDeleteRequest}
              style={{ height:32, padding:"0 12px", borderRadius:8, cursor:"pointer", background:"transparent", border:"1.5px solid transparent", fontSize:13, fontWeight:600, color:"#EF4444", fontFamily:"inherit", transition:"border-color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#EF4444"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="transparent"; }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Health indicators */}
      <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
        {checks.map(c => (
          <span key={c.label} style={{
            fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
            background: c.ok ? "#D1FAE520" : "var(--color-cream-2)",
            color:      c.ok ? "#065F46"   : "var(--color-muted)",
            border:     `1px solid ${c.ok ? "#D1FAE5" : "transparent"}`,
          }}>
            {c.ok ? "✓" : "✗"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
