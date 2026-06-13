"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { ClientsSkeleton } from "@/components/LoadingSkeleton";
import AddCustomerSheet from "@/components/AddCustomerSheet";
import type { Customer } from "@/types";

const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.02)";
const CARD_SHADOW_HOVER = "0 12px 24px -8px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.04)";

type SortBy = "recent" | "name" | "visits";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "A to Z" },
  { value: "visits", label: "Most booked" },
];

// Warm avatar palette. Each entry is a soft tint background + a darker
// initial color so a list of cards reads varied but stays on brand.
const AVATAR_TINTS: { bg: string; fg: string }[] = [
  { bg: "rgba(232,146,10,0.12)", fg: "#C25E00" }, // amber
  { bg: "rgba(212,98,42,0.12)", fg: "#B14418" }, // terra
  { bg: "rgba(34,197,94,0.12)", fg: "#15803D" }, // green
  { bg: "rgba(107,96,82,0.12)", fg: "#5A5044" }, // sand/muted
  { bg: "rgba(148,163,184,0.14)", fg: "#475569" }, // slate
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

// List-region skeleton. Keeps the live header/search mounted (so the input
// holds focus while typing) and only the rows below shimmer.
function ListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-[88px] rounded-2xl bg-white"
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

  if (bizLoading) return <ClientsSkeleton />;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* ─── Fixed top region: header + controls ─────────────────────── */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: "var(--color-cream-2)" }}
      >
        <div className="mx-auto w-full px-6 py-8 md:px-8 lg:px-10" style={{ maxWidth: 960 }}>
          {/* Header with increased spacing */}
          <div className="flex items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-dark">
                Clients
              </h1>
              <span
                className="inline-flex items-center justify-center h-7 min-w-7 px-2.5 rounded-full text-sm font-medium"
                style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}
              >
                {totalCount}
              </span>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="h-11 px-5 rounded-xl bg-amber text-white flex items-center gap-2 font-semibold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0"
            >
              <IconPlus />
              Add client
            </button>
          </div>

          {/* Controls: search + segmented sort with better spacing */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <span
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-muted)", insetInlineStart: 16 }}
              >
                <IconSearch />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="w-full h-12 rounded-xl border bg-white text-base text-dark transition-all focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
                style={{ borderColor: "var(--color-cream-2)", paddingInlineStart: 44, paddingInlineEnd: 18 }}
              />
            </div>

            <div
              className="flex p-1 rounded-xl shrink-0"
              style={{ background: "var(--color-cream-2)" }}
            >
              {SORT_OPTIONS.map((option) => {
                const active = sortBy === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                    style={{
                      background: active ? "var(--color-surface)" : "transparent",
                      color: active ? "var(--color-dark)" : "var(--color-muted)",
                      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Scrolling list with increased card height and spacing ─── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-6 py-6 md:px-8 lg:px-10" style={{ maxWidth: 960 }}>
          {loading ? (
            <ListSkeleton />
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-24 px-8 min-h-[55vh]">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)" }}
              >
                <IconUsers />
              </div>
              {debouncedSearch ? (
                <>
                  <h2 className="text-xl font-bold text-dark mb-2">
                    No matches for "{debouncedSearch}"
                  </h2>
                  <p className="text-base max-w-[340px]" style={{ color: "var(--color-muted)" }}>
                    Try a different name or phone number.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-dark mb-3">
                    Your client book starts here
                  </h2>
                  <p className="text-base mb-8 max-w-[360px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    Add a client with their phone and visit history, and book them in the same step.
                  </p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="h-12 px-6 rounded-xl bg-amber text-white font-semibold text-base shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    Add your first client
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => {
                const tint = avatarTint(client.id);
                return (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="group w-full flex items-center gap-5 bg-white rounded-2xl px-5 py-4 text-start transition-all hover:-translate-y-0.5"
                    style={{ boxShadow: CARD_SHADOW }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER)}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = CARD_SHADOW)}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0"
                      style={{ background: tint.bg, color: tint.fg }}
                    >
                      {firstInitial(client.name)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-base font-semibold text-dark truncate mb-1">{client.name}</div>
                      <div className="text-sm truncate" style={{ color: "var(--color-muted)" }}>
                        {formatPhone(client.phone)}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-sm font-semibold text-dark mb-0.5">
                        {client.total_visits > 0
                          ? `${client.total_visits} visit${client.total_visits !== 1 ? "s" : ""}`
                          : "New"}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                        {client.last_visit_at
                          ? format(parseISO(client.last_visit_at), "MMM d")
                          : "No visits yet"}
                      </div>
                    </div>
                    <span className="shrink-0 text-muted group-hover:text-dark transition-colors ml-1">
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
