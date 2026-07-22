"use client";

import { useState, useEffect, useCallback } from "react";
import { endOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/client";

// Owner-facing traffic + funnel view for the booking page. Reads page_events
// under RLS (owner reads only their own business). All metrics are counts of
// distinct anonymous session_ids, so "visitors" means people, not page-opens.

interface EventRow {
  session_id: string;
  event: string;
  step: string | null;
  source: string | null;
}

interface Props {
  businessId: string;
  start: Date;
  end: Date;
}

const STAGES: { key: string; label: string; match: (r: EventRow) => boolean }[] = [
  { key: "visited", label: "Visited",         match: (r) => r.event === "page_view" },
  { key: "started", label: "Started booking", match: (r) => r.event === "booking_started" },
  { key: "date",    label: "Picked a date",   match: (r) => r.event === "step_reached" && r.step === "date" },
  { key: "time",    label: "Picked a time",   match: (r) => r.event === "step_reached" && r.step === "time" },
  { key: "contact", label: "Entered details", match: (r) => r.event === "step_reached" && r.step === "contact" },
  { key: "booked",  label: "Booked",          match: (r) => r.event === "booking_completed" },
];

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  tiktok: "TikTok",
  direct: "Direct",
  other: "Other",
};

function distinct(rows: EventRow[], match: (r: EventRow) => boolean): number {
  const set = new Set<string>();
  for (const r of rows) if (match(r)) set.add(r.session_id);
  return set.size;
}

export default function VisitorsTab({ businessId, start, end }: Props) {
  const supabase = createClient();
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("page_events")
      .select("session_id, event, step, source")
      .eq("business_id", businessId)
      .gte("created_at", start.toISOString())
      .lte("created_at", endOfDay(end).toISOString());
    setRows((data ?? []) as EventRow[]);
    setLoading(false);
  }, [supabase, businessId, start, end]);

  // Fetches on mount + when the range changes; setState runs after the query.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !rows) return <VisitorsSkeleton />;

  const visited = distinct(rows, (r) => r.event === "page_view");
  const booked  = distinct(rows, (r) => r.event === "booking_completed");
  const noSlots = distinct(rows, (r) => r.event === "no_slots");
  const conversion = visited > 0 ? Math.round((booked / visited) * 1000) / 10 : 0;

  if (visited === 0) return <VisitorsEmpty />;

  const funnel = STAGES.map((s) => ({ label: s.label, count: distinct(rows, s.match) }));
  const funnelMax = funnel[0].count || 1;

  // Traffic sources: one source per session (first-touch), from page_view rows.
  const sourceBySession = new Map<string, string>();
  for (const r of rows) {
    if (r.event === "page_view" && !sourceBySession.has(r.session_id)) {
      sourceBySession.set(r.session_id, r.source || "other");
    }
  }
  const sourceCounts = new Map<string, number>();
  for (const src of sourceBySession.values()) {
    sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
  }
  const sources = Array.from(sourceCounts.entries())
    .map(([key, count]) => ({ key, label: SOURCE_LABELS[key] || key, count }))
    .sort((a, b) => b.count - a.count);
  const sourceMax = sources[0]?.count || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI row */}
      <div className="ins-grid-2" style={{ gap: 16 }}>
        <Kpi label="Unique visitors" value={visited.toLocaleString()} hint="People who opened your page" />
        <Kpi label="Bookings" value={booked.toLocaleString()} hint="Completed on your page" accent />
        <Kpi label="Conversion rate" value={`${conversion}%`} hint="Visitors who booked" />
        <Kpi label="No free times" value={noSlots.toLocaleString()} hint="Visitors who found no open slot" />
      </div>

      {/* Funnel */}
      <Card title="Booking funnel" subtitle="Where visitors drop off on the way to booking">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {funnel.map((f, i) => {
            const pctOfTop = Math.round((f.count / funnelMax) * 100);
            const pctLabel = i === 0 ? "100%" : `${visited > 0 ? Math.round((f.count / visited) * 100) : 0}%`;
            return (
              <div key={f.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-dark)" }}>{f.label}</span>
                  <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
                    <strong style={{ color: "var(--color-dark)" }}>{f.count.toLocaleString()}</strong> · {pctLabel}
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: "var(--color-cream-2)", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.max(pctOfTop, f.count > 0 ? 4 : 0)}%`,
                    height: "100%",
                    borderRadius: 6,
                    background: "linear-gradient(90deg, var(--color-amber), #E8A23D)",
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Traffic sources */}
      <Card title="Where visitors come from" subtitle="First place each visitor arrived from">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sources.map((s) => (
            <div key={s.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-dark)" }}>{s.label}</span>
                <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
                  <strong style={{ color: "var(--color-dark)" }}>{s.count.toLocaleString()}</strong>
                  {" · "}{Math.round((s.count / visited) * 100)}%
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 6, background: "var(--color-cream-2)", overflow: "hidden" }}>
                <div style={{
                  width: `${Math.max(Math.round((s.count / sourceMax) * 100), s.count > 0 ? 4 : 0)}%`,
                  height: "100%",
                  borderRadius: 6,
                  background: "linear-gradient(90deg, #7BA6C9, #5D8AB0)",
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Presentational bits (match Insights premium tone) ─────────────────────────

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-cream-2)",
      borderRadius: 16,
      padding: "18px 20px",
      boxShadow: "var(--shadow-sm, 0 1px 3px rgba(30,26,20,0.06))",
    }}>
      <div style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", color: accent ? "var(--color-amber)" : "var(--color-dark)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 8 }}>{hint}</div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-dark)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function VisitorsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="ins-grid-2" style={{ gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 108, borderRadius: 16, background: "var(--color-cream-2)", opacity: 0.5 }} />
        ))}
      </div>
      <div style={{ height: 260, borderRadius: 16, background: "var(--color-cream-2)", opacity: 0.5 }} />
    </div>
  );
}

function VisitorsEmpty() {
  return (
    <div style={{ textAlign: "center", padding: "72px 24px", color: "var(--color-muted)" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👀</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>No visits yet in this range</div>
      <div style={{ fontSize: 14 }}>Share your booking link — visitor traffic and your funnel will show up here.</div>
    </div>
  );
}
