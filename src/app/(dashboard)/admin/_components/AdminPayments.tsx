"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Business { id: string; name: string }
interface Addon { business_id: string; active: boolean }
interface Credential { business_id: string; api_id: string }
interface Request { id: string; business_id: string; name: string; phone: string | null; email: string | null; notes: string | null; created_at: string }

export function AdminPayments() {
  const supabase = createClient();

  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: biz }, { data: ad }, { data: cr }, { data: req }] = await Promise.all([
      supabase.from("businesses").select("id, name").order("name", { ascending: true }),
      supabase.from("addons").select("business_id, active").eq("addon_type", "payments"),
      supabase.from("payment_credentials").select("business_id, api_id").eq("provider", "greeninvoice"),
      supabase.from("addon_requests").select("id, business_id, name, phone, email, notes, created_at").eq("addon_type", "payments").order("created_at", { ascending: false }),
    ]);
    setBusinesses((biz as Business[]) || []);
    setAddons((ad as Addon[]) || []);
    setCreds((cr as Credential[]) || []);
    setRequests((req as Request[]) || []);
    setLoading(false);
  }, [supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function toggle(businessId: string, next: boolean) {
    setBusyId(businessId);
    const { error } = await supabase.from("addons").upsert(
      { business_id: businessId, addon_type: "payments", active: next, activated_at: next ? new Date().toISOString() : null },
      { onConflict: "business_id,addon_type" }
    );
    if (!error) setAddons((arr) => {
      const rest = arr.filter((a) => a.business_id !== businessId);
      return [...rest, { business_id: businessId, active: next }];
    });
    setBusyId(null);
  }

  const approvedFor = (id: string) => addons.find((a) => a.business_id === id)?.active ?? false;
  const connectedFor = (id: string) => !!creds.find((c) => c.business_id === id);
  const pendingRequests = requests.filter((r) => !approvedFor(r.business_id));

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 64px" }}>
      <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 16 }}>
        Payments is admin-gated: a business only sees Settings → Payments once you open it here. They then
        connect their own Green Invoice account (API ID + Secret) and set deposit rules.
      </p>

      {pendingRequests.length > 0 && (
        <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>
            {pendingRequests.length} pending request{pendingRequests.length > 1 ? "s" : ""}
          </div>
          {pendingRequests.map((r) => {
            const biz = businesses?.find((b) => b.id === r.business_id);
            return (
              <div key={r.id} style={{ fontSize: 12, color: "#92400E", padding: "4px 0" }}>
                <strong>{biz?.name ?? r.name}</strong>
                {r.phone ? ` · ${r.phone}` : ""}{r.email ? ` · ${r.email}` : ""}
                {" · "}{new Date(r.created_at).toLocaleDateString()}
              </div>
            );
          })}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-muted)", fontSize: 14 }}>Loading…</div>}

      {!loading && (businesses ?? []).map((biz) => {
        const approved = approvedFor(biz.id);
        const connected = connectedFor(biz.id);
        return (
          <div key={biz.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 12, padding: 16, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{biz.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", display: "inline-block", background: connected ? "#22C55E" : "var(--color-cream-2)" }} />
                <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
                  {connected ? "Owner connected Green Invoice" : "Owner not connected yet"}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={busyId === biz.id}
              onClick={() => toggle(biz.id, !approved)}
              style={{ height: 34, padding: "0 16px", borderRadius: 9999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", flexShrink: 0,
                background: approved ? "#22C55E" : "var(--color-cream-2)", color: approved ? "#fff" : "var(--color-muted)" }}
            >
              {busyId === biz.id ? "…" : approved ? "Opened" : "Open payments"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
