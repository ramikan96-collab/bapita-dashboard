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

function IconUsage({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
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
  { path: "/financials", icon: IconFinancials, label: "Financials" },
] as const;

const drawerItems = [
  { path: "/settings", icon: IconSettings, label: "Settings" },
  { path: "/addons", icon: IconExtras, label: "Extras" },
  { path: "/usage", icon: IconUsage, label: "Usage" },
  { path: "/profile", icon: IconProfile, label: "Profile" },
] as const;

const calViews: { value: CalView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...(["pending", "confirmed", "completed", "cancelled", "no_show"] as BookingStatus[]).map(
    (s) => ({ value: s as StatusFilter, label: STATUS_LABEL[s] })
  ),
];

// ─── Calendar ⋮ menu ─────────────────────────────────────────────────────

function CalendarViewMenu({
  chrome,
  onClose,
  onSettings,
}: {
  chrome: NonNullable<ReturnType<typeof useCalendarChrome>["chrome"]>;
  onClose: () => void;
  onSettings: () => void;
}) {
  return (
    <>
      {/* outside-click catcher */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="absolute top-14 end-2 z-40 w-56 bg-white rounded-2xl py-2"
        style={{ boxShadow: "0 8px 32px rgba(30,26,20,0.16)" }}
        role="menu"
      >
        {/* View toggle */}
        <div className="px-2 pb-2">
          <div className="flex rounded-full p-0.5" style={{ background: "var(--color-cream-2)" }}>
            {calViews.map((v) => {
              const active = chrome.view === v.value;
              return (
                <button
                  key={v.value}
                  onClick={() => {
                    chrome.setView(v.value);
                    onClose();
                  }}
                  className="flex-1 py-1.5 rounded-full text-[13px] font-bold transition-colors"
                  style={{
                    background: active ? "var(--color-amber)" : "transparent",
                    color: active ? "#fff" : "var(--color-muted)",
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px mx-2 my-1" style={{ background: "var(--color-cream-2)" }} />

        {/* Status filter */}
        <div className="px-3 pt-1 pb-1 text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>
          Filter
        </div>
        {filterOptions.map((opt) => {
          const active = chrome.statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                chrome.setStatusFilter(opt.value);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[14px] text-start text-dark hover:bg-cream transition-colors"
              role="menuitemradio"
              aria-checked={active}
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

        <div className="h-px mx-2 my-1" style={{ background: "var(--color-cream-2)" }} />

        {!chrome.isToday && (
          <button
            onClick={() => {
              chrome.onToday();
              onClose();
            }}
            className="w-full px-3 py-2 text-[14px] text-start text-dark hover:bg-cream transition-colors"
          >
            Jump to today
          </button>
        )}
        <button
          onClick={() => {
            onSettings();
            onClose();
          }}
          className="w-full px-3 py-2 text-[14px] text-start text-dark hover:bg-cream transition-colors"
        >
          Calendar settings
        </button>
      </div>
    </>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { business } = useBusiness();
  const { chrome } = useCalendarChrome();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [mobileCalMenuOpen, setMobileCalMenuOpen] = useState(false);
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
      {/* ─── Desktop Top Nav with underline indicator ─────────────────── */}
      <div
        className="hidden md:flex h-14 shrink-0 items-center border-b z-30 px-6"
        style={{
          borderColor: "var(--line)",
          background: "var(--nav-bg)",
          backdropFilter: "var(--nav-blur)",
          WebkitBackdropFilter: "var(--nav-blur)",
        }}
      >
        {/* Logo */}
        <div className="w-40">
          <Wordmark />
        </div>

        {/* Centered pill tabs */}
        <nav className="flex-1 flex justify-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-colors ${
                  active
                    ? "text-dark"
                    : "text-muted hover:text-dark hover:bg-[var(--color-cream-2)]"
                }`}
                style={active ? { background: "var(--amber-soft)" } : undefined}
              >
                <Icon size={16} />
                <span className="text-[13px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Hamburger menu - far right */}
        <div className="w-40 flex justify-end">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-full text-dark hover:bg-[var(--color-cream-2)] transition-colors"
            aria-label="Open menu"
          >
            <IconMenu size={20} />
          </button>
        </div>
      </div>

      {/* ─── Mobile Top Bar ───────────────────────────────────────────── */}
      <div
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
          <>
            <button
              onClick={chrome.openDatePicker}
              className="flex-1 flex items-center justify-center gap-1.5 py-2"
              aria-label="Pick date"
            >
              <span className="font-bold text-[16px] text-dark">{chrome.monthYear}</span>
              <span className="text-muted">
                <IconChevronDown size={14} />
              </span>
            </button>
            <button
              onClick={() => setMobileCalMenuOpen((v) => !v)}
              className="p-2 -me-2 rounded-full text-dark active:bg-[var(--color-cream-2)] transition-colors"
              aria-label="Calendar options"
            >
              <IconMore size={24} />
            </button>
            {mobileCalMenuOpen && (
              <CalendarViewMenu
                chrome={chrome}
                onClose={() => setMobileCalMenuOpen(false)}
                onSettings={() => router.push("/settings")}
              />
            )}
          </>
        ) : (
          <>
            <div className="flex-1 flex justify-center">
              <Wordmark />
            </div>
            <div className="w-10 -me-2" />
          </>
        )}
      </div>

      {/* ─── Mobile Bottom Nav ────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 start-0 end-0 flex items-stretch bg-white border-t z-30"
        style={{
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
          className="hidden md:flex flex-col w-56 shrink-0 border-e overflow-y-auto"
          style={{
            background: "var(--color-cream)",
            borderColor: "var(--color-cream-2)",
            paddingTop: 12,
          }}
        >
          {/* +Create button */}
          <div className="px-3 pb-4">
            <button
              onClick={() => router.push("/new-booking")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-white font-bold text-[14px] transition-all hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_2px_6px_rgba(30,26,20,0.10)] hover:shadow-[0_12px_30px_rgba(232,146,10,0.32)]"
              style={{ background: "var(--wash-amber)" }}
            >
              <IconPlus size={18} />
              New Booking
            </button>
          </div>

          {/* Mini calendar / date picker */}
          <div className="px-3 pb-4">
            <button
              onClick={chrome.openDatePicker}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-full border text-[14px] font-medium transition-colors hover:bg-cream"
              style={{ borderColor: "var(--color-cream-2)", color: "var(--color-dark)" }}
            >
              <IconCalendar size={16} />
              {chrome.monthYear}
              <IconChevronDown size={14} />
            </button>
          </div>

          <div className="h-px mx-3 my-1" style={{ background: "var(--color-cream-2)" }} />

          {/* View toggles */}
          <div className="px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-muted)" }}>
              View
            </div>
            <div className="flex rounded-full p-0.5" style={{ background: "var(--color-cream-2)" }}>
              {calViews.map((v) => {
                const active = chrome.view === v.value;
                return (
                  <button
                    key={v.value}
                    onClick={() => chrome.setView(v.value)}
                    className="flex-1 py-2 rounded-full text-[13px] font-bold transition-colors"
                    style={{
                      background: active ? "var(--color-amber)" : "transparent",
                      color: active ? "#fff" : "var(--color-muted)",
                    }}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px mx-3 my-1" style={{ background: "var(--color-cream-2)" }} />

          {/* Status filter - collapsible */}
          <div className="px-3 py-3">
            <button
              onClick={() => setViewMenuOpen(!viewMenuOpen)}
              className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide mb-2 transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              Filter
              <span style={{ transform: viewMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <IconChevronDown size={12} />
              </span>
            </button>
            {viewMenuOpen && (
              <div className="space-y-0.5 mt-1">
                {filterOptions.map((opt) => {
                  const active = chrome.statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => chrome.setStatusFilter(opt.value)}
                      className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-[13px] text-start transition-colors hover:bg-cream-2"
                      style={{
                        color: active ? "var(--color-amber)" : "var(--color-dark)",
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          borderColor: active ? "var(--color-amber)" : "var(--color-cream-2)",
                          background: active ? "var(--color-amber)" : "transparent",
                        }}
                      >
                        {active && (
                          <span style={{ color: "#fff" }}>
                            <IconCheck size={10} />
                          </span>
                        )}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Jump to today */}
          {!chrome.isToday && (
            <>
              <div className="h-px mx-3 my-1" style={{ background: "var(--color-cream-2)" }} />
              <div className="px-3 py-2">
                <button
                  onClick={chrome.onToday}
                  className="w-full px-3 py-2 rounded-xl text-[13px] font-medium text-start transition-colors hover:bg-cream-2"
                  style={{ color: "var(--color-amber)" }}
                >
                  Jump to today
                </button>
              </div>
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
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(30,26,20,0.4)" }}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <div
        className={`fixed top-0 bottom-0 end-0 z-50 bg-white flex flex-col transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "min(320px, 85vw)", boxShadow: "-4px 0 24px rgba(30,26,20,0.12)" }}
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Business header */}
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-[18px] shrink-0"
            style={{ background: "var(--color-amber)" }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-[18px] font-bold text-dark truncate">{businessName}</div>
            <div className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
              {businessSlug}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {drawerItems.map((item) => {
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

        {/* Sign out */}
        <div className="border-t p-2" style={{ borderColor: "var(--color-cream-2)" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 rounded-xl text-start text-[15px] font-medium transition-colors hover:bg-cream"
            style={{ height: 48, color: "var(--color-cancelled)" }}
          >
            <IconLogout />
            Sign out
          </button>
        </div>
      </div>
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
