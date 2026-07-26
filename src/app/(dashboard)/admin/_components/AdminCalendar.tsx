"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import CalendarConnectButton from "./CalendarConnectButton";
import CalendarDisconnectButton from "./CalendarDisconnectButton";
import CalendarSyncModeSelect from "./CalendarSyncModeSelect";

interface Business { id: string; name: string }
interface Staff { id: string; name: string; business_id: string }
interface Connection {
  business_id: string;
  staff_id: string | null;
  connected_email: string | null;
  status: string;
  sync_mode: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Google didn't return a code — consent may have been denied.",
  bad_state: "Lost track of which business this was for — try connecting again.",
  no_refresh_token: "Google didn't return a refresh token. This Google account may have already granted access before — revoke Bapita's access at myaccount.google.com/permissions, then try again.",
  exchange_failed: "Token exchange with Google failed — check GOOGLE_CLIENT_ID/SECRET and the redirect URI in Google Auth Platform.",
  access_denied: "You declined the Google consent screen.",
};

export function AdminCalendar() {
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");

  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/calendar/google/list");
    if (res.ok) {
      const data = await res.json();
      setBusinesses(data.businesses);
      setStaff(data.staff);
      setConnections(data.connections);
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const connectionFor = (businessId: string, staffId: string | null) =>
    connections.find((c) => c.business_id === businessId && c.staff_id === staffId) ?? null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 64px" }}>
      <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 16 }}>
        Connect a staff member (or a whole business, no staff) to their Google Calendar — pull hides
        busy slots on the booking page, push writes new bookings as events. Pick the mode before
        connecting, or change it any time after. Connect opens Google in a new tab; come back here
        and hit refresh once you finish there.
      </p>

      {connected && (
        <div style={{ background: "#D1FAE5", color: "#065F46", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          Connected.
        </div>
      )}
      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          {ERROR_MESSAGES[error] ?? `Error: ${error}`}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-muted)", fontSize: 14 }}>Loading…</div>}

      {!loading && (businesses ?? []).map((biz) => {
        const bizStaff = staff.filter((s) => s.business_id === biz.id);
        const rows: { staffId: string | null; label: string }[] = [
          { staffId: null, label: "Whole business (no staff)" },
          ...bizStaff.map((s) => ({ staffId: s.id, label: s.name })),
        ];
        return (
          <div key={biz.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{biz.name}</div>
            {rows.map((row) => {
              const conn = connectionFor(biz.id, row.staffId);
              return (
                <div key={row.staffId ?? "biz"} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #F0EBE0" }}>
                  <div>
                    <div style={{ fontSize: 14 }}>{row.label}</div>
                    {conn && (
                      <div style={{ fontSize: 12, color: conn.status === "connected" ? "#065F46" : "#B45309" }}>
                        {conn.status === "connected" ? `Connected — ${conn.connected_email ?? "?"}` : `Needs reconnect (${conn.connected_email ?? "?"})`}
                      </div>
                    )}
                    {!conn && <div style={{ fontSize: 12, color: "#999" }}>Not connected</div>}
                  </div>
                  {conn ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CalendarSyncModeSelect businessId={biz.id} staffId={row.staffId} syncMode={conn.sync_mode} onChanged={load} />
                      <CalendarDisconnectButton businessId={biz.id} staffId={row.staffId} onDisconnected={load} />
                    </div>
                  ) : (
                    <CalendarConnectButton businessId={biz.id} staffId={row.staffId} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
