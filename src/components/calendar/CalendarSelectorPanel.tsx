"use client";

interface Props {
  ownerName: string;
  calendarFilter: string[];
  setCalendarFilter: (ids: string[]) => void;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
      style={{
        borderColor: checked ? "var(--color-amber)" : "var(--color-cream-2)",
        background: checked ? "var(--color-amber)" : "transparent",
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

export default function CalendarSelectorPanel({
  ownerName,
  calendarFilter,
  setCalendarFilter,
}: Props) {
  const allChecked = calendarFilter.length === 0;
  const ownerChecked = allChecked || calendarFilter.includes("owner");

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setCalendarFilter([])}
        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-[13px] text-start transition-colors hover:bg-[var(--color-cream-2)]"
        style={{ color: allChecked ? "var(--color-amber)" : "var(--color-dark)" }}
      >
        <Checkbox checked={allChecked} />
        All calendars
      </button>
      <button
        onClick={() => setCalendarFilter([])}
        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-[13px] text-start transition-colors hover:bg-[var(--color-cream-2)]"
        style={{ color: ownerChecked ? "var(--color-amber)" : "var(--color-dark)" }}
      >
        <Checkbox checked={ownerChecked} />
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: "var(--color-amber)" }}
        />
        {ownerName}
      </button>
    </div>
  );
}
