"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subDays } from "date-fns";

// Admin-only cross-tenant analytics. Data comes from /api/admin/analytics
// (service-role, RLS-bypassing) which re-checks the admin allowlist. The
// middleware already blocks /admin/* for non-admin emails.

interface Stage { label: string; count: number }
interface Source { key: string; label: string; count: number }
interface BizStat {
  businessId: string;
  name: string;
  slug: string | null;
  visitors: number;
  bookings: number;
  noSlots: number;
  conversion: number;
  funnel: Stage[];
  sources: Source[];
}
interface Payload {
  totals: { visitors: number; bookings: number; noSlots: number; conversion: number };
  sourceMix: Source[];
  businesses: BizStat[];
}

const RANGES: { key: string; label: string; days: number }[] = [
  { key: "7",  label: "7 days",  days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
];

export default function AdminAnalyticsPage() {
  const [rangeKey, setRangeKey] = useState("30");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 30;
    const to = format(new Date(), "yyyy-MM-dd");
    const from = format(subDays(new Date(), days), "yyyy-MM-dd");
    const res = await fetch(`/api/admin/analytics?from=${from}&to=${to}`);
    const json = res.ok ? await res.json() : null;
    setData(json);
    setLoading(false);
  }, [rangeKey]);

  // Fetches on mount + range change; setState runs after the request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedBiz = data?.businesses.find((b) => b.businessId === selected) || null;

  return (
    <div style={{ background: "var(--color-cream)", minHeight: "100%" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 64px" }}>

        {/* Header + range */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", margin: 0 }}>Analytics</h1>
          <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "var(--color-surface)", border: "1px solid var(--color-cream-2)" }}>
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRangeKey(r.key)} style={{
                padding: "6px 14px", height: 32, borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                ...(rangeKey === r.key
                  ? { background: "var(--color-cream)", color: "var(--color-dark)", boxShadow: "0 1px 4px rgba(30,26,20,0.10)" }
                  : { background: "transparent", color: "var(--color-muted)" }),
              }}>{r.label}</button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <Skeleton />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Platform totals */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
              <Kpi label="Visitors" value={data.totals.visitors.toLocaleString()} />
              <Kpi label="Bookings" value={data.totals.bookings.toLocaleString()} accent />
              <Kpi label="Conversion" value={`${data.totals.conversion}%`} />
              <Kpi label="No free times" value={data.totals.noSlots.toLocaleString()} />
            </div>

            {/* Source mix */}
            <Card title="Platform traffic sources">
              <Bars items={data.sourceMix} total={data.totals.visitors} color="linear-gradient(90deg, #7BA6C9, #5D8AB0)" />
            </Card>

            {/* Leaderboard */}
            <Card title="Businesses" subtitle="Sorted by visitors. Zero-traffic clients flagged.">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--color-muted)" }}>
                      <Th>Business</Th><Th right>Visitors</Th><Th right>Bookings</Th>
                      <Th right>Conversion</Th><Th right>No slots</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.businesses.map((b) => {
                      const dead = b.visitors === 0;
                      return (
                        <tr key={b.businessId}
                          onClick={() => setSelected(b.businessId)}
                          style={{ borderTop: "1px solid var(--color-cream-2)", cursor: "pointer", background: selected === b.businessId ? "var(--color-cream)" : "transparent" }}>
                          <Td>
                            <span style={{ fontWeight: 600, color: "var(--color-dark)" }}>{b.name}</span>
                            {dead && <span style={{ marginInlineStart: 8, fontSize: 11, fontWeight: 700, color: "#B45309", background: "#FEF3C7", padding: "2px 7px", borderRadius: 6 }}>no traffic</span>}
                          </Td>
                          <Td right>{b.visitors.toLocaleString()}</Td>
                          <Td right>{b.bookings.toLocaleString()}</Td>
                          <Td right>{b.conversion}%</Td>
                          <Td right>{b.noSlots.toLocaleString()}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Per-client drill-down */}
            <Card
              title="Per-client funnel"
              subtitle="Pick a business to see its booking funnel and sources"
              action={
                <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{
                  height: 34, padding: "0 10px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)",
                  background: "var(--color-surface)", fontSize: 13, color: "var(--color-dark)", cursor: "pointer",
                }}>
                  <option value="">— Select business —</option>
                  {data.businesses.map((b) => <option key={b.businessId} value={b.businessId}>{b.name}</option>)}
                </select>
              }
            >
              {!selectedBiz ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-muted)", fontSize: 14 }}>
                  Select a business above to drill in.
                </div>
              ) : selectedBiz.visitors === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-muted)", fontSize: 14 }}>
                  No visits for {selectedBiz.name} in this range.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div>
                    <SectionLabel>Funnel</SectionLabel>
                    <Bars items={selectedBiz.funnel.map((f) => ({ key: f.label, label: f.label, count: f.count }))}
                      total={selectedBiz.funnel[0]?.count || 1} color="linear-gradient(90deg, var(--color-amber), #E8A23D)" showTopPct />
                  </div>
                  <div>
                    <SectionLabel>Sources</SectionLabel>
                    <Bars items={selectedBiz.sources} total={selectedBiz.visitors} color="linear-gradient(90deg, #7BA6C9, #5D8AB0)" />
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Presentational ────────────────────────────────────────────────────────────

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", color: accent ? "var(--color-amber)" : "var(--color-dark)" }}>{value}</div>
    </div>
  );
}

function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-dark)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Bars({ items, total, color, showTopPct }: {
  items: { key?: string; label: string; count: number }[]; total: number; color: string; showTopPct?: boolean;
}) {
  const max = items[0]?.count || 1;
  if (items.length === 0) return <div style={{ fontSize: 13, color: "var(--color-muted)" }}>No data.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((it, i) => {
        const pctOfMax = Math.round((it.count / max) * 100);
        const pctLabel = showTopPct && i === 0 ? "100%" : `${total > 0 ? Math.round((it.count / total) * 100) : 0}%`;
        return (
          <div key={it.key || it.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-dark)" }}>{it.label}</span>
              <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
                <strong style={{ color: "var(--color-dark)" }}>{it.count.toLocaleString()}</strong> · {pctLabel}
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: "var(--color-cream-2)", overflow: "hidden" }}>
              <div style={{ width: `${Math.max(pctOfMax, it.count > 0 ? 4 : 0)}%`, height: "100%", borderRadius: 6, background: color, transition: "width 0.4s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-muted)", marginBottom: 12 }}>{children}</div>;
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ padding: "0 8px 10px", fontWeight: 600, textAlign: right ? "right" : "left", whiteSpace: "nowrap" }}>{children}</th>;
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td style={{ padding: "12px 8px", textAlign: right ? "right" : "left", color: "var(--color-dark)", whiteSpace: "nowrap" }}>{children}</td>;
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 92, borderRadius: 16, background: "var(--color-cream-2)", opacity: 0.5 }} />)}
      </div>
      <div style={{ height: 220, borderRadius: 16, background: "var(--color-cream-2)", opacity: 0.5 }} />
    </div>
  );
}
