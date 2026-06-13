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
// stroke-only, 24px, strokeWidth 1.5 per design system

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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  // sparkles — "the store of upgrades"
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"></path>
      <path d="M19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7L19 14z"></path>
    </svg>
  );
}

// Brand mark — inlined from bapita/v2/.../img/favicon.svg
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
    <span className="flex items-center gap-2">
      <BapitaMark />
      <span className="font-extrabold text-[18px] text-dark" style={{ letterSpacing: "-0.03em" }}>
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
  const [viewSectionOpen, setViewSectionOpen] = useState(false);
  const [calendarsSectionOpen, setCalendarsSectionOpen] = useState(false);
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
      {/* Root column: nav in normal flow on top, body fills the rest */}
      <div className="flex flex-col h-dvh">
      {/* ─── Desktop Top Nav ─────────────────────────────────────────── */}
      <div
        className="relative hidden md:flex h-14 shrink-0 items-center border-b z-30 px-6"
        style={{
          borderColor: "var(--line)",
          background: "var(--nav-bg)",
          backdropFilter: "var(--nav-blur)",
          WebkitBackdropFilter: "var(--nav-blur)",
        }}
      >
        {/* Hamburger — left, more breathing room */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-full text-dark hover:bg-[var(--color-cream-2)] transition-colors shrink-0"
          aria-label="Open menu"
        >
          <IconMenu size={20} />
        </button>

        {/* Tabs — absolutely centered in the bar */}
        <nav className="absolute inset-0 flex items-stretch justify-center pointer-events-none">
          <div className="flex items-stretch gap-2 pointer-events-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="relative flex items-center gap-1.5 px-5 transition-colors hover:text-dark"
                  style={{
                    color: active ? "var(--color-dark)" : "var(--color-muted)",
                    fontWeight: active ? 600 : 400,
                    fontSize: 14,
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                  {active && (
                    <span
                      className="absolute inset-x-0 bottom-0 h-[2px] rounded-t-full"
                      style={{ background: "var(--color-amber)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Spacer — pushes print to far right (ms-auto unreliable with absolute tabs) */}
        <div className="flex-1" />

        {/* Print — calendar only, far right */}
        {onCalendar && (
          <button
            onClick={() => window.print()}
            className="p-2 rounded-full text-dark hover:bg-[var(--color-cream-2)] transition-colors shrink-0"
            aria-label="Print"
          >
            <IconPrint size={18} />
          </button>
        )}
      </div>

      {/* ─── Mobile Top Bar ───────────────────────────────────────────── */}
      <div
        data-noprint
        className="md:hidden h-16 shrink-0 flex items-center px-4 border-b z-30 relative"
        style={{
          borderColor: "var(--line)",
          background: "var(--nav-bg)",
          backdropFilter: "var(--nav-blur)",
          WebkitBackdropFilter: "var(--nav-blur)",
        }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ms-2 rounded-full text-dark active:bg-[var(--color-cream-2)] transition-colors"
          aria-label="Open menu"
        >
          <IconMenu size={24} />
        </button>

        {onCalendar && chrome ? (
          searchOpen ? (
            /* Search mode — full-width input */
            <>
              <div className="flex-1 flex items-center gap-2 ms-2">
                <input
                  autoFocus
                  type="search"
                  placeholder="Search clients…"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    chrome.setSearchQuery(e.target.value);
                  }}
                  className="flex-1 h-9 px-3 rounded-xl text-[14px] outline-none border"
                  style={{
                    borderColor: "var(--color-cream-2)",
                    background: "var(--color-cream)",
                    color: "var(--color-dark)",
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchInput("");
                  chrome.setSearchQuery("");
                }}
                className="p-2 -me-2 rounded-full text-dark active:bg-[var(--color-cream-2)] transition-colors"
                aria-label="Close search"
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
              </button>
            </>
          ) : (
            /* Normal calendar top bar */
            <>
              <div className="flex-1 flex items-center justify-center px-2 overflow-hidden">
                <span className="font-semibold text-[14px] text-dark truncate text-center leading-tight">
                  {chrome.headerLabel}
                </span>
              </div>
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-full text-dark active:bg-[var(--color-cream-2)] transition-colors"
                aria-label="Search"
              >
                <IconSearch size={20} />
              </button>
              <button
                onClick={() => setFilterSheetOpen(true)}
                className="p-2 -me-2 rounded-full text-dark active:bg-[var(--color-cream-2)] transition-colors relative"
                aria-label="Filter"
              >
                <IconFilter size={20} />
                {chrome.statusFilter !== "all" && (
                  <span
                    className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full"
                    style={{ background: "var(--color-amber)" }}
                  />
                )}
              </button>
            </>
          )
        ) : (
          <>
            <div className="flex-1 flex justify-center">
              <Wordmark />
            </div>
            <div className="w-10 -me-2" />
          </>
        )}
      </div>

      {/* ─── Mobile Calendar Toolbar (calendar-only) ─────────────────── */}
      {onCalendar && chrome && (
        <div
          data-noprint
          className="md:hidden flex items-center gap-2 px-4 shrink-0 border-b z-20"
          style={{
            background: "var(--nav-bg)",
            backdropFilter: "var(--nav-blur)",
            WebkitBackdropFilter: "var(--nav-blur)",
            borderColor: "var(--line)",
            height: 52,
          }}
        >
          {/* View pill */}
          <button
            onClick={() => setViewSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full text-[14px] font-semibold transition-colors active:opacity-70"
            style={{
              height: 36,
              paddingInline: 16,
              background: "var(--color-cream-2)",
              color: "var(--color-dark)",
            }}
          >
            {calViews.find((v) => v.value === chrome.view)?.label ?? "View"}
            <IconChevronDown size={14} />
          </button>

          {/* Filter pill */}
          <button
            onClick={() => setFilterSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full text-[14px] font-semibold transition-colors active:opacity-70"
            style={{
              height: 36,
              paddingInline: 16,
              background: chrome.statusFilter !== "all" ? "var(--color-amber)" : "var(--color-cream-2)",
              color: chrome.statusFilter !== "all" ? "#fff" : "var(--color-dark)",
            }}
          >
            {chrome.statusFilter === "all"
              ? "All"
              : STATUS_LABEL[chrome.statusFilter as BookingStatus]}
            <IconChevronDown size={14} />
          </button>

          <div className="flex-1" />

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-full text-dark active:bg-[var(--color-cream-2)] transition-colors"
            aria-label="Print"
          >
            <IconPrint size={18} />
          </button>
        </div>
      )}

      {/* ─── Mobile Bottom Nav ────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 start-0 end-0 flex items-stretch border-t z-30"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-cream-2)",
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
                className="flex items-center justify-center rounded-full transition-colors"
                style={{
                  width: 44,
                  height: 28,
                  background: active ? "var(--amber-soft)" : "transparent",
                }}
              >
                <Icon />
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── FAB → New Booking (calendar-only) ────────────────────────── */}
      {onCalendar && !drawerOpen && (
        <button
          data-noprint
          onClick={() => router.push("/new-booking")}
          className="md:hidden fixed end-4 z-40 w-14 h-14 rounded-full bg-amber text-white flex items-center justify-center active:scale-95 transition-transform"
          style={{
            bottom: "calc(64px + 16px + env(safe-area-inset-bottom))",
            boxShadow: "0 4px 16px rgba(232,146,10,0.35)",
          }}
          aria-label="New booking"
        >
          <IconPlus />
        </button>
      )}

      {/* ─── Body row: sidebar + main fill remaining height ──────────── */}
      <div className="flex flex-1 min-h-0">
      {/* ─── Left Sidebar (Calendar only) ────────────────────────────── */}
      {onCalendar && chrome && (
        <aside
          className="hidden md:flex flex-col w-56 shrink-0 overflow-y-auto"
          style={{
            background: "var(--color-cream)",
            borderInlineEnd: "1px solid var(--color-cream-2)",
            paddingTop: 14,
          }}
        >
          {/* New Booking */}
          <div style={{ padding: "0 12px 12px" }}>
            <button
              onClick={() => router.push("/new-booking")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, height: 38, borderRadius: 999, background: "var(--wash-amber)",
                color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(232,146,10,0.26)", transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(232,146,10,0.34)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(232,146,10,0.26)"; }}
            >
              <IconPlus size={16} />
              New Booking
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: "0 12px 8px" }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8, height: 34,
                padding: "0 10px", borderRadius: 9, color: "var(--color-muted)",
                border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)",
              }}
            >
              <IconSearch size={14} />
              <input
                type="search"
                placeholder="Search clients…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  chrome.setSearchQuery(e.target.value);
                }}
                style={{ flex: 1, fontSize: 13, outline: "none", background: "transparent", color: "var(--color-dark)", border: "none" }}
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); chrome.setSearchQuery(""); }}
                  style={{ color: "var(--color-muted)", fontSize: 11, lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Date picker */}
          <div style={{ padding: "0 12px 12px" }}>
            <button
              onClick={chrome.openDatePicker}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, height: 34, borderRadius: 9, border: "1.5px solid var(--color-cream-2)",
                background: "transparent", color: "var(--color-dark)", fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <IconCalendar size={15} />
              {chrome.monthYear}
              <IconChevronDown size={12} />
            </button>
          </div>

          {/* ── View ──────────────────────────────────────────────────── */}
          <div style={{ height: 1, margin: "0 12px" , background: "var(--color-cream-2)" }} />
          <button
            onClick={() => setViewSectionOpen((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "var(--color-muted)", background: "transparent",
              border: "none", cursor: "pointer",
            }}
          >
            View
            <span style={{ transform: viewSectionOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex" }}>
              <IconChevronDown size={12} />
            </span>
          </button>
          {viewSectionOpen && (
            <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
              {calViews.map((v) => {
                const active = chrome.view === v.value;
                return (
                  <button
                    key={v.value}
                    onClick={() => chrome.setView(v.value)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 8px", borderRadius: 8, fontSize: 13, textAlign: "left",
                      color: active ? "var(--color-amber)" : "var(--color-dark)",
                      background: "transparent", border: "none", cursor: "pointer", transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {v.label}
                    {active && <IconCheck size={12} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Filter ────────────────────────────────────────────────── */}
          <div style={{ height: 1, margin: "0 12px", background: "var(--color-cream-2)" }} />
          <button
            onClick={() => setViewMenuOpen(!viewMenuOpen)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "var(--color-muted)", background: "transparent",
              border: "none", cursor: "pointer",
            }}
          >
            Filter
            <span style={{ transform: viewMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex" }}>
              <IconChevronDown size={12} />
            </span>
          </button>
          {viewMenuOpen && (
            <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
              {filterOptions.map((opt) => {
                const active = chrome.statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => chrome.setStatusFilter(opt.value)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 8px", borderRadius: 8, fontSize: 13, textAlign: "left",
                      color: active ? "var(--color-amber)" : "var(--color-dark)",
                      background: "transparent", border: "none", cursor: "pointer", transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span
                      style={{
                        width: 15, height: 15, borderRadius: 4, flexShrink: 0, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        border: `1.5px solid ${active ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                        background: active ? "var(--color-amber)" : "transparent",
                        transition: "all 0.12s",
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

          {/* ── Calendars ─────────────────────────────────────────────── */}
          <div style={{ height: 1, margin: "0 12px", background: "var(--color-cream-2)" }} />
          <button
            onClick={() => setCalendarsSectionOpen((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "var(--color-muted)", background: "transparent",
              border: "none", cursor: "pointer",
            }}
          >
            Calendars
            <span style={{ transform: calendarsSectionOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex" }}>
              <IconChevronDown size={12} />
            </span>
          </button>
          {calendarsSectionOpen && (
            <div style={{ padding: "0 8px 8px" }}>
              <CalendarSelectorPanel
                ownerName={businessName}
                calendarFilter={chrome.calendarFilter}
                setCalendarFilter={chrome.setCalendarFilter}
              />
              <button
                onClick={() => showToast("Multiple calendars coming soon", "info")}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 8px", borderRadius: 8, fontSize: 13, textAlign: "left",
                  color: "var(--color-muted)", background: "transparent", border: "none",
                  cursor: "pointer", marginTop: 4, transition: "background 0.12s, color 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-dark)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-muted)"; }}
              >
                <IconPlus size={13} />
                Add calendar
              </button>
            </div>
          )}

          {/* Jump to today */}
          {!chrome.isToday && (
            <>
              <div style={{ height: 1, margin: "0 12px", background: "var(--color-cream-2)" }} />
              <button
                onClick={chrome.onToday}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px", fontSize: 13,
                  fontWeight: 600, color: "var(--color-amber)", background: "transparent",
                  border: "none", cursor: "pointer", transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Jump to today
              </button>
            </>
          )}
        </aside>
      )}

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col pt-4 pb-16 md:pt-0 md:pb-0">{children}</main>
      </div>
      </div>

      {/* ─── Hamburger Drawer (slide from end/right) ──────────────────── */}
      <div
        data-noprint
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(30,26,20,0.4)" }}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <div
        data-noprint
        className={`fixed top-0 bottom-0 start-0 z-50 flex flex-col transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "min(320px, 85vw)", background: "var(--color-surface)", boxShadow: "4px 0 24px rgba(30,26,20,0.12)" }}
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Bapita wordmark at top */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
          <Wordmark />
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {drawerItemsTop.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className="w-full flex items-center gap-3 px-4 text-start text-[15px] text-dark transition-colors"
                style={{
                  height: 48,
                  background: active ? "rgba(232,146,10,0.05)" : "transparent",
                  borderInlineStart: active ? "3px solid var(--color-amber)" : "3px solid transparent",
                }}
              >
                <span style={{ color: active ? "var(--color-amber)" : "var(--color-muted)" }}>
                  <Icon />
                </span>
                {item.label}
              </button>
            );
          })}
          <div className="mx-4 my-1" style={{ height: 1, background: "var(--color-cream-2)" }} />
          {drawerItemsBottom.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className="w-full flex items-center gap-3 px-4 text-start text-[15px] text-dark transition-colors"
                style={{
                  height: 48,
                  background: active ? "rgba(232,146,10,0.05)" : "transparent",
                  borderInlineStart: active ? "3px solid var(--color-amber)" : "3px solid transparent",
                }}
              >
                <span style={{ color: active ? "var(--color-amber)" : "var(--color-muted)" }}>
                  <Icon />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Business name + sign out — bottom */}
        <div className="border-t" style={{ borderColor: "var(--color-cream-2)" }}>
          {/* Business identity */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[15px] shrink-0"
              style={{ background: "var(--color-amber)" }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-dark truncate">{businessName}</div>
              <div className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>{businessSlug}</div>
            </div>
          </div>
          {/* Sign out */}
          <div className="px-2 pb-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 rounded-xl text-start text-[15px] font-medium transition-colors hover:bg-[var(--color-cream)]"
              style={{ height: 44, color: "var(--color-cancelled)" }}
            >
              <IconLogout />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ─── Mobile Filter Sheet ──────────────────────────────────────── */}
      {filterSheetOpen && chrome && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(30,26,20,0.4)" }}
            onClick={() => setFilterSheetOpen(false)}
          />
          <div
            className="fixed bottom-0 start-0 end-0 z-50 md:hidden rounded-t-[20px]"
            style={{ background: "var(--color-surface)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mt-3 mb-4"
              style={{ background: "var(--color-cream-2)" }}
            />
            <div
              className="px-4 pb-2 text-[12px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-muted)" }}
            >
              Filter by status
            </div>
            {filterOptions.map((opt) => {
              const active = chrome.statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    chrome.setStatusFilter(opt.value);
                    setFilterSheetOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 text-[15px] text-start text-dark transition-colors active:bg-cream"
                  style={{ height: 52 }}
                >
                  {opt.label}
                  {active && (
                    <span style={{ color: "var(--color-amber)" }}>
                      <IconCheck />
                    </span>
                  )}
                </button>
              );
            })}
            {!chrome.isToday && (
              <>
                <div className="mx-4 my-1" style={{ height: 1, background: "var(--color-cream-2)" }} />
                <button
                  onClick={() => {
                    chrome.onToday();
                    setFilterSheetOpen(false);
                  }}
                  className="w-full flex items-center px-4 text-[15px] font-medium text-start transition-colors active:bg-cream"
                  style={{ height: 52, color: "var(--color-amber)" }}
                >
                  Jump to today
                </button>
              </>
            )}
            <div className="mx-4 my-1" style={{ height: 1, background: "var(--color-cream-2)" }} />
            <div
              className="px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-muted)" }}
            >
              Calendars
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

      {/* ─── Mobile View Sheet ────────────────────────────────────────── */}
      {viewSheetOpen && chrome && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(30,26,20,0.4)" }}
            onClick={() => setViewSheetOpen(false)}
          />
          <div
            className="fixed bottom-0 start-0 end-0 z-50 md:hidden rounded-t-[20px]"
            style={{ background: "var(--color-surface)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mt-3 mb-4"
              style={{ background: "var(--color-cream-2)" }}
            />
            <div
              className="px-4 pb-2 text-[12px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-muted)" }}
            >
              View
            </div>
            {calViews.map((v) => {
              const active = chrome.view === v.value;
              return (
                <button
                  key={v.value}
                  onClick={() => {
                    chrome.setView(v.value);
                    setViewSheetOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 text-[15px] text-start text-dark transition-colors active:bg-cream"
                  style={{ height: 52 }}
                >
                  {v.label}
                  {active && (
                    <span style={{ color: "var(--color-amber)" }}>
                      <IconCheck />
                    </span>
                  )}
                </button>
              );
            })}
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
