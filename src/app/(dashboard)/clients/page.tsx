"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { ClientsSkeleton } from "@/components/LoadingSkeleton";
import AddCustomerSheet from "@/components/AddCustomerSheet";
import type { Customer } from "@/types";

const CARD_SHADOW = "0 1px 2px rgba(30,26,20,0.06), 0 2px 8px rgba(30,26,20,0.05)";
const CARD_SHADOW_HOVER = "0 2px 4px rgba(30,26,20,0.08), 0 6px 20px rgba(30,26,20,0.09)";

type SortBy = "recent" | "name" | "visits";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "A to Z" },
  { value: "visits", label: "Most booked" },
];

// Warm avatar palette. Each entry is a soft tint background + a darker
// initial color so a list of cards reads varied but stays on brand.
const AVATAR_TINTS: { bg: string; fg: string }[] = [
  { bg: "rgba(232,146,10,0.14)", fg: "#B86800" }, // amber
  { bg: "rgba(212,98,42,0.13)", fg: "#B14418" }, // terra
  { bg: "rgba(34,197,94,0.13)", fg: "#15803D" }, // green
  { bg: "rgba(107,96,82,0.14)", fg: "#5A5044" }, // sand/muted
  { bg: "rgba(148,163,184,0.18)", fg: "#475569" }, // slate
];

// Deterministic tint per client so a given person always keeps the same color.
function avatarTint(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}

// Avatar shows the first initial only, per the design spec.
function firstInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatPhone(phone: string): string {
  if (!phone) return "No phone";
  if (phone.length === 10 && phone.startsWith("05")) {
    return `${phone.slice(0, 3)}.${phone.slice(3, 6)}.${phone.slice(6)}`;
  }
  return phone;
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// List-region skeleton. Keeps the live header/search mounted (so the input
// holds focus while typing) and only the rows below shimmer.
function ListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-[72px] rounded-2xl bg-white"
          style={{ boxShadow: CARD_SHADOW }}
        />
      ))}
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clients, setClients] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [totalCount, setTotalCount] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Debounce search so we don't fire a query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function fetchClients() {
      if (!business) {
        setLoading(false);
        return;
      }

      setLoading(true);

      let query = supabase
        .from("customers")
        .select("*", { count: "exact" })
        .eq("business_id", business.id);

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
      }

      if (sortBy === "name") {
        query = query.order("name");
      } else if (sortBy === "visits") {
        query = query.order("total_visits", { ascending: false });
      } else {
        query = query.order("last_visit_at", { ascending: false, nullsFirst: false });
      }

      const { data, count } = await query.limit(100);
      setClients(data || []);
      setTotalCount(count || 0);
      setLoading(false);
    }

    fetchClients();
  }, [business, debouncedSearch, sortBy, supabase, refreshKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showSortDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.sort-dropdown')) {
          setShowSortDropdown(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortDropdown]);

  const getCurrentSortLabel = () => {
    return SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || "Recent";
  };

  if (bizLoading) return <ClientsSkeleton />;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* ─── Fixed top region: header + controls ─────────────────────── */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: "var(--color-cream-2)" }}
      >
        {/* Centered container with max-width and auto margins */}
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-5 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-[26px] md:text-[30px] font-extrabold leading-none text-dark">
                Clients
              </h1>
              <span
                className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full text-[12px] font-semibold"
                style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}
              >
                {totalCount}
              </span>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="h-10 px-4 rounded-xl bg-amber text-white flex items-center gap-1.5 font-semibold text-[14px] whitespace-nowrap shadow-[0_2px_8px_rgba(232,146,10,0.30)] hover:bg-[#D4830A] active:scale-95 transition-all shrink-0"
            >
              <IconPlus />
              Add client
            </button>
          </div>

          {/* Controls: search + sort dropdown */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <span
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-muted)", insetInlineStart: 14 }}
              >
                <IconSearch />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="w-full h-11 rounded-xl border bg-white text-[15px] text-dark transition-colors focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
                style={{ borderColor: "var(--color-cream-2)", paddingInlineStart: 42, paddingInlineEnd: 16 }}
              />
            </div>

            {/* Sort Dropdown */}
            <div className="sort-dropdown relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="h-11 px-4 rounded-xl border bg-white flex items-center gap-2 font-medium text-[14px] transition-all hover:bg-gray-50"
                style={{ borderColor: "var(--color-cream-2)", color: "var(--color-dark)" }}
              >
                <span>Sort: {getCurrentSortLabel()}</span>
                <span className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`}>
                  <IconChevronDown />
                </span>
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white shadow-lg border overflow-hidden z-10" style={{ borderColor: "var(--color-cream-2)" }}>
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-cream ${
                        sortBy === option.value ? 'font-semibold text-amber' : 'text-dark'
                      }`}
                      style={{ background: sortBy === option.value ? "rgba(232,146,10,0.05)" : "transparent" }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Scrolling list ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Centered container with max-width and auto margins */}
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 py-5 min-h-full">
          {loading ? (
            <ListSkeleton />
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-8 min-h-[55vh]">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)" }}
              >
                <IconUsers />
              </div>
              {debouncedSearch ? (
                <>
                  <h2 className="text-[18px] font-bold text-dark mb-1">
                    No matches for &quot;{debouncedSearch}&quot;
                  </h2>
                  <p className="text-[15px] max-w-[300px]" style={{ color: "var(--color-muted)" }}>
                    Try a different name or phone number.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-[19px] font-bold text-dark mb-1.5">
                    Your client book starts here
                  </h2>
                  <p className="text-[15px] mb-6 max-w-[320px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    Add a client with their phone and visit history, and book them in the same step.
                  </p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="h-11 px-5 rounded-xl bg-amber text-white font-semibold text-[15px] whitespace-nowrap shadow-[0_2px_8px_rgba(232,146,10,0.30)] hover:bg-[#D4830A] active:scale-95 transition-all"
                  >
                    Add your first client
                  </button>
                </>
              )}
            </div>
          ) : (
            /* Increased spacing between cards - space-y-4 instead of space-y-3 */
            <div className="space-y-4">
              {clients.map((client) => {
                const tint = avatarTint(client.id);
                return (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="group w-full flex items-center gap-4 bg-white rounded-2xl px-4 py-3.5 text-start transition-all hover:-translate-y-0.5"
                    style={{ boxShadow: CARD_SHADOW }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER)}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = CARD_SHADOW)}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[17px] shrink-0"
                      style={{ background: tint.bg, color: tint.fg }}
                    >
                      {firstInitial(client.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-dark truncate">{client.name}</div>
                      <div className="text-[13px] truncate" style={{ color: "var(--color-muted)" }}>
                        {formatPhone(client.phone)}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-[13px] font-semibold text-dark">
                        {client.total_visits > 0
                          ? `${client.total_visits} visit${client.total_visits !== 1 ? "s" : ""}`
                          : "New"}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                        {client.last_visit_at
                          ? format(parseISO(client.last_visit_at), "MMM d")
                          : "No visits yet"}
                      </div>
                    </div>
                    <span className="shrink-0 text-muted group-hover:text-dark transition-colors">
                      <IconChevron />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAdd && business && (
        <AddCustomerSheet
          business={business}
          onClose={() => setShowAdd(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
