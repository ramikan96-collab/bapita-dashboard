"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { ClientsSkeleton } from "@/components/LoadingSkeleton";
import AddCustomerSheet from "@/components/AddCustomerSheet";
import type { Customer } from "@/types";

const CARD_SHADOW = "0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)";
const CARD_SHADOW_HOVER = "0 4px 12px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)";

type SortBy = "recent" | "name" | "visits";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "A to Z" },
  { value: "visits", label: "Most booked" },
];

function formatPhone(phone: string): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-[72px] bg-white rounded-xl"
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
    <div className="flex flex-col h-full bg-[#F8F6F3]">
      {/* Header Section */}
      <div className="shrink-0 bg-white border-b border-gray-100">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-8">
          {/* Title and Add Button Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
              <span className="text-sm text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                {totalCount}
              </span>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="h-9 px-3.5 rounded-md bg-amber-500 text-white flex items-center gap-1.5 text-sm font-medium hover:bg-amber-600 transition-all active:scale-95"
            >
              <IconPlus />
              Add client
            </button>
          </div>

          {/* Search and Filter Row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IconSearch />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>

            <div className="sort-dropdown relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white flex items-center gap-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-all"
              >
                <span>Sort: {getCurrentSortLabel()}</span>
                <IconChevronDown />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 mt-1 w-36 rounded-md bg-white shadow-lg border border-gray-100 overflow-hidden z-10">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        sortBy === option.value ? 'text-amber-500 font-medium bg-amber-50' : 'text-gray-700'
                      }`}
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

      {/* Table Section */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-5 lg:px-8">
          {loading ? (
            <TableSkeleton />
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 mt-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-amber-50 text-amber-400">
                <IconUsers />
              </div>
              {debouncedSearch ? (
                <>
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    No results for "{debouncedSearch}"
                  </h3>
                  <p className="text-sm text-gray-500">Try a different search term</p>
                </>
              ) : (
                <>
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    No clients yet
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Add your first client to get started
                  </p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="h-9 px-4 rounded-md bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-all"
                  >
                    Add your first client
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-4">First Name</div>
                <div className="col-span-3">Last Name</div>
                <div className="col-span-2">Phone #</div>
                <div className="col-span-2">Account</div>
                <div className="col-span-1"></div>
              </div>

              {/* Table Rows */}
              {clients.map((client) => {
                const { firstName, lastName } = parseName(client.name);
                return (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="group w-full grid grid-cols-12 gap-4 items-center bg-white rounded-xl px-4 py-4 text-left transition-all hover:-translate-y-0.5"
                    style={{ boxShadow: CARD_SHADOW }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = CARD_SHADOW;
                    }}
                  >
                    <div className="col-span-4">
                      <span className="text-sm font-medium text-gray-900">
                        {firstName}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm text-gray-600">
                        {lastName || '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-500">
                        {formatPhone(client.phone)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900">
                          {client.total_visits > 0
                            ? `${client.total_visits} visit${client.total_visits !== 1 ? 's' : ''}`
                            : 'New'}
                        </span>
                        {client.last_visit_at && (
                          <span className="text-xs text-gray-400">
                            · {format(parseISO(client.last_visit_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <span className="text-gray-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all">
                        <IconArrowRight />
                      </span>
                    </div>
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
