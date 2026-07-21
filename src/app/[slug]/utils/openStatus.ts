import type { BusinessHours, DayKey } from "@/types";

const DAYS: DayKey[] = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

type StatusT = {
  openNow: string;
  closedOpensToday: (time: string) => string;
  closedOpens: (day: string, time: string) => string;
  closed: string;
  tomorrow: string;
};

type DaysT = Record<DayKey, string>;

function fmt(t: string, use24h: boolean) {
  const [h, m] = t.split(":").map(Number);
  if (use24h) return `${h}:${String(m).padStart(2,"0")}`;
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

// Current day-of-week + minutes-since-midnight in Israel (Asia/Jerusalem),
// independent of where this runs. Matters because the page is SSR'd on Vercel
// (UTC): computing status from server-local time would render the pill 2-3h off
// and bake the wrong open/closed state into the HTML. Israeli booking pages must
// always reflect Israeli wall-clock time.
function israelNow(): { dayIdx: number; mins: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayIdx = WD[get("weekday")] ?? new Date().getDay();
  // Intl can emit "24" for midnight under hour12:false — normalise to 0.
  const hh = (parseInt(get("hour"), 10) || 0) % 24;
  const mm = parseInt(get("minute"), 10) || 0;
  return { dayIdx, mins: hh * 60 + mm };
}

export function getOpenStatus(
  hours: BusinessHours | undefined,
  statusT: StatusT,
  daysT: DaysT,
  use24h = false,
): { open: boolean; text: string } | null {
  if (!hours) return null;
  const { dayIdx: todayIdx, mins: nowMins } = israelNow();
  const todayKey = DAYS[todayIdx];
  const todayH = hours[todayKey];

  if (todayH.open) {
    const [sh, sm] = todayH.start.split(":").map(Number);
    const [eh, em] = todayH.end.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins   = eh * 60 + em;
    if (nowMins >= startMins && nowMins < endMins) return { open: true, text: statusT.openNow };
    if (nowMins < startMins) return { open: false, text: statusT.closedOpensToday(fmt(todayH.start, use24h)) };
  }

  for (let i = 1; i <= 7; i++) {
    const nextKey = DAYS[(todayIdx + i) % 7];
    const nextH   = hours[nextKey];
    if (nextH.open) {
      const dayLabel = i === 1 ? statusT.tomorrow : daysT[nextKey];
      return { open: false, text: statusT.closedOpens(dayLabel, fmt(nextH.start, use24h)) };
    }
  }
  return { open: false, text: statusT.closed };
}

export function getInstagramHandle(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([^/?#]+)/);
  if (m) return `@${m[1].replace(/\/$/, "")}`;
  if (url.startsWith("@")) return url;
  return `@${url}`;
}

export function getCityFromAddress(address?: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map(s => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || null;
}
