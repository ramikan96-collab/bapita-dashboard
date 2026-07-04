"use client";

export function CalendarSkeleton() {
  return (
    <div
      className="flex flex-col h-full animate-pulse"
      style={{ background: "var(--color-cream)" }}
    >
      {/* Header bar with day labels */}
      <div
        className="shrink-0 flex border-b"
        style={{ borderColor: "var(--color-cream-2)", height: 48 }}
      >
        {/* Time column gutter */}
        <div className="w-12 shrink-0" />
        {/* 7 day columns */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center"
            style={{ borderLeft: "1px solid var(--color-cream-2)" }}
          >
            <div
              className="h-5 rounded"
              style={{ width: "60%", background: "var(--color-cream-2)" }}
            />
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time column */}
        <div className="w-12 shrink-0 flex flex-col gap-8 pt-6 px-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded"
              style={{ background: "var(--color-cream-2)" }}
            />
          ))}
        </div>

        {/* Day columns with booking chip skeletons */}
        {Array.from({ length: 7 }).map((_, col) => (
          <div
            key={col}
            className="flex-1 relative pt-3 flex flex-col gap-3 px-1"
            style={{ borderLeft: "1px solid var(--color-cream-2)" }}
          >
            {col % 3 !== 2 && (
              <div
                className="rounded-lg"
                style={{
                  height: 36,
                  background: "var(--color-cream-2)",
                  marginTop: `${col * 8}px`,
                }}
              />
            )}
            {col % 4 === 0 && (
              <div
                className="rounded-lg"
                style={{ height: 52, background: "var(--color-cream-2)" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientsSkeleton() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between animate-pulse">
        <div className="h-8 rounded w-28" style={{ background: "var(--color-cream-2)" }}></div>
        <div className="h-11 rounded-xl w-20" style={{ background: "var(--color-cream-2)" }}></div>
      </div>
      <div className="px-4 pb-3 space-y-3 animate-pulse">
        <div className="h-12 rounded-[10px]" style={{ background: "var(--color-cream-2)" }}></div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-full w-20" style={{ background: "var(--color-cream-2)" }}></div>
          ))}
        </div>
      </div>
      <div className="px-4 space-y-2.5 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[76px] rounded-2xl bg-white" style={{ boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)" }}></div>
        ))}
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  const cardShadow = "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)";
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <style>{`
        .ins-sk-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) {
          .ins-sk-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div className="shrink-0 animate-pulse" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div className="mx-auto w-full" style={{ maxWidth: 900, padding: "22px 24px 0" }}>
          {/* Title + range label + print */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-2.5">
              <div className="h-[26px] rounded w-20" style={{ background: "var(--color-cream-2)" }} />
              <div className="h-3.5 rounded w-24" style={{ background: "var(--color-cream-2)" }} />
            </div>
            <div className="h-[34px] w-[34px] rounded-[9px]" style={{ background: "var(--color-cream-2)" }} />
          </div>

          {/* Range picker pills */}
          <div className="mb-4">
            <div className="inline-flex gap-0.5 p-[3px] rounded-[10px]" style={{ background: "var(--color-cream)", border: "1px solid var(--color-cream-2)" }}>
              {[56, 64, 68, 62].map((w, i) => (
                <div key={i} className="h-[34px] rounded-lg" style={{ width: w, background: i === 1 ? "var(--color-surface)" : "transparent" }} />
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-5 pb-2.5">
            <div className="h-4 rounded w-16 pb-2" style={{ background: "var(--color-cream-2)", borderBottom: "2px solid var(--color-amber)" }} />
            <div className="h-4 rounded w-24" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-4 rounded w-16" style={{ background: "var(--color-cream-2)" }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full animate-pulse" style={{ maxWidth: 900, padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Earnings hero */}
          <div className="rounded-2xl" style={{ padding: "24px 28px", background: "var(--color-cream-2)" }}>
            <div className="h-2.5 rounded w-20 mb-3" style={{ background: "rgba(255,255,255,0.5)" }} />
            <div className="h-10 rounded w-40 mb-4" style={{ background: "rgba(255,255,255,0.5)" }} />
            <div className="h-6 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
          </div>

          {/* 4 stat cards 2x2 */}
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white" style={{ padding: "16px 20px", boxShadow: cardShadow }}>
                <div className="w-9 h-9 rounded-xl mb-3" style={{ background: "var(--color-cream-2)" }} />
                <div className="h-[26px] rounded w-12 mb-1.5" style={{ background: "var(--color-cream-2)" }} />
                <div className="h-2.5 rounded w-16" style={{ background: "var(--color-cream)" }} />
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="ins-sk-grid-2">
            <div className="rounded-2xl bg-white" style={{ padding: "20px 20px 14px", boxShadow: cardShadow }}>
              <div className="h-3.5 rounded w-28 mb-4" style={{ background: "var(--color-cream-2)" }} />
              <div className="h-[100px] rounded-lg" style={{ background: "var(--color-cream)" }} />
            </div>
            <div className="rounded-2xl bg-white" style={{ padding: "20px 20px", boxShadow: cardShadow }}>
              <div className="h-3.5 rounded w-24 mb-4" style={{ background: "var(--color-cream-2)" }} />
              <div className="flex flex-col gap-4">
                {[100, 80, 90].map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-[22px] h-[22px] rounded-full shrink-0" style={{ background: "var(--color-cream-2)" }} />
                    <div className="flex-1">
                      <div className="h-3 rounded mb-1.5" style={{ width: w, background: "var(--color-cream-2)" }} />
                      <div className="h-[5px] rounded-full" style={{ background: "var(--color-cream)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ads CTA */}
          <div className="rounded-2xl flex items-center gap-4" style={{ padding: "18px 20px", background: "var(--color-cream-2)" }}>
            <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: "rgba(255,255,255,0.5)" }} />
            <div className="flex-1">
              <div className="h-3.5 rounded w-36 mb-1.5" style={{ background: "rgba(255,255,255,0.5)" }} />
              <div className="h-3 rounded w-48" style={{ background: "rgba(255,255,255,0.35)" }} />
            </div>
            <div className="h-9 w-20 rounded-xl shrink-0" style={{ background: "rgba(255,255,255,0.5)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinancialsSkeleton() {
  const cardShadow = "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)";
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div className="shrink-0 animate-pulse" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div className="mx-auto w-full" style={{ maxWidth: 760, padding: "26px 24px 14px" }}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="h-[26px] rounded w-28" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-[34px] w-28 rounded-[9px]" style={{ background: "var(--color-cream-2)" }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="h-[30px] w-[84px] rounded-full" style={{ background: "var(--color-cream-2)" }} />
              <div className="h-[30px] w-[74px] rounded-full" style={{ background: "var(--color-cream)" }} />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-[7px]" style={{ background: "var(--color-cream-2)" }} />
              <div className="h-3.5 rounded w-16 mx-1" style={{ background: "var(--color-cream-2)" }} />
              <div className="w-7 h-7 rounded-[7px]" style={{ background: "var(--color-cream-2)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full animate-pulse" style={{ maxWidth: 760, padding: "20px 24px 0" }}>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[14px] bg-white" style={{ padding: "14px 16px", boxShadow: cardShadow }}>
                <div className="h-2.5 rounded w-16 mb-2.5" style={{ background: "var(--color-cream-2)" }} />
                <div className="h-6 rounded w-20" style={{ background: "var(--color-cream-2)" }} />
              </div>
            ))}
          </div>

          {/* Filter + sort bar */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="flex gap-1.5 flex-1">
              {[64, 56, 76, 80].map((w, i) => (
                <div key={i} className="h-[30px] rounded-full" style={{ width: w, background: "var(--color-cream-2)" }} />
              ))}
            </div>
            <div className="h-[30px] w-32 rounded-[9px]" style={{ background: "var(--color-cream-2)" }} />
          </div>

          {/* Transaction table */}
          <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: cardShadow }}>
            <div className="grid gap-x-3 px-4 py-2.5 border-b" style={{ gridTemplateColumns: "100px 70px 1fr 80px", borderColor: "var(--color-cream-2)" }}>
              {["w-12", "w-10", "w-24", "w-14"].map((w, i) => (
                <div key={i} className={`h-2.5 rounded ${w}`} style={{ background: "var(--color-cream-2)" }} />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid gap-x-3 px-4 items-center"
                style={{ gridTemplateColumns: "100px 70px 1fr 80px", padding: "12px 16px", borderBottom: i < 4 ? "1px solid var(--color-cream-2)" : undefined }}
              >
                <div className="h-4 w-14 rounded-full" style={{ background: "var(--color-cream-2)" }} />
                <div className="h-3 w-10 rounded" style={{ background: "var(--color-cream)" }} />
                <div>
                  <div className="h-3 rounded w-28 mb-1" style={{ background: "var(--color-cream-2)" }} />
                  <div className="h-2.5 rounded w-20" style={{ background: "var(--color-cream)" }} />
                </div>
                <div className="h-3.5 rounded w-12" style={{ background: "var(--color-cream-2)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtrasCardSkeleton({ accent = false }: { accent?: boolean }) {
  return (
    <div
      className="rounded-2xl"
      style={{
        padding: "18px 20px",
        background: "var(--color-surface)",
        border: accent ? "1.5px solid var(--color-amber)" : "1.5px solid var(--color-cream-2)",
      }}
    >
      <div className="flex items-start gap-3.5">
        <div className="w-[38px] h-[38px] rounded-xl shrink-0" style={{ background: "var(--color-cream-2)" }} />
        <div className="flex-1 min-w-0 flex items-start justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="h-3.5 rounded w-32 mb-2" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-3 rounded w-full mb-1" style={{ background: "var(--color-cream)" }} />
            <div className="h-3 rounded w-4/5" style={{ background: "var(--color-cream)" }} />
          </div>
          <div className="h-8 w-20 rounded-full shrink-0" style={{ background: "var(--color-cream-2)" }} />
        </div>
      </div>
      <div className="mt-4.5 pt-3.5" style={{ borderTop: "1px solid var(--color-cream-2)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="h-2.5 rounded w-24" style={{ background: "var(--color-cream-2)" }} />
          <div className="h-2.5 rounded w-16" style={{ background: "var(--color-cream-2)" }} />
        </div>
        <div className="h-1 rounded-full w-full" style={{ background: "var(--color-cream-2)" }} />
      </div>
    </div>
  );
}

export function ExtrasSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse" style={{ background: "var(--color-cream)" }}>
      {/* White header strip */}
      <div className="shrink-0" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div className="mx-auto w-full" style={{ maxWidth: 600, padding: "26px 24px 0" }}>
          <div className="h-7 rounded w-24 mb-4" style={{ background: "var(--color-cream-2)" }} />
          <div className="flex gap-6 pb-3">
            <div className="h-4 rounded w-20" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-4 rounded w-16" style={{ background: "var(--color-cream-2)" }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full flex flex-col gap-4" style={{ maxWidth: 600, padding: "24px 24px 0" }}>
          <ExtrasCardSkeleton accent />
          {Array.from({ length: 4 }).map((_, i) => (
            <ExtrasCardSkeleton key={i} />
          ))}
          <ExtrasCardSkeleton />
          <div
            className="rounded-2xl flex items-center gap-3.5"
            style={{ padding: "14px 18px", background: "var(--color-surface)", border: "1.5px solid var(--color-cream-2)" }}
          >
            <div className="w-9 h-9 rounded-[10px] shrink-0" style={{ background: "var(--color-cream-2)" }} />
            <div className="flex-1 min-w-0">
              <div className="h-3 rounded w-36 mb-1.5" style={{ background: "var(--color-cream-2)" }} />
              <div className="h-2.5 rounded w-44" style={{ background: "var(--color-cream)" }} />
            </div>
            <div className="h-6 w-20 rounded-full shrink-0" style={{ background: "var(--color-cream-2)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div className="shrink-0 animate-pulse" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div className="mx-auto w-full" style={{ maxWidth: 480, padding: "26px 24px 20px" }}>
          <div className="h-[26px] rounded w-24" style={{ background: "var(--color-cream-2)" }} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full animate-pulse" style={{ maxWidth: 480, padding: "24px 24px 0" }}>

          {/* Email card */}
          <div className="rounded-2xl mb-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", boxShadow: "var(--shadow-sm)", padding: "18px 20px" }}>
            <div className="h-2.5 rounded w-16 mb-2" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-3.5 rounded w-40" style={{ background: "var(--color-cream)" }} />
          </div>

          {/* Change password card */}
          <div className="rounded-2xl mb-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", boxShadow: "var(--shadow-sm)", padding: "18px 20px" }}>
            <div className="h-4 rounded w-36 mb-4" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-2.5 rounded w-24 mb-2" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-[42px] rounded-[11px] mb-3" style={{ background: "var(--color-cream)" }} />
            <div className="h-2.5 rounded w-28 mb-2" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-[42px] rounded-[11px] mb-4" style={{ background: "var(--color-cream)" }} />
            <div className="h-11 rounded-xl" style={{ background: "var(--color-cream-2)" }} />
          </div>

          {/* Delete account */}
          <div className="rounded-2xl mb-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", boxShadow: "var(--shadow-sm)", padding: "14px 20px" }}>
            <div className="h-[42px] rounded-[11px]" style={{ background: "var(--color-cream-2)" }} />
          </div>

          {/* Sign out */}
          <div className="rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", boxShadow: "var(--shadow-sm)", padding: "14px 20px" }}>
            <div className="h-[42px] rounded-[11px]" style={{ background: "var(--color-cream-2)" }} />
          </div>

        </div>
      </div>
    </div>
  );
}

function SettingsCardSkeleton({ fields, textarea }: { fields: number; textarea?: boolean }) {
  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-cream-2)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-cream-2)" }}>
        <div className="h-[11px] rounded w-20" style={{ background: "var(--color-cream-2)" }} />
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-2.5 rounded w-24" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-11 rounded-[11px]" style={{ background: "var(--color-cream)" }} />
          </div>
        ))}
        {textarea && (
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 rounded w-16" style={{ background: "var(--color-cream-2)" }} />
            <div className="h-24 rounded-[11px]" style={{ background: "var(--color-cream)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header + chip tabs */}
      <div className="shrink-0 animate-pulse" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-cream-2)", padding: "26px 24px 0" }}>
        <div className="h-[26px] rounded w-24 mb-4" style={{ background: "var(--color-cream-2)" }} />
        <div style={{ display: "flex", gap: 8, paddingBottom: 18, overflowX: "auto" }}>
          {[72, 80, 64, 76, 88, 70].map((w, i) => (
            <div key={i} className="shrink-0" style={{ width: w, height: 34, borderRadius: 9999, background: "var(--color-cream-2)" }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full animate-pulse" style={{ maxWidth: 560, padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          <SettingsCardSkeleton fields={5} textarea />
          <SettingsCardSkeleton fields={3} />
        </div>
      </div>
    </div>
  );
}
