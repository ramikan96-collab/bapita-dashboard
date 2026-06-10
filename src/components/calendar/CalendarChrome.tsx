"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { BookingStatus } from "@/types";

export type CalView = "day" | "week" | "month";
export type StatusFilter = BookingStatus | "all";

// State the calendar page publishes so the AppShell top bar can drive it.
export interface CalendarChrome {
  monthYear: string;
  view: CalView;
  setView: (v: CalView) => void;
  isToday: boolean;
  onToday: () => void;
  openDatePicker: () => void;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
}

interface Ctx {
  chrome: CalendarChrome | null;
  setChrome: (c: CalendarChrome | null) => void;
}

const CalendarChromeContext = createContext<Ctx | null>(null);

export function CalendarChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChrome] = useState<CalendarChrome | null>(null);
  return (
    <CalendarChromeContext.Provider value={{ chrome, setChrome }}>
      {children}
    </CalendarChromeContext.Provider>
  );
}

export function useCalendarChrome() {
  const ctx = useContext(CalendarChromeContext);
  if (!ctx) throw new Error("useCalendarChrome must be used within CalendarChromeProvider");
  return ctx;
}
