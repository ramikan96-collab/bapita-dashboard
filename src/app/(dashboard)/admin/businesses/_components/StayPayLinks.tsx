"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PayLinkPanel from "@/components/calendar/PayLinkPanel";
import { isIsoDate, nightsBetween, stayTotal, todayIso } from "@/lib/stay";
import { payLinkUrl, LINK_DEFAULT_HOURS } from "@/lib/payment-links-shared";

// Admin → Businesses → <stay business> → Payment links
// (spec: docs/specs/2026-11-10-stay-pay-link.md)
//
// 1. Connect the business's own Green Invoice account (keys typed by the host).
// 2. New link with no guest request: apartment, dates, guest, price → link.
// 3. Open requests and host-made bookings: price them and send a link.

interface Unit {
  id: string;
  name: string;
  price: number;
  weekend_price: number | null;
}

interface Row {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  appointment_date: string;
  check_out: string;
  guests: number | null;
  status: string;
  payment_status: string;
  service_id: string | null;
  notes: string | null;
}

interface LinkRow {
  booking_id: string;
  token: string;
  amount: number;
  status: string;
  expires_at: string;
  paid_at: string | null;
}

const input: React.CSSProperties = {
  height: 40, width: "100%", padding: "0 12px", borderRadius: 10, boxSizing: "border-box",
  border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)",
  fontSize: 16, color: "var(--color-dark)", fontFamily: "inherit",
};
const label: React.CSSProperties = { fontSize: 12, color: "var(--color-muted)", display: "block", marginBottom: 4 };
const sub: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--color-dark)", margin: "18px 0 10px" };
const btn = (primary: boolean, busy = false): React.CSSProperties => ({
  height: 38, padding: "0 16px", borderRadius: 9999, border: "none", cursor: "pointer",
  fontSize: 13, fontWeight: 700, fontFamily: "inherit", opacity: busy ? 0.6 : 1,
  background: primary ? "var(--color-amber)" : "var(--color-cream-2)", color: primary ? "#fff" : "var(--color-dark)",
});

export default function StayPayLinks({ businessId, defaultLang }: { businessId: string; defaultLang: "en" | "he" }) {
  const supabase = useMemo(() => createClient(), []);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [loadedAt, setLoadedAt] = useState(0);

  const fetchAll = useCallback(async () => {
    const today = todayIso();
    const [cred, svc, bk, ln] = await Promise.all([
      supabase.from("payment_credentials").select("business_id").eq("business_id", businessId).maybeSingle(),
      supabase.from("services").select("id, name, price, weekend_price").eq("business_id", businessId).order("name"),
      supabase.from("bookings")
        .select("id, customer_name, customer_phone, customer_email, appointment_date, check_out, guests, status, payment_status, service_id, notes")
        .eq("business_id", businessId)
        .not("check_out", "is", null)
        .gte("check_out", today)
        .in("status", ["pending", "confirmed"])
        .order("appointment_date"),
      supabase.from("payment_links")
        .select("booking_id, token, amount, status, expires_at, paid_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    return { cred, svc, bk, ln, at: Date.now() };
  }, [supabase, businessId]);

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchAll>>) => {
    setLoadError(r.svc.error || r.bk.error || r.ln.error ? "Could not load bookings — refresh the page." : null);
    setConnected(!!r.cred.data);
    setUnits(((r.svc.data ?? []) as Unit[]).map((u) => ({ ...u, price: Number(u.price) })));
    setRows((r.bk.data ?? []) as Row[]);
    setLinks(((r.ln.data ?? []) as LinkRow[]).map((l) => ({ ...l, amount: Number(l.amount) })));
    setLoadedAt(r.at);
  }, []);

  const load = useCallback(async () => { apply(await fetchAll()); }, [apply, fetchAll]);

  useEffect(() => {
    let cancelled = false;
    fetchAll().then((r) => { if (!cancelled) apply(r); });
    return () => { cancelled = true; };
  }, [fetchAll, apply]);

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  return (
    <div>
      <ConnectBox businessId={businessId} connected={connected} onConnected={load} />

      <NewLinkForm
        businessId={businessId}
        units={units}
        defaultLang={defaultLang}
        disabled={!connected}
        onCreated={async (bookingId) => { await load(); setOpen(bookingId); }}
      />

      <div style={sub}>Requests and open bookings</div>
      {loadError && <p style={{ fontSize: 13, color: "var(--color-danger)" }}>{loadError}</p>}
      {rows.length === 0 && !loadError && (
        <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>No upcoming requests.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => {
          const unit = r.service_id ? unitById.get(r.service_id) : undefined;
          const nights = nightsBetween(r.appointment_date, r.check_out);
          const computed = unit ? stayTotal(unit, r.appointment_date, r.check_out) : null;
          const link = links.find((l) => l.booking_id === r.id && (l.status === "active" || l.status === "paid"));
          const paid = r.payment_status === "deposit_paid";
          const linkLive = link?.status === "active" && new Date(link.expires_at).getTime() > loadedAt;
          const tag = paid ? `Paid ₪${link?.amount ?? ""}`.trim()
            : r.payment_status !== "none" ? r.payment_status
            : linkLive ? `Link sent ₪${link!.amount}`
            : r.status === "confirmed" ? "Confirmed, unpaid" : "Request";
          const tagColor = paid ? "var(--color-success, #16A34A)" : linkLive ? "var(--color-amber)" : "var(--color-muted)";
          return (
            <div key={r.id} style={{ border: "1px solid var(--color-cream-2)", borderRadius: 12, padding: 12, background: "var(--color-surface)" }}>
              <button
                type="button"
                onClick={() => setOpen(open === r.id ? null : r.id)}
                style={{ all: "unset", cursor: "pointer", display: "flex", width: "100%", justifyContent: "space-between", gap: 8, alignItems: "center" }}
              >
                <span style={{ fontSize: 14, color: "var(--color-dark)" }}>
                  <strong>{r.customer_name || "Guest"}</strong> · {unit?.name ?? "—"} · {r.appointment_date} → {r.check_out} ({nights}n{r.guests ? `, ${r.guests}g` : ""})
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: tagColor, whiteSpace: "nowrap" }}>{tag}</span>
              </button>
              {open === r.id && (
                <div style={{ marginTop: 10 }}>
                  {r.notes && <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 8px" }}>“{r.notes}”</p>}
                  {paid ? (
                    <p style={{ fontSize: 13, color: "var(--color-dark)", margin: 0 }}>
                      Paid{link?.paid_at ? ` ${new Date(link.paid_at).toLocaleString("en-GB")}` : ""}. Receipt is in Green Invoice.
                    </p>
                  ) : r.payment_status !== "none" ? (
                    <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>This booking already has a payment recorded.</p>
                  ) : !connected ? (
                    <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>Connect Green Invoice above first.</p>
                  ) : (
                    <PayLinkPanel
                      bookingId={r.id}
                      defaultAmount={computed}
                      defaultLang={defaultLang}
                      guestPhone={r.customer_phone}
                      guestEmail={r.customer_email}
                      summary={`${unit?.name ?? "your stay"}, ${r.appointment_date} → ${r.check_out}`}
                      onChange={load}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Green Invoice connection ─────────────────────────────────────────────────

function ConnectBox({ businessId, connected, onConnected }: { businessId: string; connected: boolean | null; onConnected: () => void }) {
  const [apiId, setApiId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function connect() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/payments/greeninvoice/connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, apiId: apiId.trim(), apiSecret: apiSecret.trim() }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: b.error || "Could not connect." }); return; }
      setApiId(""); setApiSecret("");
      setMsg({ ok: true, text: "Connected." });
      onConnected();
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/payments/greeninvoice/diagnose", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId }),
      });
      const b = await res.json().catch(() => ({}));
      setMsg({ ok: res.ok && b.ok === true, text: b.message || b.error || (res.ok ? "Ready." : "Test failed.") });
    } finally { setBusy(false); }
  }

  if (connected === null) return <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>
          Green Invoice: {connected ? "connected" : "not connected"}
        </span>
        {connected && <button type="button" style={btn(false, busy)} disabled={busy} onClick={test}>Test payment setup</button>}
      </div>
      {!connected && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 8px" }}>
            Green Invoice → My account → Developer tools → API keys → Add key. Paste both here. The secret is stored encrypted and never shown again.
            Needs &ldquo;Open payments&rdquo; above and the Business ID set.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...input, flex: "1 1 180px" }} placeholder="API ID" value={apiId} onChange={(e) => setApiId(e.target.value)} autoComplete="off" />
            <input style={{ ...input, flex: "1 1 180px" }} placeholder="API Secret" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} autoComplete="new-password" />
            <button type="button" style={btn(true, busy)} disabled={busy || !apiId || !apiSecret} onClick={connect}>Connect</button>
          </div>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, marginTop: 8, color: msg.ok ? "var(--color-dark)" : "var(--color-danger)" }}>{msg.text}</p>}
    </div>
  );
}

// ─── New link without a request ───────────────────────────────────────────────

function NewLinkForm({
  businessId, units, defaultLang, disabled, onCreated,
}: {
  businessId: string;
  units: Unit[];
  defaultLang: "en" | "he";
  disabled: boolean;
  onCreated: (bookingId: string) => void;
}) {
  const [serviceId, setServiceId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [amountEdited, setAmountEdited] = useState(false);
  const [lang, setLang] = useState<"en" | "he">(defaultLang);
  const [hours, setHours] = useState(String(LINK_DEFAULT_HOURS));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<string | null>(null);

  const unit = units.find((u) => u.id === serviceId);
  const nights = isIsoDate(checkIn) && isIsoDate(checkOut) ? nightsBetween(checkIn, checkOut) : 0;
  const computed = unit && nights > 0 ? stayTotal(unit, checkIn, checkOut) : null;

  // Follow the nightly rates until the host types their own price.
  const shownAmount = amountEdited ? amount : (computed != null ? String(computed) : "");

  async function create() {
    setBusy(true); setError(null); setMade(null);
    try {
      const res = await fetch("/api/payments/links", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create: { businessId, serviceId, checkIn, checkOut, guests: Number(guests), name, phone, email },
          amount: shownAmount, lang, hours: Number(hours),
        }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) { setError(b.error || "Could not create the link."); return; }
      setMade(payLinkUrl(b.link.token));
      setName(""); setPhone(""); setEmail(""); setAmount(""); setAmountEdited(false);
      onCreated(b.bookingId);
    } catch {
      setError("Network error — try again.");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div style={sub}>New payment link (no request needed)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div>
          <label style={label} htmlFor="npl-unit">Apartment</label>
          <select id="npl-unit" style={input} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Choose…</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name} (₪{u.price}/night)</option>)}
          </select>
        </div>
        <div>
          <label style={label} htmlFor="npl-in">Check-in</label>
          <input id="npl-in" type="date" style={input} min={todayIso()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div>
          <label style={label} htmlFor="npl-out">Check-out</label>
          <input id="npl-out" type="date" style={input} min={checkIn || todayIso()} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <div>
          <label style={label} htmlFor="npl-guests">Guests</label>
          <input id="npl-guests" style={input} inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value)} />
        </div>
        <div>
          <label style={label} htmlFor="npl-name">Guest name</label>
          <input id="npl-name" style={input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label style={label} htmlFor="npl-phone">Guest phone</label>
          <input id="npl-phone" style={input} inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label style={label} htmlFor="npl-email">Guest email (optional — receipt goes here)</label>
          <input id="npl-email" style={input} inputMode="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label style={label} htmlFor="npl-amount">
            Total ₪{computed != null ? ` (rates: ₪${computed}, ${nights} nights)` : ""}
          </label>
          <input id="npl-amount" style={input} inputMode="decimal" value={shownAmount}
            onChange={(e) => { setAmount(e.target.value); setAmountEdited(true); }} />
        </div>
        <div>
          <label style={label} htmlFor="npl-lang">Page language</label>
          <select id="npl-lang" style={input} value={lang} onChange={(e) => setLang(e.target.value === "he" ? "he" : "en")}>
            <option value="en">English</option>
            <option value="he">עברית</option>
          </select>
        </div>
        <div>
          <label style={label} htmlFor="npl-hours">Valid for</label>
          <select id="npl-hours" style={input} value={hours} onChange={(e) => setHours(e.target.value)}>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">3 days</option>
            <option value="168">7 days</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" style={btn(true, busy)} disabled={busy || disabled || !serviceId || nights < 1 || !name || !phone || !shownAmount} onClick={create}>
          {busy ? "Creating…" : "Create link"}
        </button>
        {disabled && <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Connect Green Invoice first.</span>}
        {made && <span style={{ fontSize: 12, color: "var(--color-dark)" }}>Created — it&apos;s open below to copy or send.</span>}
      </div>
      {error && <p style={{ fontSize: 13, color: "var(--color-danger)", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
