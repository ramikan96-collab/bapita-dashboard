"use client";

import type { Booking } from "@/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/types";

interface Props {
  booking: Booking;
  onClick: (b: Booking) => void;
  last?: boolean;
}

function endTime(time: string, duration: number): string {
  const [h, m] = time.split(":").map(Number);
  const e = h * 60 + m + duration;
  return `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
}

export default function AgendaCard({ booking: b, onClick, last }: Props) {
  const color = STATUS_COLOR[b.status];
  const duration = b.service?.duration ?? 30;

  return (
    <button
      onClick={() => onClick(b)}
      className="w-full flex items-center gap-3 text-start px-4 py-3.5 hover:bg-[var(--color-cream)] active:bg-[var(--color-cream)] transition-colors"
      style={{
        borderBottom: last ? "none" : "1px solid var(--line)",
        borderInlineStart: `3px solid ${color}`,
      }}
    >
      {/* Time */}
      <div className="shrink-0 w-14">
        <div className="text-[13px] font-bold leading-none" style={{ color: "var(--color-dark)" }}>
          {b.appointment_time.slice(0, 5)}
        </div>
        <div className="text-[11px] mt-0.5 leading-none" style={{ color: "var(--color-muted)" }}>
          {endTime(b.appointment_time, duration)}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--color-dark)" }}>
          {b.customer_name}
        </div>
        {b.service?.name && (
          <div className="text-[12px] leading-tight truncate" style={{ color: "var(--color-muted)" }}>
            {b.service.name} · {duration}min
          </div>
        )}
      </div>

      {/* Status badge */}
      <div
        className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ background: `${color}1f`, color }}
      >
        {STATUS_LABEL[b.status]}
      </div>
    </button>
  );
}
