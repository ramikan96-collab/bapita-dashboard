"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider, useToast } from "@/components/Toast";
import { useBusiness } from "@/hooks/useBusiness";
import {
  CalendarChromeProvider,
  useCalendarChrome,
  type CalView,
} from "@/components/calendar/CalendarChrome";
import CalendarSelectorPanel from "@/components/calendar/CalendarSelectorPanel";
import { STATUS_LABEL, type BookingStatus } from "@/types";
import { LangProvider } from "@/i18n";
import { translate, type DashboardLang } from "@/i18n/dict";
import { useNotifications } from "@/hooks/useNotifications";
import { enablePush, disablePush, usePushStatus } from "@/components/PushInit";

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

function IconSupport({ size = 20 }: IconProps) {
  // life-buoy
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="4"></circle>
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line>
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line>
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line>
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line>
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

function IconAdmin({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  );
}

function IconBell({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  );
}

function IconXSmall({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

function IconRefresh({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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
] as const;

const drawerItemsTop = [
  { path: "/extras", icon: IconExtras, label: "Extras" },
  { path: "/settings", icon: IconSettings, label: "Settings" },
  { path: "/financials", icon: IconFinancials, label: "Financials" },
] as const;

const drawerItemsBottom = [
  { path: "/profile", icon: IconProfile, label: "Profile" },
  { path: "/support", icon: IconSupport, label: "Support" },
] as const;

const calViews: { value: CalView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "agenda", label: "Agenda" },
];

const filterStatuses = (["pending", "confirmed", "completed", "cancelled", "no_show"] as BookingStatus[]);
const filterOptions: { value: BookingStatus; label: string }[] = filterStatuses.map(
  (s) => ({ value: s, label: STATUS_LABEL[s] })
);

// ─── Drawer nav item (social pill style) ────────────────────────────────────
function DrawerItem({
  Icon, label, active, onClick,
}: {
  Icon: (p: IconProps) => React.ReactElement;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl text-start text-[14px] transition-colors"
      style={{
        height: 40,
        paddingInline: 12,
        fontWeight: active ? 700 : 500,
        color: active ? "var(--color-amber)" : "var(--color-dark)",
        background: active ? "var(--color-sand)" : "transparent",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-cream)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span className="flex shrink-0" style={{ color: active ? "var(--color-amber)" : "var(--color-muted)" }}>
        <Icon size={18} />
      </span>
      {label}
    </button>
  );
}

// Group header — mono uppercase, matches globals `.label`. Aligns with item text
// (nav wrapper contributes 12px, this contributes 12px — 24px total, same as DrawerItem's px-3 inside the same nav).
function DrawerLabel({ children }: { children: React.ReactNode }) {
  return <p className="label" style={{ paddingInline: 12, paddingTop: 18, paddingBottom: 4 }}>{children}</p>;
}

// ─── Shell ───────────────────────────────────────────────────────────────

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { business } = useBusiness();
  const { chrome } = useCalendarChrome();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewSectionOpen, setViewSectionOpen] = useState(true);
  const [calendarsSectionOpen, setCalendarsSectionOpen] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pushHelpOpen, setPushHelpOpen] = useState(false);
  const { notifications, unreadCount, refetch, markAllRead, markOneRead, deleteOne, deleteAll } = useNotifications();
  const { status: pushStatus, refresh: refreshPushStatus } = usePushStatus();
  const supabase = createClient();

  // Swipe between bottom-nav tabs. Gesture is bound to the bottom nav bar only,
  // so it never competes with the calendar's in-page left/right day-swipe.
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  function onTabTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTabTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return; // not a horizontal swipe
    const idx = navItems.findIndex((it) => isActive(it.path));
    if (idx === -1) return; // not on a primary tab
    const next = dx < 0 ? idx + 1 : idx - 1; // swipe left → next, right → previous
    if (next < 0 || next >= navItems.length) return; // clamp at the ends
    router.push(navItems[next].path);
  }

  async function handleEnablePush() {
    const result = await enablePush();
    if (result === "ok") {
      showToast(t("Push notifications enabled"), "success");
    } else if (result === "denied") {
      showToast(t("Notifications blocked — enable them in your browser settings"), "error");
    } else if (result === "needs-install") {
      showToast("Add Bapita to your home screen first, then enable notifications", "info");
    } else if (result === "unsupported") {
      showToast("This device doesn't support push notifications", "error");
    } else {
      showToast("Couldn't enable notifications — try again", "error");
    }
    refreshPushStatus();
  }

  async function handlePushToggle() {
    if (pushStatus === "enabled") {
      const result = await disablePush();
      showToast(
        result === "ok" ? t("Push notifications turned off") : t("Couldn't turn off notifications"),
        result === "ok" ? "info" : "error"
      );
      refreshPushStatus();
    } else {
      await handleEnablePush();
    }
  }

  // Open the notifications modal when arriving via a push click (?notifications=1).
  // Run once on mount — push notification click always causes a full page reload.
  // Read from window (not useSearchParams) to avoid a static-prerender bailout.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("notifications") === "1") {
      // One-time mount sync from the URL query param; no external system to loop on.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotificationsOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // BroadcastChannel from SW notificationclick — more reliable than client.postMessage
  // on iOS (messages are queued and delivered when the frozen page resumes).
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    let bc: BroadcastChannel;
    try {
      bc = new BroadcastChannel("bapita_push");
      bc.onmessage = (event) => {
        if (event.data?.type === "OPEN_NOTIFICATIONS") {
          router.push("/calendar");
          setNotificationsOpen(true);
        }
      };
    } catch {
      return;
    }
    return () => bc.close();
  }, [router]);

  // Always show the freshest list when the modal opens
  useEffect(() => {
    if (notificationsOpen) refetch();
  }, [notificationsOpen, refetch]);

  const onCalendar = pathname === "/calendar";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];
      setIsAdmin(ADMIN_EMAILS.includes(user?.email ?? ""));
    });
  // Runs once on mount; supabase client is recreated each render so excluding it is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const [langSaving, setLangSaving] = useState(false);

  async function setDashboardLang(l: DashboardLang) {
    if (!business || l === lang || langSaving) return;
    setLangSaving(true);
    const { error } = await supabase.from("businesses").update({ dashboard_lang: l }).eq("id", business.id);
    setLangSaving(false);
    if (error) { showToast(error.message || t("Couldn't save. Please try again."), "error"); return; }
    window.dispatchEvent(new Event("bapita:business-updated"));
  }

  async function handleLogout() {
    setDrawerOpen(false);
    try {
      await supabase.auth.signOut();
      window.location.assign("https://bapita.com");
    } catch (error) {
      console.error("Logout error:", error);
      showToast(t("Failed to sign out"), "error");
    }
  }

  function go(path: string) {
    setDrawerOpen(false);
    router.push(path);
  }

  function copyBookingLink() {
    if (!business?.slug) return;
    navigator.clipboard.writeText(`https://book.bapita.com/${business.slug}`);
    showToast(t("Booking link copied"), "success");
  }

  const lang: DashboardLang = business?.dashboard_lang === "he" ? "he" : "en";
  const t = (key: string) => translate(lang, key);

  const businessName = business?.name ?? t("My Business");
  const businessSlug = business?.slug ? `${business.slug}.bapita.com` : "bapita.com";
  const initial = businessName.trim().charAt(0).toUpperCase() || "B";

  // Shared top-strip actions — New booking + notifications, always visible.
  const topActions = (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => router.push("/new-booking")}
        className="flex items-center gap-1.5 rounded-full transition-transform active:scale-95"
        style={{
          height: 36, paddingInline: 16, background: "var(--color-amber)",
          color: "var(--color-surface)", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
          boxShadow: "0 2px 8px rgba(232,146,10,0.26)",
        }}
        aria-label={t("New booking")}
      >
        <IconPlus size={16} />
        <span className="whitespace-nowrap">{t("New booking")}</span>
      </button>
      <button
        onClick={() => setNotificationsOpen(true)}
        className="relative flex items-center justify-center rounded-full text-dark bg-[var(--color-surface)] hover:bg-[var(--color-cream-2)] active:bg-[var(--color-cream-2)] transition-colors shrink-0"
        style={{ width: 36, height: 36, border: "1.5px solid var(--color-cream-2)" }}
        aria-label={t("Notifications")}
      >
        <IconBell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full text-white font-bold"
            style={{ top: 4, insetInlineEnd: 4, minWidth: 16, height: 16, padding: "0 3px", fontSize: 10, background: "var(--color-terra)", border: "2px solid var(--color-surface)", lineHeight: 1 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <LangProvider lang={lang}>
      {/* Root column: nav in normal flow on top, body fills the rest */}
      <div className="flex flex-col h-dvh">
      {/* ─── Desktop Top Nav ─────────────────────────────────────────── */}
      <div
        className="relative hidden md:flex h-14 shrink-0 items-center gap-2 border-b z-30"
        style={{
          paddingInline: 24,
          borderColor: "var(--line)",
          background: "var(--color-surface)",
        }}
      >
        {/* Hamburger — opens drawer (logo + full menu live inside) */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-full text-dark hover:bg-[var(--color-cream-2)] transition-colors shrink-0"
          aria-label={t("Open menu")}
        >
          <IconMenu size={20} />
        </button>

        <div className="flex-1" />

        {/* Print — calendar only */}
        {onCalendar && (
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center rounded-full text-dark bg-[var(--color-surface)] hover:bg-[var(--color-cream-2)] transition-colors shrink-0"
            style={{ width: 36, height: 36, border: "1.5px solid var(--color-cream-2)" }}
            aria-label={t("Print")}
          >
            <IconPrint size={18} />
          </button>
        )}

        {topActions}
      </div>

      {/* ─── Mobile Top Bar ───────────────────────────────────────────── */}
      <div
        data-noprint
        className="md:hidden h-16 shrink-0 flex items-center gap-2 border-b z-30 relative"
        style={{
          paddingInline: 12,
          borderColor: "var(--line)",
          background: "var(--color-surface)",
        }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-full text-dark active:bg-[var(--color-cream-2)] transition-colors shrink-0"
          style={{ padding: 10 }}
          aria-label={t("Open menu")}
        >
          <IconMenu size={24} />
        </button>

        <div className="flex-1" />

        {topActions}
      </div>

      {/* ─── Mobile Calendar Toolbar (calendar-only) ─────────────────── */}
      {onCalendar && chrome && (
        <div
          data-noprint
          className="md:hidden flex items-center shrink-0 border-b z-20"
          style={{
            background: "var(--nav-bg)",
            backdropFilter: "var(--nav-blur)",
            WebkitBackdropFilter: "var(--nav-blur)",
            borderColor: "var(--line)",
            height: 52,
            gap: 10,
            paddingInline: 20,
          }}
        >
          {searchOpen ? (
            /* Search mode — full-width input in toolbar */
            <>
              <input
                autoFocus
                type="search"
                placeholder={t("Search clients…")}
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
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchInput("");
                  chrome.setSearchQuery("");
                }}
                className="shrink-0 text-[14px] font-semibold transition-opacity active:opacity-60"
                style={{ color: "var(--color-amber)" }}
              >
                {t("Cancel")}
              </button>
            </>
          ) : (
            <>
              {/* View pill */}
              <button
                onClick={() => setViewSheetOpen(true)}
                className="flex items-center gap-1.5 rounded-full active:opacity-70 transition-opacity shrink-0"
                style={{
                  height: 36,
                  paddingInline: 14,
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-cream-2)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-dark)",
                  whiteSpace: "nowrap",
                }}
              >
                {calViews.find((v) => v.value === chrome.view)?.label ?? "View"}
                <IconChevronDown size={14} />
              </button>

              {/* Filter pill */}
              <button
                onClick={() => setFilterSheetOpen(true)}
                className="flex items-center gap-1.5 rounded-full active:opacity-70 transition-opacity shrink-0"
                style={{
                  height: 36,
                  paddingInline: 14,
                  background: chrome.statusFilter.length > 0 ? "var(--color-amber)" : "var(--color-surface)",
                  border: `1.5px solid ${chrome.statusFilter.length > 0 ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: chrome.statusFilter.length > 0 ? "var(--color-surface)" : "var(--color-dark)",
                  whiteSpace: "nowrap",
                }}
              >
                {chrome.statusFilter.length === 0
                  ? t("All")
                  : chrome.statusFilter.length === 1
                    ? t(STATUS_LABEL[chrome.statusFilter[0]])
                    : `${chrome.statusFilter.length} ${t("filters")}`}
                <IconChevronDown size={14} />
              </button>

              {/* Search pill */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-1.5 rounded-full active:opacity-70 transition-opacity shrink-0"
                style={{
                  height: 36,
                  paddingInline: 14,
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-cream-2)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-dark)",
                  whiteSpace: "nowrap",
                }}
              >
                <IconSearch size={14} />
                {t("Search")}
              </button>

              <div className="flex-1" />

              {/* Jump to today */}
              {!chrome.isToday && (
                <button
                  onClick={chrome.onToday}
                  className="flex items-center gap-1 rounded-full active:opacity-70 transition-opacity shrink-0"
                  style={{
                    height: 32,
                    paddingInline: 12,
                    background: "var(--color-surface)",
                    border: "1.5px solid var(--color-cream-2)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-amber)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("Today")}
                </button>
              )}

              {/* Print */}
              <button
                onClick={() => window.print()}
                className="rounded-full text-dark active:bg-[var(--color-cream-2)] transition-colors"
                style={{ padding: 10 }}
                aria-label={t("Print")}
              >
                <IconPrint size={18} />
              </button>
            </>
          )}
        </div>
      )}

      {/* ─── Mobile Bottom Nav ────────────────────────────────────────── */}
      <nav
        onTouchStart={onTabTouchStart}
        onTouchEnd={onTabTouchEnd}
        className="md:hidden fixed bottom-0 start-0 end-0 flex items-stretch border-t z-30"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-cream-2)",
          height: "calc(72px + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
          touchAction: "pan-y",
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
                  width: 46,
                  height: 30,
                  background: active ? "var(--amber-soft)" : "transparent",
                }}
              >
                <Icon />
              </span>
              <span className="text-[11px]" style={{ fontWeight: active ? 700 : 500 }}>{t(item.label)}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── Body row: sidebar + main fill remaining height ──────────── */}
      <div className="flex flex-1 min-h-0">
      {/* ─── Left Sidebar (Calendar only) ────────────────────────────── */}
      {onCalendar && chrome && (
        <aside
          className="hidden md:flex flex-col w-60 shrink-0 overflow-y-auto"
          style={{
            background: "var(--color-cream)",
            borderInlineEnd: "1px solid var(--color-cream-2)",
            paddingTop: 14,
            paddingInline: 8,
          }}
        >
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
                placeholder={t("Search clients…")}
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

          {/* Share booking page (F6) */}
          {business?.slug && (
            <div style={{ padding: "0 12px 12px" }}>
              <button
                onClick={copyBookingLink}
                title={`book.bapita.com/${business.slug}`}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, height: 34, borderRadius: 9, border: "1.5px dashed var(--color-cream-2)",
                  background: "transparent", color: "var(--color-muted)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-amber)"; e.currentTarget.style.color = "var(--color-amber)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-2)"; e.currentTarget.style.color = "var(--color-muted)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {t("Share your booking page")}
              </button>
            </div>
          )}

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
            {t("View")}
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
                      padding: "8px 10px", borderRadius: 10, fontSize: 13.5, textAlign: "left",
                      fontWeight: active ? 700 : 500,
                      color: active ? "var(--color-amber)" : "var(--color-dark)",
                      background: active ? "var(--color-sand)" : "transparent",
                      border: "none", cursor: "pointer", transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-cream-2)"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    {t(v.label)}
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
            {t("Filter")}
            <span style={{ transform: viewMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex" }}>
              <IconChevronDown size={12} />
            </span>
          </button>
          {viewMenuOpen && (
            <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Clear all */}
              {chrome.statusFilter.length > 0 && (
                <button
                  onClick={() => chrome.setStatusFilter([])}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 8px", borderRadius: 8, fontSize: 12, textAlign: "left",
                    color: "var(--color-amber)", background: "transparent", border: "none",
                    cursor: "pointer", fontWeight: 600, transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {t("Clear filters")}
                </button>
              )}
              {filterOptions.map((opt) => {
                const active = chrome.statusFilter.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const next = active
                        ? chrome.statusFilter.filter((s) => s !== opt.value)
                        : [...chrome.statusFilter, opt.value];
                      chrome.setStatusFilter(next);
                    }}
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
                    {t(opt.label)}
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
            {t("Calendars")}
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
                staff={chrome.staff ?? []}
              />
              {/* Add a staff member = adds their calendar (real, actionable). */}
              <button
                onClick={() => go("/settings?section=team")}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 8px", borderRadius: 8, fontSize: 13, textAlign: "start",
                  color: "var(--color-amber)", fontWeight: 600, background: "transparent",
                  border: "none", cursor: "pointer", marginTop: 4,
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <IconPlus size={13} />
                {t("Add staff calendar")}
              </button>
              {/* Google Calendar — not clickable, quiet "soon" info row (no toast). */}
              <div
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 8px", borderRadius: 8, fontSize: 13, textAlign: "start",
                  color: "var(--color-muted)", marginTop: 2,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: "var(--color-cream-2)" }} />
                {t("Google Calendar")}
                <span style={{ marginInlineStart: "auto", fontSize: 10, fontWeight: 700, background: "var(--color-cream-2)", padding: "2px 6px", borderRadius: 4, color: "var(--color-muted)", letterSpacing: "0.04em" }}>
                  {t("Soon")}
                </span>
              </div>
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
                {t("Jump to today")}
              </button>
            </>
          )}
        </aside>
      )}

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <main key={pathname} className="page-anim flex-1 min-w-0 overflow-y-auto flex flex-col pt-4 pb-[calc(72px+env(safe-area-inset-bottom))] md:overflow-visible md:pt-0 md:pb-0">{children}</main>
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
        className={`fixed top-0 bottom-0 start-0 z-50 flex flex-col transition-transform duration-200 ease-out w-[80vw] max-w-[240px] md:w-60 md:max-w-none ${
          drawerOpen ? "" : "pointer-events-none"
        }`}
        style={{
          background: "var(--color-surface)",
          boxShadow: "4px 0 24px rgba(30,26,20,0.12)",
          // start-0 anchors this to the left in LTR, right in RTL — the closed-state
          // transform must slide off whichever edge it's actually anchored to, not
          // always left, or in RTL it slides toward center instead of off-screen.
          transform: drawerOpen ? "translateX(0)" : lang === "he" ? "translateX(100%)" : "translateX(-100%)",
        }}
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Bapita wordmark */}
        <div className="flex items-center" style={{ paddingInline: 20, minHeight: 64 }}>
          <Wordmark />
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto" style={{ paddingInline: 12, paddingTop: 4, paddingBottom: 8 }}>
          {/* Primary nav — desktop only; mobile uses bottom nav */}
          <div className="hidden md:block">
            <DrawerLabel>{t("Menu")}</DrawerLabel>
            {navItems.map((item) => (
              <DrawerItem
                key={item.path}
                Icon={item.icon}
                label={t(item.label)}
                active={isActive(item.path)}
                onClick={() => go(item.path)}
              />
            ))}
          </div>
          <DrawerLabel>{t("Manage")}</DrawerLabel>
          {drawerItemsTop.map((item) => (
            <DrawerItem
              key={item.path}
              Icon={item.icon}
              label={t(item.label)}
              active={isActive(item.path)}
              onClick={() => go(item.path)}
            />
          ))}
          <DrawerLabel>{t("Account")}</DrawerLabel>
          {drawerItemsBottom.map((item) => (
            <DrawerItem
              key={item.path}
              Icon={item.icon}
              label={t(item.label)}
              active={isActive(item.path)}
              onClick={() => go(item.path)}
            />
          ))}
          {isAdmin && (
            <DrawerItem
              Icon={IconAdmin}
              label={t("Admin")}
              active={isActive("/admin")}
              onClick={() => go("/admin/businesses")}
            />
          )}
        </nav>

        {/* Business name + sign out — bottom (no divider line) */}
        <div style={{ paddingInline: 12, paddingBottom: 12 }}>
          {/* Business identity */}
          <div className="flex items-center gap-3" style={{ paddingInline: 12, paddingTop: 12, paddingBottom: 12 }}>
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
          {/* Dashboard language — one tap from anywhere, not buried in Settings */}
          <div className="flex items-center justify-center" style={{ paddingInline: 12, paddingBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", borderRadius: 9999, padding: 3, gap: 2, background: "var(--color-cream-2)", flexShrink: 0, opacity: langSaving ? 0.6 : 1 }}>
              {(["en", "he"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setDashboardLang(l)}
                  disabled={langSaving}
                  style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, border: "none", cursor: langSaving ? "default" : "pointer", fontFamily: "inherit", transition: "background 0.15s, color 0.15s", background: lang === l ? "var(--color-amber)" : "transparent", color: lang === l ? "var(--color-surface)" : "var(--color-muted)" }}
                >
                  {l === "en" ? "EN" : "עב"}
                </button>
              ))}
            </div>
          </div>

          {/* Sign out — aligned with nav items */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl text-start text-[14px] font-medium transition-colors hover:bg-[var(--color-cream)]"
            style={{ height: 40, paddingInline: 12, color: "var(--color-cancelled)" }}
          >
            <IconLogout size={18} />
            {t("Sign out")}
          </button>
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
            className="fixed bottom-0 start-0 end-0 z-50 md:hidden"
            style={{ background: "var(--color-surface)", borderRadius: "20px 20px 0 0", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--color-cream-2)", margin: "12px auto 16px" }} />

            {/* Section label */}
            <div style={{ padding: "0 24px 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)" }}>
              {t("Filter by status")}
            </div>

            {/* Options card */}
            <div style={{ margin: "0 16px 12px", borderRadius: 16, overflow: "hidden", border: "1px solid var(--color-cream-2)" }}>
              {chrome.statusFilter.length > 0 && (
                <>
                  <button
                    onClick={() => chrome.setStatusFilter([])}
                    style={{ width: "100%", display: "flex", alignItems: "center", padding: "0 18px", height: 48, fontSize: 14, fontWeight: 700, textAlign: "left", background: "var(--color-surface)", border: "none", cursor: "pointer", color: "var(--color-amber)" }}
                  >
                    {t("Clear all filters")}
                  </button>
                  <div style={{ height: 1, background: "var(--color-cream-2)" }} />
                </>
              )}
              {filterOptions.map((opt, i) => {
                const active = chrome.statusFilter.includes(opt.value);
                return (
                  <div key={opt.value}>
                    {i > 0 && <div style={{ height: 1, background: "var(--color-cream-2)" }} />}
                    <button
                      onClick={() => {
                        const next = active
                          ? chrome.statusFilter.filter((s) => s !== opt.value)
                          : [...chrome.statusFilter, opt.value];
                        chrome.setStatusFilter(next);
                      }}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", height: 52, fontSize: 15, textAlign: "left", background: "var(--color-surface)", border: "none", cursor: "pointer", color: active ? "var(--color-amber)" : "var(--color-dark)" }}
                    >
                      {t(opt.label)}
                      {active && <IconCheck />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Jump to today card */}
            {!chrome.isToday && (
              <div style={{ margin: "0 16px 12px", borderRadius: 16, overflow: "hidden", border: "1px solid var(--color-cream-2)" }}>
                <button
                  onClick={() => { chrome.onToday(); setFilterSheetOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", padding: "0 18px", height: 52, fontSize: 15, fontWeight: 600, textAlign: "left", background: "var(--color-surface)", border: "none", cursor: "pointer", color: "var(--color-amber)" }}
                >
                  {t("Jump to today")}
                </button>
              </div>
            )}

            {/* Calendars */}
            <div style={{ padding: "4px 24px 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)" }}>
              {t("Calendars")}
            </div>
            <div style={{ margin: "0 16px 16px", borderRadius: 16, overflow: "hidden", border: "1px solid var(--color-cream-2)" }}>
              <CalendarSelectorPanel
                ownerName={businessName}
                calendarFilter={chrome.calendarFilter}
                setCalendarFilter={chrome.setCalendarFilter}
                staff={chrome.staff ?? []}
              />
            </div>
          </div>
        </>
      )}

      {/* ─── Notifications Sheet ─────────────────────────────────────── */}
      {notificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(30,26,20,0.4)" }}
            onClick={() => setNotificationsOpen(false)}
          />
          {/* Mobile: bottom sheet. Desktop: centered modal */}
          <div
            className="fixed z-50 flex flex-col
              bottom-0 start-0 end-0 rounded-t-[20px]
              md:bottom-auto md:start-auto md:end-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px] md:w-[min(420px,92vw)]"
            style={{
              background: "var(--color-surface)",
              paddingBottom: "env(safe-area-inset-bottom)",
              maxHeight: "80dvh",
              boxShadow: "0 8px 40px rgba(30,26,20,0.18)",
              // iOS: become a compositing layer so z-50 actually wins against
              // composited siblings (FAB, drawer) instead of losing taps to them.
              willChange: "transform",
              isolation: "isolate",
            }}
          >
            {/* Handle (mobile only) */}
            <div className="md:hidden" style={{ width: 40, height: 4, borderRadius: 99, background: "var(--color-cream-2)", margin: "12px auto 0" }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 10px" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-dark)" }}>{t("Notifications")}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--color-amber)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {t("Mark all read")}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={deleteAll}
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {t("Clear all")}
                  </button>
                )}
              </div>
            </div>

            {/* Push toggle — opt-in is a user gesture (iOS rejects auto-prompts) */}
            <div
              style={{
                margin: "0 16px 12px", padding: "12px 14px", borderRadius: 12,
                background: "var(--color-cream)", border: "1px solid var(--color-cream-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IconBell size={18} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--color-dark)" }}>
                  {t("Push on this device")}
                </span>
                {/* ? help */}
                <button
                  onClick={() => setPushHelpOpen((v) => !v)}
                  aria-label="About push notifications"
                  style={{
                    width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                    border: "1.5px solid var(--color-muted)", color: "var(--color-muted)",
                    background: "transparent", fontSize: 12, fontWeight: 700, lineHeight: 1,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  ?
                </button>
                {/* Toggle switch */}
                <button
                  role="switch"
                  aria-checked={pushStatus === "enabled"}
                  disabled={pushStatus === "unsupported" || pushStatus === "loading"}
                  onClick={handlePushToggle}
                  style={{
                    width: 44, height: 26, borderRadius: 999, border: "none", padding: 3,
                    flexShrink: 0, display: "flex",
                    justifyContent: pushStatus === "enabled" ? "flex-end" : "flex-start",
                    background: pushStatus === "enabled" ? "var(--color-amber)" : "var(--color-cream-2)",
                    opacity: pushStatus === "needs-install" ? 0.55 : 1,
                    cursor: pushStatus === "unsupported" || pushStatus === "loading" ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 999, background: "var(--color-surface)" }} />
                </button>
              </div>
              {pushHelpOpen && (
                <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.45, color: "var(--color-muted)" }}>
                  {pushStatus === "needs-install"
                    ? "Add Bapita to your home screen first. Then turn this on to get booking alerts on this device, even when the app is closed."
                    : pushStatus === "unsupported"
                      ? "This browser doesn't support push notifications."
                      : "Turn on to get booking alerts on this device, even when Bapita is closed. Turn off to stop them here. Each device is separate."}
                </div>
              )}
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--color-muted)", fontSize: 14 }}>
                  {t("No notifications yet")}
                </div>
              ) : (
                <div style={{ margin: "0 16px 16px", borderRadius: 16, overflow: "hidden", border: "1px solid var(--color-cream-2)" }}>
                  {notifications.map((n, i) => {
                    const isUnread = !n.read_at;
                    const iconColor =
                      n.type === "booking_created" ? "var(--color-amber)" :
                      n.type === "booking_cancelled" ? "var(--color-danger)" :
                      "var(--color-muted)";
                    const Icon =
                      n.type === "booking_created" ? IconCalendar :
                      n.type === "booking_cancelled" ? IconXSmall :
                      IconRefresh;
                    return (
                      <div key={n.id}>
                        {i > 0 && <div style={{ height: 1, background: "var(--color-cream-2)" }} />}
                        <div style={{ display: "flex", alignItems: "stretch" }}>
                          {/* Navigation button — takes all space except the delete column */}
                          <button
                            onClick={() => {
                              markOneRead(n.id);
                              if (n.booking_id) {
                                setNotificationsOpen(false);
                                router.push(`/calendar?booking=${n.booking_id}`);
                              }
                            }}
                            style={{
                              flex: 1, display: "flex", alignItems: "center", gap: 12,
                              padding: "14px 0 14px 16px",
                              background: isUnread ? "rgba(232,146,10,0.04)" : "var(--color-surface)",
                              borderInlineStart: isUnread ? "3px solid var(--color-amber)" : "3px solid transparent",
                              border: "none", textAlign: "left", minWidth: 0,
                              cursor: n.booking_id ? "pointer" : "default",
                              touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                            }}
                          >
                            <span style={{ color: iconColor, flexShrink: 0 }}>
                              <Icon size={18} />
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: isUnread ? 600 : 400, color: "var(--color-dark)", marginBottom: 2, lineHeight: 1.3 }}>
                                {n.title}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--color-muted)", lineHeight: 1.3 }}>
                                {n.body}
                              </div>
                            </div>
                          </button>
                          {/* Time + delete — separate column, never triggers navigation */}
                          <div style={{
                            display: "flex", flexDirection: "column", alignItems: "flex-end",
                            justifyContent: "center", gap: 6, padding: "14px 16px 14px 12px",
                            background: isUnread ? "rgba(232,146,10,0.04)" : "var(--color-surface)",
                            flexShrink: 0,
                          }}>
                            <span style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                              {timeAgo(n.created_at)}
                            </span>
                            <button
                              onClick={() => deleteOne(n.id)}
                              style={{ color: "var(--color-muted)", background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", lineHeight: 1 }}
                              aria-label="Delete notification"
                            >
                              <IconXSmall size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
            className="fixed bottom-0 start-0 end-0 z-50 md:hidden"
            style={{ background: "var(--color-surface)", borderRadius: "20px 20px 0 0", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--color-cream-2)", margin: "12px auto 16px" }} />

            {/* Label */}
            <div style={{ padding: "0 24px 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)" }}>
              {t("View")}
            </div>

            {/* Options card */}
            <div style={{ margin: "0 16px 20px", borderRadius: 16, overflow: "hidden", border: "1px solid var(--color-cream-2)" }}>
              {calViews.map((v, i) => {
                const active = chrome.view === v.value;
                return (
                  <div key={v.value}>
                    {i > 0 && <div style={{ height: 1, background: "var(--color-cream-2)" }} />}
                    <button
                      onClick={() => { chrome.setView(v.value); setViewSheetOpen(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", height: 52, fontSize: 15, textAlign: "left", background: "var(--color-surface)", border: "none", cursor: "pointer", color: active ? "var(--color-amber)" : "var(--color-dark)" }}
                    >
                      {t(v.label)}
                      {active && <IconCheck />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </LangProvider>
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
