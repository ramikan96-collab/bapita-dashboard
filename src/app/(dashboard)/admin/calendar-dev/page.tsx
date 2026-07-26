import { createServiceClient } from "@/lib/supabase/service";
import DisconnectButton from "./_components/DisconnectButton";

export const dynamic = "force-dynamic";

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

export default async function CalendarDevPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const admin = createServiceClient();

  const [businessesRes, staffRes, connectionsRes] = await Promise.all([
    admin.from("businesses").select("id, name").order("name"),
    admin.from("staff").select("id, name, business_id").order("name"),
    admin.from("calendar_connections").select("business_id, staff_id, connected_email, status, sync_mode"),
  ]);
  const businesses = businessesRes.data as Business[] | null;
  const staff = staffRes.data as Staff[] | null;
  const connections = connectionsRes.data as Connection[] | null;

  const connectionFor = (businessId: string, staffId: string | null) =>
    (connections ?? []).find((c) => c.business_id === businessId && c.staff_id === staffId) ?? null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-dark)", marginBottom: 4 }}>
        Google Calendar — connections (Phase 0)
      </h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        Hidden dev-only page. Not linked in navigation. Connect a staff (or a whole business, no staff)
        to their Google Calendar — pull hides busy slots, push writes new bookings as events.
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

      {(businesses ?? []).map((biz) => {
        const bizStaff = (staff ?? []).filter((s) => s.business_id === biz.id);
        const rows: { staffId: string | null; label: string }[] = [
          { staffId: null, label: "Whole business (no staff)" },
          ...bizStaff.map((s) => ({ staffId: s.id, label: s.name })),
        ];
        return (
          <div key={biz.id} style={{ background: "var(--color-surface)", border: "var(--line)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{biz.name}</div>
            {rows.map((row) => {
              const conn = connectionFor(biz.id, row.staffId);
              return (
                <div key={row.staffId ?? "biz"} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #F0EBE0" }}>
                  <div>
                    <div style={{ fontSize: 14 }}>{row.label}</div>
                    {conn && (
                      <div style={{ fontSize: 12, color: conn.status === "connected" ? "#065F46" : "#B45309" }}>
                        {conn.status === "connected" ? `Connected — ${conn.connected_email ?? "?"} (${conn.sync_mode})` : `Needs reconnect (${conn.connected_email ?? "?"})`}
                      </div>
                    )}
                    {!conn && <div style={{ fontSize: 12, color: "#999" }}>Not connected</div>}
                  </div>
                  {conn ? (
                    <DisconnectButton businessId={biz.id} staffId={row.staffId} />
                  ) : (
                    <a
                      href={`/api/admin/calendar/google/connect?businessId=${biz.id}${row.staffId ? `&staffId=${row.staffId}` : ""}`}
                      style={{ fontSize: 13, fontWeight: 600, color: "var(--color-surface)", background: "var(--color-amber)", borderRadius: 8, padding: "6px 12px", textDecoration: "none" }}
                    >
                      Connect
                    </a>
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
