"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useLang } from "@/i18n";
import { useToast } from "@/components/Toast";
import type { Service, DepositType } from "@/types";

type BusinessT = NonNullable<ReturnType<typeof useBusiness>["business"]>;

const card: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 16,
  boxShadow: "var(--shadow-sm)",
  border: "1px solid var(--color-cream-2)",
  overflow: "hidden",
};
const cardBody: React.CSSProperties = { padding: 20, display: "flex", flexDirection: "column", gap: 16 };
const cardHead: React.CSSProperties = { padding: "16px 20px 12px", borderBottom: "1px solid var(--color-cream-2)" };
const headText: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 };
const input: React.CSSProperties = {
  height: 42, padding: "0 12px", borderRadius: 10, border: "1.5px solid var(--color-cream-2)",
  background: "var(--color-surface)", fontSize: 14, color: "var(--color-dark)", outline: "none",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const btn = (bg: string, color: string): React.CSSProperties => ({
  height: 44, borderRadius: 12, fontSize: 14, fontWeight: 700, border: "none",
  background: bg, color, cursor: "pointer", width: "100%",
});

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button" onClick={onChange} role="switch" aria-checked={on}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none"
      style={{ background: on ? "var(--color-amber)" : "var(--color-cream-2)" }}
    >
      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200"
        style={{ insetInlineStart: on ? "22px" : "2px" }} />
    </button>
  );
}

export function PaymentsSection({
  business,
  supabase,
  refresh,
}: {
  business: BusinessT;
  supabase: ReturnType<typeof createClient>;
  refresh: () => Promise<void>;
}) {
  const { t } = useLang();
  const { showToast } = useToast();

  // ── Admin approval gate ──
  // Payments is a gated feature: an admin opens it by activating the `payments`
  // addon. Until then the whole section is locked and the owner can only request it.
  const [approved, setApproved] = useState<boolean | null>(null);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("addons")
        .select("active")
        .eq("business_id", business.id)
        .eq("addon_type", "payments")
        .maybeSingle();
      setApproved(!!data?.active);
    })();
  }, [supabase, business.id]);

  async function requestPayments() {
    setRequesting(true);
    try {
      await supabase.from("addon_requests").insert({
        business_id: business.id,
        addon_type: "payments",
        name: business.name || "",
        phone: (business.phone as string | null) || null,
        email: (business.email as string | null) || null,
        preferred_contact: "whatsapp",
        notes: "Requested online deposits (Green Invoice) from Settings.",
      });
      await fetch("/api/notify-addon-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addonType: "payments",
          addonName: "Online Payments",
          businessName: business.name || "",
          name: business.name || "",
          phone: (business.phone as string | null) || null,
          email: (business.email as string | null) || null,
          preferredContact: "whatsapp",
          notes: "Requested online deposits (Green Invoice) from Settings.",
        }),
      }).catch(() => {});
      setRequested(true);
      showToast(t("Request sent. We'll be in touch to turn on payments."), "success");
    } finally {
      setRequesting(false);
    }
  }

  // ── Connection state ──
  const [connected, setConnected] = useState(false);
  const [apiId, setApiId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [connecting, setConnecting] = useState(false);

  const loadConnection = useCallback(async () => {
    const { data } = await supabase
      .from("payment_credentials")
      .select("api_id")
      .eq("business_id", business.id)
      .eq("provider", "greeninvoice")
      .maybeSingle();
    setConnected(!!data);
    if (data?.api_id) setApiId(data.api_id as string);
  }, [supabase, business.id]);

  useEffect(() => { loadConnection(); }, [loadConnection]);

  async function connect() {
    if (!apiId.trim() || !apiSecret.trim()) { showToast(t("Enter both the API ID and Secret."), "error"); return; }
    setConnecting(true);
    try {
      const res = await fetch("/api/payments/greeninvoice/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, apiId: apiId.trim(), apiSecret: apiSecret.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(body.error || t("Could not connect. Check your keys."), "error"); return; }
      setApiSecret("");
      setConnected(true);
      showToast(t("Green Invoice connected."), "success");
      await refresh();
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm(t("Disconnect Green Invoice? Customers will no longer be able to pay deposits."))) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/payments/greeninvoice/connect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (res.ok) { setConnected(false); setApiSecret(""); showToast(t("Disconnected."), "success"); await refresh(); }
      else showToast(t("Failed to disconnect."), "error");
    } finally {
      setConnecting(false);
    }
  }

  // ── Deposit defaults (business level) ──
  const [depEnabled, setDepEnabled] = useState(!!business.deposit_enabled);
  const [depType, setDepType] = useState<DepositType>((business.deposit_default_type as DepositType) || "percent");
  const [depValue, setDepValue] = useState<number>(Number(business.deposit_default_value ?? 0));
  const [savingDefaults, setSavingDefaults] = useState(false);

  async function saveDefaults() {
    setSavingDefaults(true);
    const { error } = await supabase
      .from("businesses")
      .update({ deposit_enabled: depEnabled, deposit_default_type: depType, deposit_default_value: depValue })
      .eq("id", business.id);
    setSavingDefaults(false);
    if (error) showToast(t("Failed to save."), "error");
    else { showToast(t("Saved."), "success"); await refresh(); }
  }

  // ── Per-service overrides ──
  const [services, setServices] = useState<Service[]>([]);
  const loadServices = useCallback(async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .order("display_order", { ascending: true });
    setServices((data as Service[]) || []);
  }, [supabase, business.id]);
  useEffect(() => { loadServices(); }, [loadServices]);

  async function toggleServiceDeposit(s: Service) {
    const next = !s.deposit_required;
    setServices((arr) => arr.map((x) => (x.id === s.id ? { ...x, deposit_required: next } : x)));
    const { error } = await supabase.from("services").update({ deposit_required: next }).eq("id", s.id);
    if (error) { showToast(t("Failed to save."), "error"); loadServices(); }
  }

  async function setServiceOverride(s: Service, type: DepositType | null, value: number | null) {
    setServices((arr) => arr.map((x) => (x.id === s.id ? { ...x, deposit_type: type, deposit_value: value } : x)));
    const { error } = await supabase.from("services").update({ deposit_type: type, deposit_value: value }).eq("id", s.id);
    if (error) { showToast(t("Failed to save."), "error"); loadServices(); }
  }

  const unit = (type: DepositType) => (type === "percent" ? "%" : "₪");

  // Still checking approval — render nothing to avoid a flash of the locked/unlocked UI.
  if (approved === null) return null;

  // Locked: admin has not opened Payments for this business yet.
  if (!approved) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={card}>
          <div style={cardHead}><h3 style={headText}>{t("Online Payments")}</h3></div>
          <div style={{ ...cardBody, alignItems: "center", textAlign: "center", opacity: 0.95 }}>
            <div style={{ fontSize: 34 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)" }}>
              {t("Take deposits at booking")}
            </div>
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, lineHeight: 1.6, maxWidth: 380 }}>
              {t("Let customers pay a deposit to confirm their appointment and cut no-shows. This feature is set up by Bapita for your business — contact us to turn it on.")}
            </p>
            <button
              onClick={requestPayments}
              disabled={requesting || requested}
              style={{ ...btn("var(--color-amber)", "var(--color-surface)"), maxWidth: 320, opacity: requested ? 0.6 : 1, cursor: requested ? "default" : "pointer" }}
            >
              {requested ? t("Request sent ✓") : requesting ? t("Sending…") : t("Contact Bapita to enable")}
            </button>
          </div>
        </div>

        {/* Disabled preview so the owner sees what they'll get */}
        <div style={{ ...card, opacity: 0.5, pointerEvents: "none", filter: "grayscale(0.3)" }} aria-hidden>
          <div style={cardHead}><h3 style={headText}>{t("Deposits")}</h3></div>
          <div style={cardBody}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>{t("Require a deposit")}</div>
              <Toggle on={false} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Connect */}
      <div style={card}>
        <div style={cardHead}><h3 style={headText}>{t("Green Invoice")}</h3></div>
        <div style={cardBody}>
          {connected ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>{t("Payments connected")}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>
                {t("API ID")}: <code style={{ fontSize: 12 }}>{apiId}</code>
              </p>
              <button onClick={disconnect} disabled={connecting}
                style={btn("transparent", "#991B1B")}>
                {connecting ? "…" : t("Disconnect")}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, lineHeight: 1.5 }}>
                {t("Connect your Green Invoice account to take deposits at booking. In Green Invoice go to My Account → Developer Tools → API Keys → Add Key, then paste the ID and Secret here.")}
              </p>
              <input value={apiId} onChange={(e) => setApiId(e.target.value)} placeholder={t("API ID")} style={input} autoComplete="off" />
              <input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder={t("Secret")} style={input} type="password" autoComplete="off" />
              <button onClick={connect} disabled={connecting} style={btn("var(--color-amber)", "var(--color-surface)")}>
                {connecting ? t("Checking…") : t("Connect")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Deposit defaults */}
      <div style={card}>
        <div style={cardHead}><h3 style={headText}>{t("Deposits")}</h3></div>
        <div style={cardBody}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>{t("Require a deposit")}</div>
              <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>{t("Default for services that require one")}</div>
            </div>
            <Toggle on={depEnabled} onChange={() => setDepEnabled((v) => !v)} />
          </div>
          {depEnabled && (
            <div style={{ display: "flex", gap: 10 }}>
              <select value={depType} onChange={(e) => setDepType(e.target.value as DepositType)}
                style={{ ...input, width: 130 }}>
                <option value="percent">{t("Percent")} %</option>
                <option value="fixed">{t("Fixed")} ₪</option>
              </select>
              <input type="number" min={0} value={depValue}
                onChange={(e) => setDepValue(Number(e.target.value))}
                placeholder={t("Amount")} style={input} />
            </div>
          )}
          <button onClick={saveDefaults} disabled={savingDefaults} style={btn("var(--color-dark)", "var(--color-surface)")}>
            {savingDefaults ? t("Saving…") : t("Save")}
          </button>
        </div>
      </div>

      {/* Per-service */}
      <div style={card}>
        <div style={cardHead}><h3 style={headText}>{t("Per-service deposit")}</h3></div>
        <div style={cardBody}>
          {services.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>{t("No services yet.")}</p>
          )}
          {services.map((s) => {
            const effType = (s.deposit_type as DepositType) || depType;
            return (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--color-cream-2)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>{s.name}</div>
                  <Toggle on={!!s.deposit_required} onChange={() => toggleServiceDeposit(s)} />
                </div>
                {s.deposit_required && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <select value={s.deposit_type ?? ""} onChange={(e) => setServiceOverride(s, (e.target.value || null) as DepositType | null, s.deposit_value ?? null)}
                      style={{ ...input, width: 150, height: 38 }}>
                      <option value="">{t("Use default")}</option>
                      <option value="percent">{t("Percent")} %</option>
                      <option value="fixed">{t("Fixed")} ₪</option>
                    </select>
                    <input type="number" min={0}
                      value={s.deposit_value ?? ""}
                      onChange={(e) => setServiceOverride(s, s.deposit_type ?? null, e.target.value === "" ? null : Number(e.target.value))}
                      placeholder={`${t("Default")} (${unit(effType)})`}
                      style={{ ...input, height: 38 }} />
                  </div>
                )}
              </div>
            );
          })}
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>
            {t("Leave the amount blank to use the business default. Changes save automatically.")}
          </p>
        </div>
      </div>
    </div>
  );
}
