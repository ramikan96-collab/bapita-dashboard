"use client";

import { useState } from "react";
import { STATUS_COLOR } from "@/types";

// Rami's WhatsApp line — the ads nudge opens a pre filled chat.
const WA_NUMBER = "972501234567";
const WA_MSG = "Hi, I want to turn on paid ads to bring in more bookings.";

// ─── Mock data ──────────────────────────────────────────────────────────────
// Real numbers come from Supabase once a shop is live. These mirror a busy
// month so the page reads true: revenue grows, no shows stay low.

interface WeekPoint {
  label: string;
  revenue: number;
}

interface TopService {
  name: string;
  count: number;
  revenue: number;
}

interface RangeData {
  revenue: number;
  previousRevenue: number;
  bookings: number;
  completed: number;
  noShow: number;
  avgTicket: number;
  weekly: WeekPoint[];
  topServices: TopService[];
}

type RangeKey = "month" | "quarter" | "year";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "Last 3 months" },
  { key: "year", label: "This year" },
];

const DATA: Record<RangeKey, RangeData> = {
  month: {
    revenue: 7240,
    previousRevenue: 6180,
    bookings: 96,
    completed: 88,
    noShow: 3,
    avgTicket: 82,
    weekly: [
      { label: "Wk 1", revenue: 1480 },
      { label: "Wk 2", revenue: 1920 },
      { label: "Wk 3", revenue: 1640 },
      { label: "Wk 4", revenue: 2200 },
    ],
    topServices: [
      { name: "Haircut", count: 41, revenue: 3280 },
      { name: "Beard trim", count: 22, revenue: 1320 },
      { name: "Cut + beard", count: 15, revenue: 1800 },
      { name: "Kids cut", count: 7, revenue: 420 },
      { name: "Hot towel shave", count: 3, revenue: 420 },
    ],
  },
  quarter: {
    revenue: 20460,
    previousRevenue: 18900,
    bookings: 284,
    completed: 261,
    noShow: 11,
    avgTicket: 78,
    weekly: [
      { label: "Apr", revenue: 6180 },
      { label: "May", revenue: 7040 },
      { label: "Jun", revenue: 7240 },
    ],
    topServices: [
      { name: "Haircut", count: 124, revenue: 9920 },
      { name: "Beard trim", count: 63, revenue: 3780 },
      { name: "Cut + beard", count: 44, revenue: 5280 },
      { name: "Kids cut", count: 21, revenue: 1260 },
      { name: "Hot towel shave", count: 9, revenue: 1260 },
    ],
  },
  year: {
    revenue: 74300,
    previousRevenue: 61200,
    bookings: 1040,
    completed: 958,
    noShow: 38,
    avgTicket: 76,
    weekly: [
      { label: "Q1", revenue: 16800 },
      { label: "Q2", revenue: 20460 },
      { label: "Q3", revenue: 18240 },
      { label: "Q4", revenue: 18800 },
    ],
    topServices: [
      { name: "Haircut", count: 452, revenue: 36160 },
      { name: "Beard trim", count: 231, revenue: 13860 },
      { name: "Cut + beard", count: 168, revenue: 20160 },
      { name: "Kids cut", count: 74, revenue: 4440 },
      { name: "Hot towel shave", count: 33, revenue: 4620 },
    ],
  },
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)",
};

export default function InsightsPage() {
  const [range, setRange] = useState<RangeKey>("month");
  const [pickerOpen, setPickerOpen] = useState(false);

  const stats = DATA[range];
  const rangeLabel = RANGES.find((r) => r.key === range)!.label;

  // Delta vs the previous comparable period.
  const deltaPct = ((stats.revenue - stats.previousRevenue) / stats.previousRevenue) * 100;
  const deltaUp = deltaPct >= 0;

  const maxServiceRevenue = Math.max(1, ...stats.topServices.map((s) => s.revenue));

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header with date range chip */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-4">
        <h1 className="text-[28px] font-extrabold leading-tight" style={{ color: "var(--color-dark)" }}>
          Insights
        </h1>

        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-transform active:scale-[0.97]"
            style={{ ...cardStyle, color: "var(--color-dark)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-amber)" }} />
            {rangeLabel}
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: pickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setPickerOpen(false)} />
              <div
                className="absolute top-10 end-0 z-40 w-44 rounded-2xl py-1.5 bg-white"
                style={{ boxShadow: "0 8px 32px rgba(30,26,20,0.16)" }}
                role="menu"
              >
                {RANGES.map((r) => {
                  const active = r.key === range;
                  return (
                    <button
                      key={r.key}
                      onClick={() => {
                        setRange(r.key);
                        setPickerOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-[14px] text-start hover:bg-cream transition-colors"
                      style={{ color: "var(--color-dark)" }}
                      role="menuitemradio"
                      aria-checked={active}
                    >
                      {r.label}
                      {active && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-3">

        {/* Revenue hero */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <p className="text-[13px] font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>
            Earnings, {rangeLabel.toLowerCase()}
          </p>
          <p className="text-[44px] font-black leading-none" style={{ color: "var(--color-amber)" }}>
            ₪{stats.revenue.toLocaleString()}
          </p>
          <p
            className="inline-flex items-center gap-1 text-[14px] font-semibold mt-2.5"
            style={{ color: deltaUp ? "#16A34A" : "#DC2626" }}
          >
            <span>{deltaUp ? "↑" : "↓"}</span>
            {Math.abs(deltaPct).toFixed(0)}%
            <span className="font-medium" style={{ color: "var(--color-muted)" }}>
              vs previous period
            </span>
          </p>
        </div>

        {/* 2 by 2 stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Bookings" value={stats.bookings} />
          <StatCard label="Completed" value={stats.completed} color={STATUS_COLOR.completed} />
          <StatCard
            label="No shows"
            value={stats.noShow}
            color={stats.noShow > 0 ? STATUS_COLOR.no_show : undefined}
          />
          <StatCard label="Average ticket" value={`₪${stats.avgTicket.toLocaleString()}`} />
        </div>

        {/* Revenue chart — hand rolled SVG bars */}
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[15px] font-bold mb-4" style={{ color: "var(--color-dark)" }}>
            Revenue trend
          </p>
          <BarChart data={stats.weekly} />
        </div>

        {/* Top services */}
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[15px] font-bold mb-3" style={{ color: "var(--color-dark)" }}>
            Top services
          </p>
          <div className="space-y-3.5">
            {stats.topServices.map((service, idx) => (
              <div key={service.name} className="flex items-center gap-3">
                <span
                  className="text-[12px] font-bold w-4 text-center flex-shrink-0"
                  style={{ color: "var(--color-muted)" }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <p className="text-[15px] font-medium truncate" style={{ color: "var(--color-dark)" }}>
                      {service.name}
                    </p>
                    <span className="text-[14px] font-semibold flex-shrink-0" style={{ color: "var(--color-dark)" }}>
                      ₪{service.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-cream-2)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(6, (service.revenue / maxServiceRevenue) * 100)}%`,
                        background: "var(--color-amber)",
                      }}
                    />
                  </div>
                  <p className="text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>
                    {service.count} {service.count === 1 ? "booking" : "bookings"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ads nudge — the only upsell allowed on this page */}
        <div className="rounded-2xl p-4 flex items-center gap-4" style={cardStyle}>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(232,146,10,0.12)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold leading-snug" style={{ color: "var(--color-dark)" }}>
              Want more bookings?
            </p>
            <p className="text-[13px] leading-snug" style={{ color: "var(--color-muted)" }}>
              Turn on paid ads.
            </p>
          </div>
          <button
            onClick={() =>
              window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, "_blank")
            }
            className="flex-shrink-0 text-[14px] font-semibold text-white px-4 py-2.5 rounded-xl bg-amber hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
          >
            Turn on
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── SVG bar chart ───────────────────────────────────────────────────────────
// No chart lib. Pure SVG so it stays light and matches the brand exactly. Tap a
// bar to read its value; the tallest bar is amber, the rest sit at low opacity.

function BarChart({ data }: { data: WeekPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const peak = data.reduce((hi, d, i) => (d.revenue > data[hi].revenue ? i : hi), 0);

  const W = 320;
  const H = 150;
  const padBottom = 24; // room for labels
  const chartH = H - padBottom;
  const slot = W / data.length;
  const barW = Math.min(48, slot * 0.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Revenue trend">
      {data.map((d, i) => {
        const h = Math.max(4, (d.revenue / max) * (chartH - 8));
        const x = i * slot + (slot - barW) / 2;
        const y = chartH - h;
        const isActive = active === i;
        const isPeak = i === peak;
        const fill =
          isActive || isPeak ? "var(--color-amber)" : "rgba(232,146,10,0.28)";

        return (
          <g key={d.label} onClick={() => setActive(isActive ? null : i)} style={{ cursor: "pointer" }}>
            {/* hit area — full slot so taps land easily */}
            <rect x={i * slot} y={0} width={slot} height={chartH} fill="transparent" />
            <rect
              x={x} y={y} width={barW} height={h} rx={6}
              fill={fill}
              style={{ transition: "fill 0.15s" }}
            />
            {isActive && (
              <text
                x={i * slot + slot / 2} y={y - 6}
                textAnchor="middle"
                fontFamily="Heebo" fontSize="12" fontWeight="700"
                fill="var(--color-dark)"
              >
                ₪{d.revenue.toLocaleString()}
              </text>
            )}
            <text
              x={i * slot + slot / 2} y={H - 6}
              textAnchor="middle"
              fontFamily="Heebo" fontSize="12"
              fill="var(--color-muted)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StatCard({
  label, value, color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>{label}</p>
      <p className="text-[32px] font-black leading-none" style={{ color: color || "var(--color-dark)" }}>
        {value}
      </p>
    </div>
  );
}
