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

type SortBy = "recent" | "name" | "visits";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "Name A-Z" },
  { value: "visits", label: "Most visits" },
];

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatPhone(phone: string): string {
  if (!phone) return "No phone";
  if (phone.length === 10 && phone.startsWith("05")) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return phone;
}

function lastVisitLabel(iso: string | null): string {
  if (!iso) return "No visits yet";
  return `Last visit ${format(parseISO(iso), "MMM d")}`;
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
      {/* Page header */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight text-dark">Clients</h1>
          <p className="text-[13px] font-medium" style={{ color: "var(--color-muted)" }}>
            {totalCount} client{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-11 h-11 rounded-xl bg-amber text-white flex items-center justify-center active:scale-95 transition-transform shrink-0"
          aria-label="Add client"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Search + sort */}
      <div className="shrink-0 px-4 pb-3 space-y-3">
        <div className="relative">
          <span
            className="absolute inset-inline-start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-muted)", insetInlineStart: 12 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
            className="w-full h-12 rounded-[10px] border bg-white text-[15px] text-dark transition-colors focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30"
            style={{ borderColor: "var(--color-cream-2)", paddingInlineStart: 38, paddingInlineEnd: 16 }}
          />
        </div>

        <div className="flex gap-2">
          {SORT_OPTIONS.map((option) => {
            const active = sortBy === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                style={{
                  background: active ? "var(--color-amber)" : "var(--color-surface)",
                  color: active ? "#fff" : "var(--color-muted)",
                  border: active ? "1px solid var(--color-amber)" : "1px solid var(--color-cream-2)",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
            />
          </div>
        ) : clients.length === 0 ? (
          debouncedSearch ? (
            <div className="text-center py-12 px-6">
              <p className="text-[17px] font-bold text-dark">No matches for &quot;{debouncedSearch}&quot;</p>
              <p className="text-[15px] mt-1" style={{ color: "var(--color-muted)" }}>
                Try a different name or phone number.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="text-5xl mb-4">✂️</div>
              <div className="text-[18px] font-bold text-dark mb-1">Your client book starts here</div>
              <div className="text-[15px] mb-6 max-w-[260px]" style={{ color: "var(--color-muted)" }}>
                Add a client here with their phone and visit history, and book them in the same step.
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-amber text-white font-semibold text-[15px] px-5 py-3.5 rounded-xl hover:bg-[#D4830A] active:bg-[#B86800] transition-colors"
              >
                Add your first client
              </button>
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => router.push(`/clients/${client.id}`)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 text-start active:scale-[0.98] transition-transform"
                style={{ boxShadow: CARD_SHADOW }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0"
                  style={{ background: "var(--color-amber)", color: "#fff" }}
                >
                  {initials(client.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-bold text-dark truncate">{client.name}</div>
                  <div className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                    {formatPhone(client.phone)} · {client.total_visits || 0} visit
                    {client.total_visits !== 1 ? "s" : ""}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {lastVisitLabel(client.last_visit_at)}
                  </div>
                </div>
                <span style={{ color: "var(--color-muted)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        )}
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
