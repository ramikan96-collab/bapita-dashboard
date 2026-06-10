"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { ClientsSkeleton } from "@/components/LoadingSkeleton";
import type { Customer } from "@/types";

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatPhone(phone: string): string {
  if (!phone) return "No phone";
  if (phone.length === 10 && phone.startsWith("05")) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return phone;
}

export default function ClientsPage() {
  const router = useRouter();
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recent" | "name" | "visits">("recent");
  const [totalCount, setTotalCount] = useState(0);

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
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
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
  }, [business, search, sortBy, supabase]);

  if (bizLoading) return <ClientsSkeleton />;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--color-dark)" }}>Clients</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{totalCount} client{totalCount !== 1 ? "s" : ""}</p>
      </div>
      
      <div className="shrink-0 px-4 py-3 space-y-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..." className="w-full px-4 py-3 rounded-xl border" style={{ borderColor: "var(--color-cream-2)" }} />
        
        <div className="flex gap-2">
          {(["recent", "name", "visits"] as const).map((option) => (
            <button key={option} onClick={() => setSortBy(option)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${sortBy === option ? "text-white" : "opacity-60"}`} style={{ background: sortBy === option ? "var(--color-amber)" : "var(--color-cream-2)", color: sortBy === option ? "#fff" : "var(--color-dark)" }}>
              {option === "recent" && "Recently active"}
              {option === "name" && "Name A-Z"}
              {option === "visits" && "Most visits"}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} /></div>
        ) : clients.length === 0 ? (
          search ? (
            <div className="text-center py-12">
              <p className="font-bold" style={{ color: "var(--color-dark)" }}>No results for &quot;{search}&quot;</p>
              <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>Try a different name or phone number.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="text-5xl mb-4">👥</div>
              <div className="text-base font-bold mb-1" style={{ color: "var(--color-dark)" }}>No clients yet</div>
              <div className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>Clients appear here when you create your first booking.</div>
              <a href="/new-booking" className="px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "var(--color-amber)" }}>
                New booking
              </a>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <button key={client.id} onClick={() => router.push(`/clients/${client.id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl border transition hover:border-amber-300" style={{ borderColor: "var(--color-cream-2)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "var(--color-amber)", color: "#fff" }}>{initials(client.name)}</div>
                <div className="flex-1 text-left"><div className="font-bold text-sm" style={{ color: "var(--color-dark)" }}>{client.name}</div><div className="text-xs" style={{ color: "var(--color-muted)" }}>{formatPhone(client.phone)} • {client.total_visits || 0} visit{client.total_visits !== 1 ? "s" : ""}</div></div>
                <div className="text-xs opacity-40">→</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
