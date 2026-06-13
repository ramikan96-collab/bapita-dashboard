"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { ClientsSkeleton } from "@/components/LoadingSkeleton";
import AddCustomerSheet from "@/components/AddCustomerSheet";
import type { Customer } from "@/types";

const CARD_SHADOW = "0 2px 8px rgba(30,26,20,0.06), 0 1px 3px rgba(30,26,20,0.04)";
const CARD_SHADOW_HOVER = "0 4px 20px rgba(30,26,20,0.1), 0 2px 6px rgba(30,26,20,0.08)";

type SortBy = "recent" | "name" | "visits";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "A to Z" },
  { value: "visits", label: "Most booked" },
];

// Warm avatar palette - consistent with premium feel
const AVATAR_TINTS: { bg: string; fg: string }[] = [
  { bg: "rgba(232,146,10,0.14)", fg: "#B86800" }, // amber
  { bg: "rgba(212,98,42,0.13)", fg: "#B14418" }, // terra
  { bg: "rgba(34,197,94,0.13)", fg: "#15803D" }, // green
  { bg: "rgba(107,96,82,0.14)", fg: "#5A5044" }, // sand
  { bg: "rgba(148,163,184,0.18)", fg: "#475569" }, // slate
];

function avatarTint(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}

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

// Icons
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-[78px] rounded-2xl bg-white animate-pulse"
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

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
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
        query = query.order("name", { ascending: true });
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
      {/* Fixed Header */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: "var(--color-cream-2)" }}
      >
        <div className="mx-auto w-full px-4 md:px-6 pt-5 pb-4" style={{ maxWidth: 768 }}>
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-[28px] md:text-[32px] font-extrabold tracking-[-0.5px] text-dark leading-none">
                Clients
              </h1>
              <span
                className="inline-flex items-center justify-center h-7 min-w-7 px-2.5 rounded-full text-sm font-semibold mt-0.5"
                style={{ 
                  background: "var(--color-cream-2)", 
                  color: "var(--color-muted)" 
                }}
              >
                {totalCount}
              </span>
            </div>

            <button
              onClick={() => setShowAdd(true)}
              className="h-11 px-5 rounded-2xl bg-amber text-white flex items-center gap-2 font-semibold text-[14.5px] whitespace-nowrap shadow-[0_3px_12px_rgba(232,146,10,0.28)] hover:bg-[#D4830A] active:scale-[0.985] transition-all"
            >
              <IconPlus />
              Add client
            </button>
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-muted)", left: 16 }}
              >
                <IconSearch />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full h-12 rounded-2xl border bg-white text-[15px] text-dark placeholder:text-muted focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 transition-all"
                style={{ 
                  borderColor: "var(--color-cream-2)", 
                  paddingLeft: 48, 
                  paddingRight: 16 
                }}
              />
            </div>

            <div
              className="flex p-1 rounded-2xl shrink-0 bg-white border"
              style={{ borderColor: "var(--color-cream-2)" }}
            >
              {SORT_OPTIONS.map((option) => {
                const isActive = sortBy === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className="px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                    style={{
                      background: isActive ? "var(--color-surface)" : "transparent",
                      color: isActive ? "var(--color-dark)" : "var(--color-muted)",
                      boxShadow: isActive ? "0 1px 3px rgba(30,26,20,0.08)" : "none",
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-4 md:px-6 py-6" style={{ maxWidth: 768 }}>
          {loading ? (
            <ListSkeleton />
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-24">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
                style={{ background: "rgba(232,146,10,0.1)", color: "var(--color-amber)" }}
              >
                <IconUsers />
              </div>
              
              {debouncedSearch ? (
                <>
                  <h2 className="text-2xl font-bold text-dark mb-3">No matches found</h2>
                  <p className="text-[15px] max-w-xs mx-auto" style={{ color: "var(--color-muted)" }}>
                    We couldn&apos;t find any clients matching &quot;{debouncedSearch}&quot;
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-[22px] font-bold text-dark mb-3">Your client book is empty</h2>
                  <p className="text-[15px] max-w-md mx-auto leading-relaxed mb-8" style={{ color: "var(--color-muted)" }}>
                    Add your first client with their contact details and start tracking visits and bookings.
                  </p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="h-12 px-8 rounded-2xl bg-amber text-white font-semibold text-base shadow-[0_4px_14px_rgba(232,146,10,0.25)] hover:bg-[#D4830A] active:scale-95 transition-all"
                  >
                    Add your first client
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-8">
              {clients.map((client) => {
                const tint = avatarTint(client.id || client.name);
                return (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="group w-full flex items-center gap-4 bg-white rounded-3xl px-5 py-4 text-start transition-all hover:-translate-y-0.5 active:scale-[0.985]"
                    style={{ boxShadow: CARD_SHADOW }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER)}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = CARD_SHADOW)}
                  >
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 ring-1 ring-inset"
                      style={{ 
                        background: tint.bg, 
                        color: tint.fg,
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)"
                      }}
                    >
                      {firstInitial(client.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-semibold text-dark truncate pr-2">
                        {client.name}
                      </div>
                      <div className="text-[14px] truncate mt-0.5" style={{ color: "var(--color-muted)" }}>
                        {formatPhone(client.phone)}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0 pr-1">
                      <div className="text-[14px] font-semibold text-dark">
                        {client.total_visits > 0
                          ? `${client.total_visits} visit${client.total_visits !== 1 ? "s" : ""}`
                          : "New client"}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                        {client.last_visit_at
                          ? format(parseISO(client.last_visit_at), "MMM d, yyyy")
                          : "No visits yet"}
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="shrink-0 text-muted group-hover:text-amber transition-colors">
                      <IconChevron />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Sheet */}
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
