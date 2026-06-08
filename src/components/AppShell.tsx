"use client"; 

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider, useToast } from "@/components/Toast";

// ─── Icons (inline SVG, no dep) ────────────────────────────────────────────

function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

function IconClients({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function IconAdd({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function IconInsights({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  );
}

function IconAddons({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"></rect>
      <rect x="14" y="3" width="7" height="7" rx="1"></rect>
      <rect x="14" y="14" width="7" height="7" rx="1"></rect>
      <rect x="3" y="14" width="7" height="7" rx="1"></rect>
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const supabase = createClient();

  const navItems = [
    { path: "/calendar", icon: IconCalendar, label: "Calendar" },
    { path: "/clients", icon: IconClients, label: "Clients" },
    { path: "/new-booking", icon: IconAdd, label: "New Booking" },
    { path: "/insights", icon: IconInsights, label: "Insights" },
    { path: "/addons", icon: IconAddons, label: "Add-ons" },
  ];

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Failed to logout", "error");
    }
  }

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 flex items-center px-4 z-10 bg-white border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <button onClick={() => setDrawerOpen(true)} className="p-2 -ml-2">
          <IconMenu />
        </button>
        <div className="flex-1 text-center font-black tracking-tight" style={{ color: "var(--color-dark)" }}>
          bapita
        </div>
        <div className="w-10" />
      </div>

      {/* Desktop Sidebar (visible on large screens) */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-20 flex-col items-center py-6 gap-6 border-r bg-white z-10" style={{ borderColor: "var(--color-cream-2)" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all"
              style={{
                background: active ? "var(--color-amber)" : "transparent",
                color: active ? "#fff" : "var(--color-muted)",
              }}
              title={item.label}
            >
              <Icon active={active} />
            </button>
          );
        })}
      </aside>

      {/* Mobile Bottom Nav (visible on small screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-white border-t z-10" style={{ borderColor: "var(--color-cream-2)" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
              style={{ color: active ? "var(--color-amber)" : "var(--color-muted)" }}
            >
              <Icon active={active} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="pt-16 pb-16 md:pb-0 md:pl-20 h-full">
        {children}
      </main>

      {/* Hamburger Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setDrawerOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-white z-30 shadow-xl flex flex-col">
            <div className="p-6 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
              <div className="font-black text-xl tracking-tight" style={{ color: "var(--color-dark)" }}>bapita</div>
              <div className="text-xs mt-1 opacity-60">Owner Dashboard</div>
            </div>
            <div className="flex-1 p-4 space-y-2">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  router.push("/settings");
                }}
                className="w-full text-left p-3 rounded-xl transition hover:bg-gray-50"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  router.push("/profile");
                }}
                className="w-full text-left p-3 rounded-xl transition hover:bg-gray-50"
              >
                👤 Profile
              </button>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  handleLogout();
                }}
                className="w-full text-left p-3 rounded-xl transition hover:bg-gray-50 text-red-500"
              >
                🚪 Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShellInner>{children}</AppShellInner>
    </ToastProvider>
  );
}
