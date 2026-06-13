"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider, useToast } from "@/components/Toast";
import { useBusiness } from "@/hooks/useBusiness";
import {
  CalendarChromeProvider,
  useCalendarChrome,
  type CalView,
  type StatusFilter,
} from "@/components/calendar/CalendarChrome";
import CalendarSelectorPanel from "@/components/calendar/CalendarSelectorPanel";
import { STATUS_LABEL, type BookingStatus } from "@/types";

// ─── Icons (inline SVG, no dep) ────────────────────────────────────────────
type IconProps = { size?: number };

function IconCalendar({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

function IconClients({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function IconInsights({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  );
}

function IconFinancials({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"></rect>
      <line x1="2" y1="10" x2="22" y2="10"></line>
    </svg>
  );
}

function IconMenu({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function IconPlus({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function IconChevronDown({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function IconMore({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  );
}

function IconFilter({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
  );
}

function IconSearch({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function IconPrint({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
  );
}

function IconCheck({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function IconSettings({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}

function IconProfile({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function IconLogout({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
}

function IconExtras({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"></path>
      <path d="M19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7L19 14z"></path>
    </svg>
  );
}

function IconClose({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

// Brand mark
function BapitaMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 90) / 110} viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M8 16 Q8 86 55 86 Q102 86 102 16 Z" fill="#E8920A" />
      <rect x="8" y="6" width="94" height="14" rx="7" fill="#B86800" />
      <path d="M18 34 Q55 52 92 34" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M24 56 Q55 72 86 56" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55" />
    </svg>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <BapitaMark size={24} />
      <span
        className="font-bold text-[17px]"
        style={{ letterSpacing: "-0.04em", color: "var(--color-dark)" }}
      >
        bapita
      </span>
    </span>
  );
}

// ─── Nav config ────────────────────────────────────────────────────────────

const navItems = [
  { path: "/calendar", icon: IconCalendar, label: "Calendar" },
  { path: "/clients", icon: IconClients, label: "Clients" },
  { path: "/insights", icon: IconInsights, label: "Insights" },
  { path: "/extras", icon: IconExtras, label: "Extras" },
] as const;

const drawerItemsTop = [
  { path: "/settings", icon: IconSettings, label: "Settings" },
  { path: "/financials", icon: IconFinancials, label: "Financials" },
] as const;

const drawerItemsBottom = [
  { path: "/profile", icon: IconProfile, label: "Profile" },
] as const;

const calViews: { value: CalView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "agenda", label: "Agenda" },
];

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...(["pending", "confirmed", "completed", "cancelled", "no_show"] as BookingStatus[]).map(
    (s) => ({ value: s as StatusFilter, label: STATUS_LABEL[s] })
  ),
];

// ─── Shell ───────────────────────────────────────────────────────────────

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { business } = useBusiness();
  const { chrome } = useCalendarChrome();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewSectionOpen, setViewSectionOpen] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const supabase = createClient();

  const onCalendar = pathname === "/calendar";
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  async function handleLogout() {
    setDrawerOpen(false);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Failed to sign out", "error");
    }
  }

  function go(path: string) {
    setDrawerOpen(false);
    router.push(path);
  }

  const businessName = business?.name ?? "My Business";
  const businessSlug = business?.slug ? `${business.slug}.bapita.com` : "bapita.com";
  const initial = businessName.trim().charAt(0).toUpperCase() || "B";

  return (
    <>
      <div className="flex flex-col h-dvh">

        {/* ─── Desktop Top Nav ───────────────────────────────────────────── */}
        <header
          className="relative hidden md:flex h-[56px] shrink-0 items-center border-b z-30"
          style={{
            borderColor: "var(--line)",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Left: hamburger + wordmark */}
          <div className="flex items-center gap-3 pl-5 pr-4 shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--color-cream-2)]"
              style={{ color: "var(--color-dark)" }}
              aria-label="Open menu"
            >
              <IconMenu size={18} />
            </button>
            <Wordmark />
          </div>

          {/* Hairline separator */}
          <div className="w-px h-5 shrink-0" style={{ background: "var(--line)" }} />

          {/* Center: nav tabs — absolutely centered in header */}
          <nav className="absolute inset-0 flex items-stretch justify-center pointer-events-none">
            <div className="flex items-stretch gap-0.5 pointer-events-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className="relative flex items-center gap-2 px-4 text-[13.5px] font-medium transition-colors rounded-lg mx-0.5 my-2"
                    style={{
                      color: active ? "var(--color-dark)" : "var(--color-muted)",
                      background: active ? "var(--color-cream)" : "transparent",
                      fontWeight: active ? 600 : 450,
                    }}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right: print */}
          <div className="flex-1" />
          {onCalendar && (
            <div className="pr-4 shrink-0">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--color-cream-2)]"
                style={{ color: "var(--color-muted)" }}
                aria-label="Print"
              >
                <IconPrint size={17} />
              </button>
            </div>
          )}
        </header>

        {/* ─── Mobile Top Bar ────────────────────────────────────────────── */}
        <header
          data-noprint
          className="md:hidden shrink-0 flex items-center z-30 relative border-b"
          style={{
            height: 60,
            paddingInline: 16,
            borderColor: "var(--line)",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Hamburger — 16px from edge, no negative margin trick */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors active:bg-[var(--color-cream-2)]"
            style={{ color: "var(--color-dark)", marginInlineStart: -4 }}
            aria-label="Open menu"
          >
            <IconMenu size={22} />
          </button>

          {onCalendar && chrome ? (
            searchOpen ? (
              <>
                <div className="flex-1 flex items-center gap-2 mx-2">
                  <div
                    className="flex-1 flex items-center gap-2 h-9 px-3 rounded-xl"
                    style={{ background: "var(--color-cream)", border: "1px solid var(--line)" }}
                  >
                    <IconSearch size={14} style={{ color: "var(--color-muted)" }} />
                    <input
                      autoFocus
                      type="search"
                      placeholder="Search clients…"
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        chrome.setSearchQuery(e.target.value);
                      }}
                      className="flex-1 text-[14px] outline-none bg-transparent"
                      style={{ color: "var(--color-dark)" }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchInput("");
                    chrome.setSearchQuery("");
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-[13px] font-medium transition-colors active:bg-[var(--color-cream-2)]"
                  style={{ color: "var(--color-muted)", marginInlineEnd: -4 }}
                  aria-label="Close search"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 flex items-center justify-center px-2 overflow-hidden">
                  <span className="font-semibold text-[15px] truncate text-center" style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}>
                    {chrome.headerLabel}
                  </span>
                </div>
                <div className="flex items-center gap-0.5" style={{ marginInlineEnd: -4 }}>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors active:bg-[var(--color-cream-2)]"
                    style={{ color: "var(--color-muted)" }}
                    aria-label="Search"
                  >
                    <IconSearch size={20} />
                  </button>
                  <button
                    onClick={() => setFilterSheetOpen(true)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors active:bg-[var(--color-cream-2)] relative"
                    style={{ color: "var(--color-muted)" }}
                    aria-label="Filter"
                  >
                    <IconFilter size={18} />
                    {chrome.statusFilter !== "all" && (
                      <span
                        className="absolute top-2 end-2 w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--color-amber)" }}
                      />
                    )}
                  </button>
                </div>
              </>
            )
          ) : (
            <>
              <div className="flex-1 flex justify-center">
                <Wordmark />
              </div>
              <div className="w-10" />
            </>
          )}
        </header>

        {/* ─── Mobile Calendar Toolbar ────────────────────────────────────── */}
        {onCalendar && chrome && (
          <div
            data-noprint
            className="md:hidden flex items-center gap-2 px-4 shrink-0 border-b z-20"
            style={{
              background: "var(--color-cream)",
              borderColor: "var(--line)",
              height: 48,
            }}
          >
            {/* View pill */}
            <button
              onClick={() => setViewSheetOpen(true)}
              className="flex items-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors active:opacity-70"
              style={{
                height: 32,
                paddingInline: 12,
                background: "#fff",
                color: "var(--color-dark)",
                border: "1px solid var(--line)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              {calViews.find((v) => v.value === chrome.view)?.label ?? "View"}
              <IconChevronDown size={12} />
            </button>

            {/* Filter pill */}
            <button
              onClick={() => setFilterSheetOpen(true)}
              className="flex items-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors active:opacity-70"
              style={{
                height: 32,
                paddingInline: 12,
                background: chrome.statusFilter !== "all" ? "var(--color-amber)" : "#fff",
                color: chrome.statusFilter !== "all" ? "#fff" : "var(--color-dark)",
                border: chrome.statusFilter !== "all" ? "1px solid transparent" : "1px solid var(--line)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              {chrome.statusFilter === "all"
                ? "All status"
                : STATUS_LABEL[chrome.statusFilter as BookingStatus]}
              <IconChevronDown size={12} />
            </button>

            <div className="flex-1" />

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors active:bg-[var(--color-cream-2)]"
              style={{ color: "var(--color-muted)" }}
              aria-label="Print"
            >
              <IconPrint size={16} />
            </button>
          </div>
        )}

        {/* ─── Mobile Bottom Nav ─────────────────────────────────────────── */}
        <nav
          className="md:hidden fixed bottom-0 start-0 end-0 flex items-stretch z-30 border-t"
          style={{
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "var(--line)",
            height: 64,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center justify-center flex-1 gap-1 transition-colors"
                style={{ color: active ? "var(--color-amber)" : "var(--color-muted)" }}
              >
                <span
                  className="flex items-center justify-center rounded-lg transition-all"
                  style={{
                    width: 40,
                    height: 26,
                    background: active ? "rgba(232,146,10,0.1)" : "transparent",
                  }}
                >
                  <Icon size={active ? 22 : 21} />
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ fontWeight: active ? 600 : 400 }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ─── FAB → New Booking ─────────────────────────────────────────── */}
        {onCalendar && !drawerOpen && (
          <button
            data-noprint
            onClick={() => router.push("/new-booking")}
            className="md:hidden fixed end-4 z-40 flex items-center justify-center rounded-2xl text-white active:scale-95 transition-transform"
            style={{
              width: 56,
              height: 56,
              bottom: "calc(64px + 16px + env(safe-area-inset-bottom))",
              background: "var(--color-amber)",
              boxShadow: "0 4px 20px rgba(232,146,10,0.40), 0 1px 4px rgba(0,0,0,0.08)",
            }}
            aria-label="New booking"
          >
            <IconPlus size={22} />
          </button>
        )}

        {/* ─── Body: sidebar + main ──────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* ─── Left Sidebar (Calendar only, desktop) ───────────────────── */}
          {onCalendar && chrome && (
            <aside
              className="hidden md:flex flex-col w-[220px] shrink-0 border-e overflow-y-auto"
              style={{
                background: "var(--color-cream)",
                borderColor: "var(--line)",
                paddingTop: 16,
              }}
            >
              {/* + New Booking */}
              <div className="px-3 pb-4">
                <button
                  onClick={() => router.push("/new-booking")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-[13.5px] transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    height: 38,
                    background: "var(--color-amber)",
                    boxShadow: "0 1px 3px rgba(232,146,10,0.30), 0 4px 12px rgba(232,146,10,0.18)",
                  }}
                >
                  <IconPlus size={16} />
                  New Booking
                </button>
              </div>

              {/* Search */}
              <div className="px-3 pb-3">
                <div
                  className="flex items-center gap-2 h-9 px-3 rounded-xl"
                  style={{
                    background: "#fff",
                    border: "1px solid var(--line)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <span style={{ color: "var(--color-muted)" }}><IconSearch size={13} /></span>
                  <input
                    type="search"
                    placeholder="Search clients…"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      chrome.setSearchQuery(e.target.value);
                    }}
                    className="flex-1 text-[13px] outline-none bg-transparent"
                    style={{ color: "var(--color-dark)" }}
                  />
                  {searchInput && (
                    <button
                      onClick={() => {
                        setSearchInput("");
                        chrome.setSearchQuery("");
                      }}
                      className="flex items-center justify-center w-4 h-4 rounded-full transition-colors hover:bg-[var(--color-cream-2)]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      <IconClose size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* Date picker button */}
              <div className="px-3 pb-4">
                <button
                  onClick={chrome.openDatePicker}
                  className="w-full flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors hover:bg-[var(--color-cream-2)]"
                  style={{
                    height: 34,
                    background: "#fff",
                    border: "1px solid var(--line)",
                    color: "var(--color-dark)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <IconCalendar size={14} />
                  {chrome.monthYear}
                  <IconChevronDown size={12} />
                </button>
              </div>

              <div className="h-px mx-3" style={{ background: "var(--line)" }} />

              {/* View section */}
              <div className="px-3 pt-4 pb-2">
                <button
                  onClick={() => setViewSectionOpen((v) => !v)}
                  className="w-full flex items-center justify-between mb-2 px-1 transition-colors"
                  style={{ color: "var(--color-muted)" }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider">View</span>
                  <span style={{ transform: viewSectionOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                    <IconChevronDown size={11} />
                  </span>
                </button>
                {viewSectionOpen && (
                  <div className="space-y-0.5">
                    {calViews.map((v) => {
                      const active = chrome.view === v.value;
                      return (
                        <button
                          key={v.value}
                          onClick={() => chrome.setView(v.value)}
                          className="w-full flex items-center justify-between px-2.5 rounded-lg text-[13px] text-start transition-colors hover:bg-[var(--color-cream-2)]"
                          style={{
                            height: 34,
                            color: active ? "var(--color-amber)" : "var(--color-dark)",
                            background: active ? "rgba(232,146,10,0.07)" : "transparent",
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {v.label}
                          {active && <IconCheck size={13} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="h-px mx-3 mt-2" style={{ background: "var(--line)" }} />

              {/* Filter section */}
              <div className="px-3 pt-4 pb-2">
                <button
                  onClick={() => setViewMenuOpen(!viewMenuOpen)}
                  className="w-full flex items-center justify-between mb-2 px-1 transition-colors"
                  style={{ color: "var(--color-muted)" }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Filter</span>
                  <span style={{ transform: viewMenuOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                    <IconChevronDown size={11} />
                  </span>
                </button>
                {viewMenuOpen && (
                  <div className="space-y-0.5">
                    {filterOptions.map((opt) => {
                      const active = chrome.statusFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => chrome.setStatusFilter(opt.value)}
                          className="w-full flex items-center gap-2.5 px-2.5 rounded-lg text-[13px] text-start transition-colors hover:bg-[var(--color-cream-2)]"
                          style={{
                            height: 34,
                            color: active ? "var(--color-amber)" : "var(--color-dark)",
                            background: active ? "rgba(232,146,10,0.07)" : "transparent",
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors"
                            style={{
                              border: active ? "none" : "1.5px solid var(--line)",
                              background: active ? "var(--color-amber)" : "transparent",
                            }}
                          >
                            {active && <IconCheck size={9} />}
                          </span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="h-px mx-3 mt-2" style={{ background: "var(--line)" }} />

              {/* Calendars */}
              <div className="px-3 pt-4 pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2" style={{ color: "var(--color-muted)" }}>
                  Calendars
                </p>
                <CalendarSelectorPanel
                  ownerName={businessName}
                  calendarFilter={chrome.calendarFilter}
                  setCalendarFilter={chrome.setCalendarFilter}
                />
              </div>

              {/* Jump to today */}
              {!chrome.isToday && (
                <>
                  <div className="h-px mx-3 mt-2" style={{ background: "var(--line)" }} />
                  <div className="px-3 py-3">
                    <button
                      onClick={chrome.onToday}
                      className="w-full flex items-center px-2.5 rounded-lg text-[13px] font-semibold transition-colors hover:bg-[rgba(232,146,10,0.07)]"
                      style={{ height: 34, color: "var(--color-amber)" }}
                    >
                      Jump to today
                    </button>
                  </div>
                </>
              )}
            </aside>
          )}

          {/* ─── Main Content ───────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 flex flex-col pt-4 pb-16 md:pt-0 md:pb-0">{children}</main>
        </div>
      </div>

      {/* ─── Drawer Backdrop ───────────────────────────────────────────────── */}
      <div
        data-noprint
        className={`fixed inset-0 z-40 transition-opacity duration-250 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(15,12,8,0.45)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      {/* ─── Hamburger Drawer ──────────────────────────────────────────────── */}
      <div
        data-noprint
        className={`fixed top-0 bottom-0 start-0 z-50 flex flex-col transition-transform duration-250 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "min(300px, 84vw)",
          background: "#fff",
          boxShadow: "6px 0 32px rgba(15,12,8,0.10), 1px 0 0 var(--line)",
        }}
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 border-b"
          style={{ height: 60, borderColor: "var(--line)" }}
        >
          <Wordmark />
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--color-cream)]"
            style={{ color: "var(--color-muted)" }}
            aria-label="Close menu"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="px-2 pt-1 pb-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>
              Menu
            </p>
            {drawerItemsTop.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-3 rounded-xl text-start text-[14px] transition-colors hover:bg-[var(--color-cream)]"
                  style={{
                    height: 46,
                    color: active ? "var(--color-amber)" : "var(--color-dark)",
                    background: active ? "rgba(232,146,10,0.07)" : "transparent",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span style={{ color: active ? "var(--color-amber)" : "var(--color-muted)" }}>
                    <Icon size={18} />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mx-4 my-1" style={{ height: 1, background: "var(--line)" }} />

          <div className="px-2 pt-2 pb-1">
            {drawerItemsBottom.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-3 rounded-xl text-start text-[14px] transition-colors hover:bg-[var(--color-cream)]"
                  style={{
                    height: 46,
                    color: active ? "var(--color-amber)" : "var(--color-dark)",
                    background: active ? "rgba(232,146,10,0.07)" : "transparent",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span style={{ color: active ? "var(--color-amber)" : "var(--color-muted)" }}>
                    <Icon size={18} />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Drawer footer: business identity + sign out */}
        <div className="border-t" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[15px] shrink-0"
              style={{ background: "var(--color-amber)" }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold truncate" style={{ color: "var(--color-dark)", letterSpacing: "-0.01em" }}>
                {businessName}
              </div>
              <div className="text-[11.5px] truncate" style={{ color: "var(--color-muted)" }}>
                {businessSlug}
              </div>
            </div>
          </div>
          <div className="px-2 pb-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 rounded-xl text-start text-[14px] font-medium transition-colors hover:bg-[var(--color-cream)]"
              style={{ height: 44, color: "var(--color-cancelled)" }}
            >
              <IconLogout size={17} />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ─── Mobile Filter Sheet ───────────────────────────────────────────── */}
      {filterSheetOpen && chrome && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(15,12,8,0.45)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
            onClick={() => setFilterSheetOpen(false)}
          />
          <div
            className="fixed bottom-0 start-0 end-0 z-50 md:hidden rounded-t-2xl"
            style={{
              background: "#fff",
              paddingBottom: "env(safe-area-inset-bottom)",
              boxShadow: "0 -4px 32px rgba(15,12,8,0.10)",
            }}
          >
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "var(--line)" }} />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <span className="text-[16px] font-semibold" style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}>
                Filter
              </span>
              <button
                onClick={() => setFilterSheetOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-colors active:bg-[var(--color-cream-2)]"
                style={{ color: "var(--color-muted)" }}
              >
                <IconClose size={16} />
              </button>
            </div>
            <div className="px-2 pb-2">
              {filterOptions.map((opt) => {
                const active = chrome.statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      chrome.setStatusFilter(opt.value);
                      setFilterSheetOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 rounded-xl text-[15px] text-start transition-colors active:bg-[var(--color-cream)]"
                    style={{
                      height: 50,
                      color: active ? "var(--color-amber)" : "var(--color-dark)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {opt.label}
                    {active && (
                      <span style={{ color: "var(--color-amber)" }}>
                        <IconCheck size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!chrome.isToday && (
              <>
                <div className="mx-4 my-1" style={{ height: 1, background: "var(--line)" }} />
                <div className="px-2 pb-2">
                  <button
                    onClick={() => {
                      chrome.onToday();
                      setFilterSheetOpen(false);
                    }}
                    className="w-full flex items-center px-4 rounded-xl text-[15px] font-semibold text-start transition-colors active:bg-[rgba(232,146,10,0.07)]"
                    style={{ height: 50, color: "var(--color-amber)" }}
                  >
                    Jump to today
                  </button>
                </div>
              </>
            )}
            <div className="mx-4 my-1" style={{ height: 1, background: "var(--line)" }} />
            <div className="px-5 pt-3 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>
                Calendars
              </p>
            </div>
            <div className="px-2 pb-2">
              <CalendarSelectorPanel
                ownerName={businessName}
                calendarFilter={chrome.calendarFilter}
                setCalendarFilter={chrome.setCalendarFilter}
              />
            </div>
            <div className="h-4" />
          </div>
        </>
      )}

      {/* ─── Mobile View Sheet ─────────────────────────────────────────────── */}
      {viewSheetOpen && chrome && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(15,12,8,0.45)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
            onClick={() => setViewSheetOpen(false)}
          />
          <div
            className="fixed bottom-0 start-0 end-0 z-50 md:hidden rounded-t-2xl"
            style={{
              background: "#fff",
              paddingBottom: "env(safe-area-inset-bottom)",
              boxShadow: "0 -4px 32px rgba(15,12,8,0.10)",
            }}
          >
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "var(--line)" }} />
            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <span className="text-[16px] font-semibold" style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}>
                View
              </span>
              <button
                onClick={() => setViewSheetOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-colors active:bg-[var(--color-cream-2)]"
                style={{ color: "var(--color-muted)" }}
              >
                <IconClose size={16} />
              </button>
            </div>
            <div className="px-2 pb-2">
              {calViews.map((v) => {
                const active = chrome.view === v.value;
                return (
                  <button
                    key={v.value}
                    onClick={() => {
                      chrome.setView(v.value);
                      setViewSheetOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 rounded-xl text-[15px] text-start transition-colors active:bg-[var(--color-cream)]"
                    style={{
                      height: 50,
                      color: active ? "var(--color-amber)" : "var(--color-dark)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {v.label}
                    {active && (
                      <span style={{ color: "var(--color-amber)" }}>
                        <IconCheck size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="h-4" />
          </div>
        </>
      )}
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CalendarChromeProvider>
        <AppShellInner>{children}</AppShellInner>
      </CalendarChromeProvider>
    </ToastProvider>
  );
}
