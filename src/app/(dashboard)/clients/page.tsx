"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, subDays, subMonths, subYears } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { ClientsSkeleton } from "@/components/LoadingSkeleton";
import AddCustomerSheet from "@/components/AddCustomerSheet";
import { useToast } from "@/components/Toast";
import type { Customer } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortBy = "recent" | "name" | "visits";
type ShowFilter = "all" | "30d" | "3m" | "1y" | "custom";
type ColumnKey = "firstName" | "lastName" | "phone" | "email" | "visits" | "lastVisit" | "label";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "A to Z" },
  { value: "visits", label: "Most booked" },
];

const SHOW_OPTIONS: { value: ShowFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "30d", label: "Past 30 days" },
  { value: "3m", label: "3 months" },
  { value: "1y", label: "1 year" },
  { value: "custom", label: "Custom…" },
];

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "label", label: "Label" },
  { key: "visits", label: "Visits" },
  { key: "lastVisit", label: "Last visit" },
];

const DEFAULT_COLUMNS: ColumnKey[] = ["firstName", "lastName", "phone", "email", "label"];

// Per-column grid width
function getColWidth(key: ColumnKey): string {
  switch (key) {
    case "firstName": return "minmax(70px, 1fr)";
    case "lastName":  return "minmax(70px, 1fr)";
    case "phone":     return "minmax(100px, 1fr)";
    case "email":     return "minmax(120px, 1.5fr)";
    case "label":     return "minmax(80px, 0.8fr)";
    case "visits":    return "minmax(55px, 0.6fr)";
    case "lastVisit": return "minmax(80px, 0.9fr)";
    default:          return "minmax(80px, 1fr)";
  }
}

// Minimum px contribution per column for table-min-width calculation
const COL_MIN_PX: Record<ColumnKey, number> = {
  firstName: 70, lastName: 70, phone: 100, email: 120,
  label: 80, visits: 55, lastVisit: 80,
};

// ─── Label config ─────────────────────────────────────────────────────────────

type LabelValue = "completed" | "no_show" | "canceled";

const LABEL_CONFIG: Record<LabelValue, { text: string; bg: string; color: string }> = {
  completed: { text: "Completed", bg: "#F0FDF4", color: "#16A34A" },
  no_show:   { text: "No show",   bg: "#FFF7ED", color: "#EA580C" },
  canceled:  { text: "Canceled",  bg: "#FEF2F2", color: "#DC2626" },
};

const NEW_CHIP = { text: "New", bg: "#EFF6FF", color: "#2563EB" };

const ALL_LABEL_OPTIONS = [
  { value: "new",       text: "New",       bg: "#EFF6FF", color: "#2563EB" },
  { value: "completed", text: "Completed", bg: "#F0FDF4", color: "#16A34A" },
  { value: "no_show",   text: "No show",   bg: "#FFF7ED", color: "#EA580C" },
  { value: "canceled",  text: "Canceled",  bg: "#FEF2F2", color: "#DC2626" },
] as const;

function getEffectiveLabel(client: Customer): { text: string; bg: string; color: string } | null {
  if (client.label === "new") return NEW_CHIP;
  if (client.label && client.label in LABEL_CONFIG) {
    return LABEL_CONFIG[client.label as LabelValue];
  }
  if (!client.label && (!client.total_visits || client.total_visits === 0)) {
    return NEW_CHIP;
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function getFilterDate(filter: ShowFilter): Date | null {
  const now = new Date();
  if (filter === "30d") return subDays(now, 30);
  if (filter === "3m") return subMonths(now, 3);
  if (filter === "1y") return subYears(now, 1);
  return null;
}

function downloadCSV(clients: Customer[], orderedCols: ColumnKey[]) {
  const headers = orderedCols.map((k) => ALL_COLUMNS.find((c) => c.key === k)?.label ?? k);
  const rows = clients.map((client) => {
    const { firstName, lastName } = parseName(client.name);
    return orderedCols.map((key) => {
      switch (key) {
        case "firstName": return firstName;
        case "lastName":  return lastName;
        case "phone":     return client.phone || "";
        case "email":     return client.email || "";
        case "visits":    return String(client.total_visits ?? 0);
        case "lastVisit": return client.last_visit_at ? format(parseISO(client.last_visit_at), "MMM d, yyyy") : "";
        case "label":     return getEffectiveLabel(client)?.text ?? "";
        default:          return "";
      }
    });
  });
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clients.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.29 6.29l1.27-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconColumns() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ height: 64, borderRadius: 14, background: "white", boxShadow: "0 1px 3px rgba(30,26,20,0.06)" }} />
      ))}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: "#FEF3C7", text: "#D97706" },
  { bg: "#DBEAFE", text: "#1D4ED8" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#EDE9FE", text: "#6D28D9" },
  { bg: "#FCE7F3", text: "#BE185D" },
  { bg: "#FEE2E2", text: "#B91C1C" },
];

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div style={{ width: 34, height: 34, borderRadius: 10, background: color.bg, color: color.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, letterSpacing: "0.02em" }}>
      {initials}
    </div>
  );
}

// ─── Shared dropdown button style helper ──────────────────────────────────────

const dropdownBtnStyle = (active: boolean): React.CSSProperties => ({
  height: 34,
  padding: "0 11px",
  borderRadius: 9,
  border: `1.5px solid ${active ? "var(--color-amber)" : "var(--color-cream-2)"}`,
  background: active ? "var(--amber-soft)" : "white",
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 12,
  fontWeight: 600,
  color: active ? "var(--color-amber)" : "var(--color-dark)",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  transition: "border-color 0.15s, background 0.15s, color 0.15s",
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const router = useRouter();
  const { business, loading: bizLoading } = useBusiness();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clients, setClients] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [showFilter, setShowFilter] = useState<ShowFilter>("all");
  const [totalCount, setTotalCount] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editClient, setEditClient] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // dropdown open states
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);

  // label filter (multi-select, empty = all)
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set());

  // visible columns (multi-select)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_COLUMNS));

  // custom date range (for "custom" filter)
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest(".dd-sort")) setShowSortDropdown(false);
      if (!t.closest(".dd-filter")) setShowFilterDropdown(false);
      if (!t.closest(".dd-columns")) setShowColumnsDropdown(false);
      if (!t.closest(".dd-print")) setShowPrintDropdown(false);
      if (!t.closest(".dd-label")) setShowLabelDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Fetch clients ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchClients() {
      if (!business) { setLoading(false); return; }
      setLoading(true);

      let query = supabase
        .from("customers")
        .select("*", { count: "exact" })
        .eq("business_id", business.id);

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      // Label filter (multi-select OR — "new" is derived from label IS NULL + total_visits = 0)
      if (labelFilter.size > 0) {
        const parts: string[] = [];
        if (labelFilter.has("new"))       parts.push("and(label.is.null,total_visits.eq.0)");
        if (labelFilter.has("completed")) parts.push("label.eq.completed");
        if (labelFilter.has("no_show"))   parts.push("label.eq.no_show");
        if (labelFilter.has("canceled"))  parts.push("label.eq.canceled");
        if (parts.length > 0) query = query.or(parts.join(","));
      }

      // Date filter
      if (showFilter !== "all" && showFilter !== "custom") {
        const since = getFilterDate(showFilter);
        if (since) query = query.gte("last_visit_at", since.toISOString());
      } else if (showFilter === "custom" && customFrom) {
        query = query.gte("last_visit_at", new Date(customFrom).toISOString());
        if (customTo) query = query.lte("last_visit_at", new Date(customTo).toISOString());
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
  }, [business, debouncedSearch, sortBy, showFilter, customFrom, customTo, labelFilter, supabase, refreshKey]);

  async function deleteClient(client: Customer) {
    setDeleting(true);
    const { error } = await supabase.from("customers").delete().eq("id", client.id).eq("business_id", client.business_id);
    setDeleting(false);
    if (error) { showToast("Couldn't delete client", "error"); return; }
    showToast("Client deleted", "success");
    setDeleteTarget(null);
    setRefreshKey((k) => k + 1);
  }

  if (bizLoading) return <ClientsSkeleton />;

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Recent";
  const currentShowLabel = SHOW_OPTIONS.find((o) => o.value === showFilter)?.label ?? "All";
  const isFilterActive = showFilter !== "all";
  const isSortActive = sortBy !== "recent";
  const isLabelFilterActive = labelFilter.size > 0;
  const labelFilterBtnText = labelFilter.size === 0
    ? "Label"
    : labelFilter.size === 1
      ? ALL_LABEL_OPTIONS.find((o) => labelFilter.has(o.value))?.text ?? "Label"
      : `${labelFilter.size} labels`;

  function toggleLabelFilter(value: string) {
    setLabelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  // Build column grid template
  const orderedCols: ColumnKey[] = ALL_COLUMNS.map((c) => c.key).filter((k) => visibleColumns.has(k));
  const gridCols = ["34px", ...orderedCols.map(getColWidth), "80px"].join(" ");
  // Ensure the table is wide enough that minmax columns don't collapse
  const tableMinWidth = Math.max(560, 34 + orderedCols.reduce((s, k) => s + COL_MIN_PX[k], 0) + 80 + (orderedCols.length + 1) * 14);

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size === 1) return prev;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <style>{`
        /* ── Desktop table row ─────────────────────────────────────────────── */
        .client-row {
          width: 100%;
          display: grid;
          gap: 0 14px;
          align-items: center;
          padding: 11px 14px;
          border-radius: 13px;
          background: white;
          border: 1.5px solid transparent;
          box-shadow: 0 1px 3px rgba(30,26,20,0.06);
          cursor: pointer;
          text-align: left;
          transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
        }
        .client-row:hover {
          box-shadow: 0 4px 16px rgba(30,26,20,0.09), 0 1px 2px rgba(30,26,20,0.04);
          transform: translateY(-1px);
          border-color: var(--color-cream-2);
        }
        .client-row:hover .row-arrow { color: var(--color-amber); transform: translateX(2px); }
        .client-row:hover .row-actions { opacity: 1; }
        .row-arrow { display: flex; justify-content: flex-end; color: var(--color-cream-2); transition: color 0.15s ease, transform 0.15s ease; }
        .row-actions { opacity: 0; display: flex; gap: 4px; transition: opacity 0.15s ease; }
        .row-action-btn { height: 26px; width: 26px; border-radius: 7px; border: 1.5px solid var(--color-cream-2); background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--color-muted); transition: all 0.12s; flex-shrink: 0; }
        .row-action-btn:hover { border-color: var(--color-amber); color: var(--color-amber); background: var(--amber-soft); }
        .row-action-btn.delete:hover { border-color: #EF4444; color: #EF4444; background: #FEF2F2; }
        .col-check { width: 16px; height: 16px; border-radius: 5px; border: 1.5px solid var(--color-cream-2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.12s; }
        .col-check.checked { background: var(--color-amber); border-color: var(--color-amber); color: white; }
        .dd-menu-item { width: 100%; padding: 8px 12px; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--color-dark); background: transparent; border: none; cursor: pointer; text-align: left; transition: background 0.1s; }
        .dd-menu-item:hover { background: var(--color-cream); }
        .dd-menu-item.selected { font-weight: 700; color: var(--color-amber); }
        .dd-menu-item.selected-bg { background: var(--amber-soft); }
        /* Table scroll */
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .table-min { min-width: ${tableMinWidth}px; }
        /* Desktop: hide mobile card elements */
        .row-mobile { display: none; }
        .row-desktop { display: contents; }
        /* ── Toolbar ───────────────────────────────────────────────────────── */
        .toolbar-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .toolbar-search { position: relative; flex: 1 1 200px; min-width: 120px; }
        .toolbar-btns { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        /* ── Mobile ────────────────────────────────────────────────────────── */
        @media (max-width: 639px) {
          .toolbar-search { flex-basis: 100%; order: -1; }
          .toolbar-btns { flex-shrink: 0; }
          .print-btn-wrap { display: none; }
          .client-header-row { display: none !important; }
          .client-row { display: flex !important; align-items: center; gap: 10px; padding: 12px 14px; }
          .row-desktop { display: none !important; }
          .row-mobile { display: flex !important; flex: 1; align-items: center; gap: 10px; min-width: 0; }
          .row-mobile-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
          .row-mobile-name { font-size: 14px; font-weight: 700; color: var(--color-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .row-mobile-sub { font-size: 12px; color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .row-actions { opacity: 1 !important; }
          .row-arrow { display: none !important; }
          .table-scroll { overflow-x: auto; }
          .table-min { min-width: 0; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-cream)" }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, background: "white", borderBottom: "1px solid var(--color-cream-2)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "26px 24px 18px" }}>

            {/* Title + Add */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-dark)", lineHeight: 1.1, margin: 0 }}>
                  Clients
                </h1>
                {!loading && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", background: "var(--color-cream-2)", padding: "2px 8px", borderRadius: 20 }}>
                    {totalCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAdd(true)}
                style={{ height: 34, padding: "0 14px", borderRadius: 9, background: "var(--color-amber)", color: "white", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(232,146,10,0.28)", transition: "all 0.15s ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(232,146,10,0.36)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(232,146,10,0.28)"; }}
              >
                <IconPlus />
                Add client
              </button>
            </div>

            {/* Toolbar */}
            <div className="toolbar-row">
              {/* Search */}
              <div className="toolbar-search">
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", display: "flex", pointerEvents: "none" }}>
                  <IconSearch />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone or email…"
                  style={{ width: "100%", height: 34, paddingLeft: 32, paddingRight: 10, borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "white", fontSize: 13, color: "var(--color-dark)", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                />
              </div>

              {/* Button group */}
              <div className="toolbar-btns">
                {/* Show dropdown */}
                <div className="dd-filter" style={{ position: "relative" }}>
                  <button
                    onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); setShowColumnsDropdown(false); setShowPrintDropdown(false); }}
                    style={dropdownBtnStyle(isFilterActive)}
                  >
                    <span style={{ color: "var(--color-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Show</span>
                    <span>{currentShowLabel}</span>
                    <span style={{ color: "inherit", opacity: 0.6, display: "flex" }}><IconChevronDown /></span>
                  </button>

                  {showFilterDropdown && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 170, background: "white", borderRadius: 12, boxShadow: "0 8px 32px rgba(30,26,20,0.12), 0 1px 2px rgba(30,26,20,0.06)", border: "1px solid var(--color-cream-2)", overflow: "hidden", zIndex: 30 }}>
                      {SHOW_OPTIONS.filter((o) => o.value !== "custom").map((option) => (
                        <button
                          key={option.value}
                          onClick={() => { setShowFilter(option.value); setShowFilterDropdown(false); }}
                          className={`dd-menu-item${showFilter === option.value ? " selected selected-bg" : ""}`}
                        >
                          {option.label}
                          {showFilter === option.value && <span style={{ marginLeft: "auto", color: "var(--color-amber)" }}><IconCheck /></span>}
                        </button>
                      ))}
                      {/* Custom range */}
                      <div style={{ borderTop: "1px solid var(--color-cream-2)", padding: "10px 12px" }}>
                        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", marginBottom: 8 }}>Custom range</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => { setCustomFrom(e.target.value); setShowFilter("custom"); }}
                            style={{ width: "100%", height: 30, padding: "0 8px", borderRadius: 7, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 12, color: "var(--color-dark)", outline: "none" }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                          />
                          <input
                            type="date"
                            value={customTo}
                            onChange={(e) => { setCustomTo(e.target.value); setShowFilter("custom"); }}
                            style={{ width: "100%", height: 30, padding: "0 8px", borderRadius: 7, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 12, color: "var(--color-dark)", outline: "none" }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
                          />
                          <button
                            onClick={() => setShowFilterDropdown(false)}
                            style={{ height: 28, borderRadius: 7, background: "var(--color-amber)", color: "white", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Label filter dropdown */}
                <div className="dd-label" style={{ position: "relative" }}>
                  <button
                    onClick={() => { setShowLabelDropdown(!showLabelDropdown); setShowFilterDropdown(false); setShowSortDropdown(false); setShowColumnsDropdown(false); setShowPrintDropdown(false); }}
                    style={dropdownBtnStyle(isLabelFilterActive)}
                  >
                    <span style={{ color: "var(--color-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Label</span>
                    {isLabelFilterActive && <span>{labelFilterBtnText}</span>}
                    <span style={{ color: "inherit", opacity: 0.6, display: "flex" }}><IconChevronDown /></span>
                  </button>

                  {showLabelDropdown && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 190, background: "white", borderRadius: 12, boxShadow: "0 8px 32px rgba(30,26,20,0.12), 0 1px 2px rgba(30,26,20,0.06)", border: "1px solid var(--color-cream-2)", padding: "6px 0", zIndex: 30 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", padding: "4px 12px 8px" }}>
                        Filter by label
                      </p>
                      {ALL_LABEL_OPTIONS.map((opt) => {
                        const on = labelFilter.has(opt.value);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => toggleLabelFilter(opt.value)}
                            style={{ width: "100%", padding: "7px 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: on ? 600 : 400, color: "var(--color-dark)", background: on ? "var(--color-cream)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-cream)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = on ? "var(--color-cream)" : "transparent")}
                          >
                            <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${on ? opt.color : "var(--color-cream-2)"}`, background: on ? opt.bg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}>
                              {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={opt.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: opt.bg, color: opt.color }}>
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                      {isLabelFilterActive && (
                        <div style={{ borderTop: "1px solid var(--color-cream-2)", padding: "6px 12px 4px" }}>
                          <button
                            onClick={() => { setLabelFilter(new Set()); setShowLabelDropdown(false); }}
                            style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                          >
                            Clear filter
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="dd-sort" style={{ position: "relative" }}>
                  <button
                    onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); setShowColumnsDropdown(false); setShowPrintDropdown(false); }}
                    style={dropdownBtnStyle(isSortActive)}
                  >
                    <span style={{ color: "var(--color-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Sort</span>
                    <span>{currentSortLabel}</span>
                    <span style={{ color: "inherit", opacity: 0.6, display: "flex" }}><IconChevronDown /></span>
                  </button>

                  {showSortDropdown && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 160, background: "white", borderRadius: 12, boxShadow: "0 8px 32px rgba(30,26,20,0.12), 0 1px 2px rgba(30,26,20,0.06)", border: "1px solid var(--color-cream-2)", overflow: "hidden", zIndex: 30 }}>
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                          className={`dd-menu-item${sortBy === option.value ? " selected selected-bg" : ""}`}
                        >
                          {option.label}
                          {sortBy === option.value && <span style={{ marginLeft: "auto", color: "var(--color-amber)" }}><IconCheck /></span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Columns picker */}
                <div className="dd-columns" style={{ position: "relative" }}>
                  <button
                    onClick={() => { setShowColumnsDropdown(!showColumnsDropdown); setShowSortDropdown(false); setShowFilterDropdown(false); setShowPrintDropdown(false); }}
                    title="Choose columns"
                    style={{ height: 34, padding: "0 10px", borderRadius: 9, border: `1.5px solid ${showColumnsDropdown ? "var(--color-amber)" : "var(--color-cream-2)"}`, background: showColumnsDropdown ? "var(--amber-soft)" : "white", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: showColumnsDropdown ? "var(--color-amber)" : "var(--color-muted)", cursor: "pointer", transition: "all 0.15s" }}
                  >
                    <IconColumns />
                    Columns
                  </button>

                  {showColumnsDropdown && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 180, background: "white", borderRadius: 12, boxShadow: "0 8px 32px rgba(30,26,20,0.12), 0 1px 2px rgba(30,26,20,0.06)", border: "1px solid var(--color-cream-2)", padding: "6px 0", zIndex: 30 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", padding: "4px 12px 8px" }}>
                        Visible columns
                      </p>
                      {ALL_COLUMNS.map((col) => {
                        const on = visibleColumns.has(col.key);
                        return (
                          <button
                            key={col.key}
                            onClick={() => toggleColumn(col.key)}
                            style={{ width: "100%", padding: "7px 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: on ? 600 : 400, color: "var(--color-dark)", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-cream)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                          >
                            <span className={`col-check${on ? " checked" : ""}`}>
                              {on && <IconCheck />}
                            </span>
                            {col.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Print / CSV — desktop only */}
                <div className="dd-print print-btn-wrap" style={{ position: "relative" }}>
                  <button
                    onClick={() => { setShowPrintDropdown(!showPrintDropdown); setShowSortDropdown(false); setShowFilterDropdown(false); setShowColumnsDropdown(false); }}
                    title="Print / Export"
                    style={{ height: 34, width: 34, borderRadius: 9, border: `1.5px solid ${showPrintDropdown ? "var(--color-amber)" : "var(--color-cream-2)"}`, background: showPrintDropdown ? "var(--amber-soft)" : "white", display: "flex", alignItems: "center", justifyContent: "center", color: showPrintDropdown ? "var(--color-amber)" : "var(--color-muted)", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s, color 0.15s, background 0.15s" }}
                    onMouseEnter={(e) => { if (!showPrintDropdown) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-amber)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-amber)"; } }}
                    onMouseLeave={(e) => { if (!showPrintDropdown) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-cream-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted)"; } }}
                  >
                    <IconPrint />
                  </button>

                  {showPrintDropdown && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 160, background: "white", borderRadius: 12, boxShadow: "0 8px 32px rgba(30,26,20,0.12), 0 1px 2px rgba(30,26,20,0.06)", border: "1px solid var(--color-cream-2)", overflow: "hidden", zIndex: 30 }}>
                      <button
                        onClick={() => { window.print(); setShowPrintDropdown(false); }}
                        className="dd-menu-item"
                      >
                        <IconPrint />
                        Print
                      </button>
                      <button
                        onClick={() => { downloadCSV(clients, orderedCols); setShowPrintDropdown(false); }}
                        className="dd-menu-item"
                      >
                        <IconDownload />
                        Download CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "16px 24px 64px" }}>
            {loading ? (
              <RowSkeleton />
            ) : clients.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 80 }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--amber-soft)", color: "var(--color-amber)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <IconUsers />
                </div>
                {debouncedSearch ? (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>No results for "{debouncedSearch}"</p>
                    <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Try a different name, phone or email</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>No clients yet</p>
                    <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 20 }}>Add your first client to get started</p>
                    <button
                      onClick={() => setShowAdd(true)}
                      style={{ height: 36, padding: "0 18px", borderRadius: 9, background: "var(--color-amber)", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(232,146,10,0.28)" }}
                    >
                      Add your first client
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="table-scroll">
                <div className="table-min">
                  {/* Column header row */}
                  <div
                    className="client-header-row"
                    style={{ display: "grid", gridTemplateColumns: gridCols, gap: "0 14px", padding: "0 14px 8px", alignItems: "center" }}
                  >
                    <div />
                    {orderedCols.map((key) => (
                      <span key={key} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ALL_COLUMNS.find((c) => c.key === key)?.label}
                      </span>
                    ))}
                    <div />
                  </div>

                  {/* Rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {clients.map((client) => {
                      const { firstName, lastName } = parseName(client.name);
                      return (
                        <ClientRow
                          key={client.id}
                          client={client}
                          firstName={firstName}
                          lastName={lastName}
                          visibleColumns={orderedCols}
                          gridCols={gridCols}
                          onClick={() => router.push(`/clients/${client.id}`)}
                          onEdit={() => setEditClient(client)}
                          onDelete={() => setDeleteTarget(client)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showAdd && business && (
          <AddCustomerSheet
            business={business}
            onClose={() => setShowAdd(false)}
            onCreated={() => { setRefreshKey((k) => k + 1); setShowAdd(false); }}
          />
        )}

        {editClient && business && (
          <AddCustomerSheet
            business={business}
            clientToEdit={editClient}
            onClose={() => setEditClient(null)}
            onCreated={() => { setRefreshKey((k) => k + 1); setEditClient(null); }}
          />
        )}

        {deleteTarget && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,26,20,0.48)", backdropFilter: "blur(4px)", padding: 20 }}
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <div
              style={{ width: "100%", maxWidth: 360, background: "var(--color-surface)", borderRadius: 20, padding: "24px", border: "1px solid var(--color-cream-2)", boxShadow: "0 8px 48px rgba(30,26,20,0.16)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--color-dark)", margin: "0 0 6px" }}>Delete {deleteTarget.name}?</p>
              <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>All their booking history will be permanently deleted. This can't be undone.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{ flex: 1, height: 42, borderRadius: 12, border: "1.5px solid var(--color-cream-2)", background: "transparent", fontSize: 14, fontWeight: 600, color: "var(--color-dark)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteClient(deleteTarget)}
                  disabled={deleting}
                  style={{ flex: 1, height: 42, borderRadius: 12, border: "none", background: "#EF4444", color: "white", fontSize: 14, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Client Row ───────────────────────────────────────────────────────────────

function ClientRow({
  client,
  firstName,
  lastName,
  visibleColumns,
  gridCols,
  onClick,
  onEdit,
  onDelete,
}: {
  client: Customer;
  firstName: string;
  lastName: string;
  visibleColumns: ColumnKey[];
  gridCols: string;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  function renderCell(key: ColumnKey) {
    switch (key) {
      case "firstName":
        return (
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
            {firstName || "—"}
          </span>
        );
      case "lastName":
        return (
          <span style={{ fontSize: 13, fontWeight: 500, color: lastName ? "var(--color-dark)" : "var(--color-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
            {lastName || "—"}
          </span>
        );
      case "phone":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
            <span style={{ color: "var(--color-muted)", display: "flex", flexShrink: 0 }}><IconPhone /></span>
            <span style={{ fontSize: 13, color: client.phone ? "var(--color-dark)" : "var(--color-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {formatPhone(client.phone)}
            </span>
          </div>
        );
      case "email":
        return (
          <span style={{ fontSize: 13, color: client.email ? "var(--color-dark)" : "var(--color-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
            {client.email || "—"}
          </span>
        );
      case "visits":
        return (
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)", whiteSpace: "nowrap" }}>
            {client.total_visits ?? 0}
          </span>
        );
      case "lastVisit":
        return (
          <span style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>
            {client.last_visit_at ? format(parseISO(client.last_visit_at), "MMM d, yyyy") : "—"}
          </span>
        );
      case "label": {
        const chip = getEffectiveLabel(client);
        if (!chip) return <span style={{ color: "var(--color-cream-2)", fontSize: 12 }}>—</span>;
        return (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: chip.bg, color: chip.color, whiteSpace: "nowrap", display: "inline-block", lineHeight: 1.4 }}>
            {chip.text}
          </span>
        );
      }
      default:
        return null;
    }
  }

  const mobilePhone = client.phone ? formatPhone(client.phone) : null;
  const mobileEmail = client.email;
  const mobileSub = [mobilePhone, mobileEmail].filter(Boolean).join(" · ") || "—";
  const mobileChip = getEffectiveLabel(client);

  return (
    <div
      className="client-row"
      style={{ gridTemplateColumns: gridCols } as React.CSSProperties}
      onClick={onClick}
    >
      {/* Avatar — shown in both layouts */}
      <Avatar name={client.name} />

      {/* Mobile card layout */}
      <div className="row-mobile">
        <div className="row-mobile-text">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="row-mobile-name">{client.name || "—"}</span>
            {mobileChip && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: mobileChip.bg, color: mobileChip.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                {mobileChip.text}
              </span>
            )}
          </div>
          <span className="row-mobile-sub">{mobileSub}</span>
        </div>
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="row-action-btn" title="Edit" onClick={onEdit}><IconEdit /></button>
          <button className="row-action-btn delete" title="Delete" onClick={onDelete}><IconTrash /></button>
        </div>
      </div>

      {/* Desktop table layout */}
      <div className="row-desktop">
        {visibleColumns.map((key) => (
          <div key={key} style={{ minWidth: 0, overflow: "hidden" }}>
            {renderCell(key)}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
            <button className="row-action-btn" title="Edit" onClick={onEdit}><IconEdit /></button>
            <button className="row-action-btn delete" title="Delete" onClick={onDelete}><IconTrash /></button>
          </div>
          <div className="row-arrow"><IconArrowRight /></div>
        </div>
      </div>
    </div>
  );
}
