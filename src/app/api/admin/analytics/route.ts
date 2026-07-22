import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

// Cross-tenant analytics for the admin dashboard. Uses the service-role client
// (bypasses RLS) after re-checking the admin allowlist server-side.

interface EventRow {
  business_id: string;
  session_id: string;
  event: string;
  step: string | null;
  source: string | null;
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
  instagram: "Instagram", google: "Google", whatsapp: "WhatsApp",
  facebook: "Facebook", tiktok: "TikTok", direct: "Direct", other: "Other",
};

function distinct(rows: EventRow[], match: (r: EventRow) => boolean): number {
  const set = new Set<string>();
  for (const r of rows) if (match(r)) set.add(r.session_id);
  return set.size;
}

function sourcesOf(rows: EventRow[]) {
  const bySession = new Map<string, string>();
  for (const r of rows) {
    if (r.event === "page_view" && !bySession.has(r.session_id)) {
      bySession.set(r.session_id, r.source || "other");
    }
  }
  const counts = new Map<string, number>();
  for (const s of bySession.values()) counts.set(s, (counts.get(s) || 0) + 1);
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: SOURCE_LABELS[key] || key, count }))
    .sort((a, b) => b.count - a.count);
}

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // yyyy-mm-dd
  const to   = searchParams.get("to");   // yyyy-mm-dd
  const startISO = from ? new Date(`${from}T00:00:00.000Z`).toISOString()
                        : new Date(Date.now() - 30 * 864e5).toISOString();
  const endISO   = to   ? new Date(`${to}T23:59:59.999Z`).toISOString()
                        : new Date().toISOString();

  const service = createServiceClient();

  const [{ data: bizData }, { data: evData }] = await Promise.all([
    service.from("businesses").select("id, name, slug"),
    service.from("page_events")
      .select("business_id, session_id, event, step, source")
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .limit(100000),
  ]);

  const businesses = (bizData ?? []) as { id: string; name: string; slug: string | null }[];
  const events = (evData ?? []) as EventRow[];

  const byBiz = new Map<string, EventRow[]>();
  for (const e of events) {
    const arr = byBiz.get(e.business_id) || [];
    arr.push(e);
    byBiz.set(e.business_id, arr);
  }

  const perBusiness = businesses.map((b) => {
    const rows = byBiz.get(b.id) || [];
    const visitors = distinct(rows, (r) => r.event === "page_view");
    const bookings = distinct(rows, (r) => r.event === "booking_completed");
    const noSlots  = distinct(rows, (r) => r.event === "no_slots");
    const conversion = visitors > 0 ? Math.round((bookings / visitors) * 1000) / 10 : 0;
    return {
      businessId: b.id,
      name: b.name,
      slug: b.slug,
      visitors,
      bookings,
      noSlots,
      conversion,
      funnel: STAGES.map((s) => ({ label: s.label, count: distinct(rows, s.match) })),
      sources: sourcesOf(rows),
    };
  });

  const totals = {
    visitors: distinct(events, (r) => r.event === "page_view"),
    bookings: distinct(events, (r) => r.event === "booking_completed"),
    noSlots:  distinct(events, (r) => r.event === "no_slots"),
    conversion: 0,
  };
  totals.conversion = totals.visitors > 0
    ? Math.round((totals.bookings / totals.visitors) * 1000) / 10 : 0;

  return NextResponse.json({
    totals,
    sourceMix: sourcesOf(events),
    businesses: perBusiness.sort((a, b) => b.visitors - a.visitors),
  });
}
