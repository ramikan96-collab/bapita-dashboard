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
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-4 py-4 border-b animate-pulse" style={{ borderColor: "var(--color-cream-2)" }}>
        <div className="h-7 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="p-4 space-y-3">
        <div className="h-12 bg-gray-100 rounded-xl"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
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
