"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Icons (inline SVG, no dep) ────────────────────────────────────────────

function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconClients({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconInsights({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconAddons({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Nav config ────────────────────────────────────────────────────────────

const NAV = [
  { href: "/calendar", label: "Calendar", icon: IconCalendar },
  { href: "/clients",  label: "Clients",  icon: IconClients },
  { href: "/new-booking", label: "", icon: null }, // FAB center slot
  { href: "/insights", label: "Insights", icon: IconInsights },
  { href: "/addons",   label: "Add-ons",  icon: IconAddons },
];

const PAGE_TITLES: Record<string, string> = {
  "/calendar":    "Calendar",
  "/clients":     "Clients",
  "/insights":    "Insights",
  "/addons":      "Add-ons",
  "/settings":    "Settings",
  "/profile":     "Profile",
  "/new-booking": "New Booking",
};

// ─── Shell ─────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const supabase = createClient();

  const pageTitle = PAGE_TITLES[pathname] ?? "Bapita";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex h-full" style={{ background: "var(--color-cream)" }}>

      {/* ── Desktop left sidebar (≥1024px) ─────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col items-center py-6 gap-6 w-16 shrink-0"
        style={{ background: "var(--color-dark)" }}
      >
        {/* Logo mark */}
        <div className="mb-2">
          <span className="text-lg font-black" style={{ color: "var(--color-amber)" }}>B</span>
        </div>

        {/* Nav icons */}
        {NAV.filter((n) => n.icon !== null).map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon!;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={item.label}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
              style={{
                color: active ? "var(--color-amber)" : "rgba(255,255,255,0.45)",
                background: active ? "rgba(232,146,10,0.12)" : "transparent",
              }}
            >
              <Icon active={active} />
            </button>
          );
        })}

        {/* Spacer + Settings at bottom */}
        <div className="mt-auto flex flex-col items-center gap-4">
          <button
            onClick={() => router.push("/settings")}
            title="Settings"
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <IconSettings />
          </button>
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">

        {/* Top bar */}
        <header
          className="flex items-center px-4 h-14 shrink-0"
          style={{ background: "var(--color-dark)", color: "#fff" }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg -ml-1"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            <IconMenu />
          </button>

          <span className="flex-1 text-center text-sm font-bold tracking-wide">
            {pageTitle}
          </span>

          {/* Right placeholder keeps title visually centered */}
          <div className="w-9" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* ── Bottom nav (mobile only, <1024px) ──────────────────────── */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around px-2 z-40"
          style={{
            background: "var(--color-dark)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {NAV.map((item, i) => {
            // Center FAB (index 2)
            if (i === 2) {
              return (
                <button
                  key="fab"
                  onClick={() => router.push("/new-booking")}
                  className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg"
                  style={{ background: "var(--color-amber)", color: "#fff" }}
                >
                  <IconPlus />
                </button>
              );
            }

            const active = isActive(item.href);
            const Icon = item.icon!;

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="flex flex-col items-center gap-0.5 min-w-[48px] py-1"
                style={{ color: active ? "var(--color-amber)" : "rgba(255,255,255,0.4)" }}
              >
                <Icon active={active} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Hamburger drawer overlay ────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Drawer panel */}
          <div
            className="relative w-72 max-w-[85vw] h-full flex flex-col py-6 px-5 shadow-2xl"
            style={{ background: "var(--color-dark)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Business name */}
            <div className="mb-8">
              <span className="text-xl font-black" style={{ color: "var(--color-amber)" }}>
                bapita
              </span>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Dashboard
              </p>
            </div>

            {/* Nav links */}
            <div className="flex flex-col gap-1">
              {[
                { href: "/calendar", label: "Calendar", icon: <IconCalendar active={isActive("/calendar")} /> },
                { href: "/clients",  label: "Clients",  icon: <IconClients active={isActive("/clients")} /> },
                { href: "/insights", label: "Insights", icon: <IconInsights active={isActive("/insights")} /> },
                { href: "/addons",   label: "Add-ons",  icon: <IconAddons active={isActive("/addons")} /> },
              ].map((item) => (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); setDrawerOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors text-left"
                  style={{
                    color: isActive(item.href) ? "var(--color-amber)" : "rgba(255,255,255,0.65)",
                    background: isActive(item.href) ? "rgba(232,146,10,0.1)" : "transparent",
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Bottom actions */}
            <div
              className="mt-auto flex flex-col gap-1 pt-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <button
                onClick={() => { router.push("/settings"); setDrawerOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                <IconSettings /> Settings
              </button>
              <button
                onClick={() => { router.push("/profile"); setDrawerOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                <IconProfile /> Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold"
                style={{ color: "var(--color-terra)" }}
              >
                <IconLogout /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
