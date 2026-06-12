"use client";

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-4 py-3 border-b animate-pulse" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="h-8 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="flex-1 p-4 space-y-3">
        <div className="h-12 bg-gray-100 rounded-xl"></div>
        <div className="h-32 bg-gray-100 rounded-xl"></div>
        <div className="h-32 bg-gray-100 rounded-xl"></div>
        <div className="h-32 bg-gray-100 rounded-xl"></div>
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
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-4 py-4 border-b animate-pulse" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="h-7 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="p-4 space-y-3">
        <div className="h-28 bg-gray-100 rounded-xl"></div>
        <div className="h-28 bg-gray-100 rounded-xl"></div>
        <div className="h-40 bg-gray-100 rounded-xl"></div>
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
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-4 py-4 border-b animate-pulse" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="h-7 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-12 bg-gray-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
