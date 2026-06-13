"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { ClientsSkeleton } from "@/components/LoadingSkeleton";
import AddCustomerSheet from "@/components/AddCustomerSheet";
import type { Customer } from "@/types";

type SortBy = "recent" | "name" | "visits";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "name", label: "A to Z" },
  { value: "visits", label: "Most booked" },
];

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

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
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

// ─── Skeletons ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            height: 68,
            borderRadius: 14,
            background: "white",
            boxShadow: "0 1px 3px rgba(30,26,20,0.06)",
          }}
        />
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

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = getAvatarColor(name);
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: color.bg,
        color: color.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
        if (!target.closest(".sort-dropdown-wrap")) {
          setShowSortDropdown(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSortDropdown]);

  if (bizLoading) return <ClientsSkeleton />;

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Recent";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--color-cream)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          background: "white",
          borderBottom: "1px solid var(--color-cream-2)",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", width: "100%", padding: "28px 24px 20px" }}>
          {/* Title + Add button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "var(--color-dark)",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Clients
              </h1>
              {!loading && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-muted)",
                    background: "var(--color-cream-2)",
                    padding: "2px 8px",
                    borderRadius: 20,
                  }}
                >
                  {totalCount}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowAdd(true)}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 10,
                background: "var(--color-amber)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(232,146,10,0.28)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(232,146,10,0.36)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(232,146,10,0.28)";
              }}
            >
              <IconPlus />
              Add client
            </button>
          </div>

          {/* Search + Sort row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <span
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-muted)",
                  display: "flex",
                  pointerEvents: "none",
                }}
              >
                <IconSearch />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone…"
                style={{
                  width: "100%",
                  height: 36,
                  paddingLeft: 34,
                  paddingRight: 12,
                  borderRadius: 10,
                  border: "1.5px solid var(--color-cream-2)",
                  background: "var(--color-cream)",
                  fontSize: 13,
                  color: "var(--color-dark)",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-cream-2)")}
              />
            </div>

            {/* Sort dropdown */}
            <div className="sort-dropdown-wrap" style={{ position: "relative" }}>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1.5px solid var(--color-cream-2)",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-dark)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-amber)")}
                onMouseLeave={(e) => {
                  if (!showSortDropdown)
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-cream-2)";
                }}
              >
                <span style={{ color: "var(--color-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Sort
                </span>
                <span style={{ color: "var(--color-dark)" }}>{currentSortLabel}</span>
                <span style={{ color: "var(--color-muted)", display: "flex" }}>
                  <IconChevronDown />
                </span>
              </button>

              {showSortDropdown && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 6px)",
                    width: 148,
                    background: "white",
                    borderRadius: 12,
                    boxShadow: "0 8px 32px rgba(30,26,20,0.12), 0 1px 2px rgba(30,26,20,0.06)",
                    border: "1px solid var(--color-cream-2)",
                    overflow: "hidden",
                    zIndex: 20,
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 14px",
                        textAlign: "left",
                        fontSize: 13,
                        fontWeight: sortBy === option.value ? 700 : 500,
                        color: sortBy === option.value ? "var(--color-amber)" : "var(--color-dark)",
                        background: sortBy === option.value ? "var(--amber-soft)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        if (sortBy !== option.value)
                          (e.currentTarget as HTMLButtonElement).style.background = "var(--color-cream)";
                      }}
                      onMouseLeave={(e) => {
                        if (sortBy !== option.value)
                          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }}
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

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", width: "100%", padding: "20px 24px 64px" }}>
          {loading ? (
            <RowSkeleton />
          ) : clients.length === 0 ? (
            /* Empty state */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                paddingTop: 80,
                paddingBottom: 40,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: "var(--amber-soft)",
                  color: "var(--color-amber)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <IconUsers />
              </div>
              {debouncedSearch ? (
                <>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>
                    No results for "{debouncedSearch}"
                  </p>
                  <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Try a different name or phone number</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>
                    No clients yet
                  </p>
                  <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 20 }}>
                    Add your first client to get started
                  </p>
                  <button
                    onClick={() => setShowAdd(true)}
                    style={{
                      height: 38,
                      padding: "0 18px",
                      borderRadius: 10,
                      background: "var(--color-amber)",
                      color: "white",
                      fontSize: 13,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(232,146,10,0.28)",
                    }}
                  >
                    Add your first client
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 1fr 130px 24px",
                  gap: "0 16px",
                  padding: "0 16px 8px",
                  alignItems: "center",
                }}
              >
                <div />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--color-muted)",
                  }}
                >
                  Name
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--color-muted)",
                  }}
                >
                  Phone
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--color-muted)",
                  }}
                >
                  Activity
                </span>
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
                      onClick={() => router.push(`/clients/${client.id}`)}
                    />
                  );
                })}
              </div>
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

// ─── Client Row ───────────────────────────────────────────────────────────────

function ClientRow({
  client,
  firstName,
  lastName,
  onClick,
}: {
  client: Customer;
  firstName: string;
  lastName: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const isNew = !client.total_visits || client.total_visits === 0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "36px 1fr 1fr 130px 24px",
        gap: "0 16px",
        alignItems: "center",
        padding: "12px 16px",
        borderRadius: 14,
        background: "white",
        border: "1.5px solid transparent",
        boxShadow: hovered
          ? "0 4px 16px rgba(30,26,20,0.09), 0 1px 2px rgba(30,26,20,0.04)"
          : "0 1px 3px rgba(30,26,20,0.06)",
        cursor: "pointer",
        textAlign: "left",
        transition: "box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        borderColor: hovered ? "var(--color-cream-2)" : "transparent",
      }}
    >
      {/* Avatar */}
      <Avatar name={client.name} />

      {/* Name */}
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--color-dark)",
            margin: 0,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {firstName}
          {lastName && (
            <span style={{ fontWeight: 500, color: "var(--color-muted)", marginLeft: 5 }}>
              {lastName}
            </span>
          )}
        </p>
      </div>

      {/* Phone */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
        <span style={{ color: "var(--color-muted)", display: "flex", flexShrink: 0 }}>
          <IconPhone />
        </span>
        <span
          style={{
            fontSize: 13,
            color: client.phone ? "var(--color-dark)" : "var(--color-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {formatPhone(client.phone)}
        </span>
      </div>

      {/* Activity */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {isNew ? (
          <span
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 20,
              background: "#E8F0FE",
              color: "#1A73E8",
              letterSpacing: "0.02em",
            }}
          >
            New
          </span>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)" }}>
            {client.total_visits} visit{client.total_visits !== 1 ? "s" : ""}
          </span>
        )}
        {client.last_visit_at && (
          <span style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500 }}>
            {format(parseISO(client.last_visit_at), "MMM d, yyyy")}
          </span>
        )}
      </div>

      {/* Arrow */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          color: hovered ? "var(--color-amber)" : "var(--color-cream-2)",
          transition: "color 0.15s ease, transform 0.15s ease",
          transform: hovered ? "translateX(2px)" : "translateX(0)",
        }}
      >
        <IconArrowRight />
      </div>
    </button>
  );
}
