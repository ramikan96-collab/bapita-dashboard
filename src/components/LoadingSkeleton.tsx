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
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <div className="shrink-0 px-4 py-4 border-b animate-pulse" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="h-7 rounded w-24" style={{ background: "var(--color-cream-2)" }}></div>
      </div>
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-28 rounded-xl" style={{ background: "var(--color-cream-2)" }}></div>
        <div className="h-28 rounded-xl" style={{ background: "var(--color-cream-2)" }}></div>
        <div className="h-40 rounded-xl" style={{ background: "var(--color-cream-2)" }}></div>
      </div>
    </div>
  );
}

export function FinancialsSkeleton() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <div className="shrink-0 px-4 pt-5 pb-4 border-b bg-white animate-pulse" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="h-8 rounded w-28" style={{ background: "var(--color-cream-2)" }}></div>
      </div>
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-32 rounded-2xl bg-white" style={{ boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)" }}></div>
        <div className="h-40 rounded-2xl bg-white" style={{ boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)" }}></div>
        <div className="h-56 rounded-2xl bg-white" style={{ boxShadow: "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)" }}></div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <div className="shrink-0 px-4 py-4 border-b animate-pulse" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="h-7 rounded w-24" style={{ background: "var(--color-cream-2)" }}></div>
      </div>
      <div className="p-4 space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-4 rounded w-32 mb-2" style={{ background: "var(--color-cream-2)" }}></div>
            <div className="h-12 rounded-xl" style={{ background: "var(--color-cream)" }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
