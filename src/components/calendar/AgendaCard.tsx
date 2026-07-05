"use client";

import type { Booking } from "@/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/types";

interface Props {
  booking: Booking;
  onClick: (b: Booking) => void;
}

function endTime(time: string, duration: number): string {
  const [h, m] = time.split(":").map(Number);
  const e = h * 60 + m + duration;
  return `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
}

export default function AgendaCard({ booking: b, onClick }: Props) {
  const color = STATUS_COLOR[b.status];
  const duration = b.service?.duration ?? 30;

  return (
    <button
      onClick={() => onClick(b)}
      className="group w-full flex items-stretch text-start rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Status accent rail */}
      <span className="w-1.5 shrink-0 self-stretch" style={{ background: color }} />

      {/* Time block */}
      <div className="shrink-0 flex flex-col justify-center px-4 py-4" style={{ minWidth: 72 }}>
        <div className="text-[18px] font-bold leading-none tracking-tight" style={{ color: "var(--color-dark)" }}>
          {b.appointment_time.slice(0, 5)}
        </div>
        <div className="text-[12px] mt-1 leading-none font-medium" style={{ color: "var(--color-muted)" }}>
          {endTime(b.appointment_time, duration)}
        </div>
      </div>

      {/* Perforation divider */}
      <span className="w-px self-stretch my-3 shrink-0" style={{ background: "var(--line)" }} />

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-4">
        <div className="text-[16px] font-semibold leading-snug truncate" style={{ color: "var(--color-dark)" }}>
          {b.customer_name}
        </div>
        {b.service?.name && (
          <div className="text-[13px] mt-0.5 leading-snug truncate" style={{ color: "var(--color-muted)" }}>
            {b.service.name} · {duration}min
          </div>
        )}
      </div>

      {/* Status + affordance */}
      <div className="shrink-0 flex items-center gap-2 pe-4 py-4">
        <span
          className="px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap"
          style={{ background: `${color}1f`, color }}
        >
          {STATUS_LABEL[b.status]}
        </span>
        <svg
          className="opacity-40 group-hover:opacity-70 transition-opacity rtl:rotate-180"
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}
