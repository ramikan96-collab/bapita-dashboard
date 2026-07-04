"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types";

const ADMIN_PERSONAL_SLUGS: Record<string, string> = {
  "ramikan96@gmail.com": "bapita-admin",
  "info.bapita@gmail.com": "bapita-admin",
};

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  const fetchBusiness = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const personalSlug = user.email ? ADMIN_PERSONAL_SLUGS[user.email] : undefined;
    setIsAdmin(!!personalSlug);

    if (personalSlug) {
      const { data } = await supabase.from("businesses").select("*")
        .eq("owner_id", user.id)
        .eq("slug", personalSlug);
      setBusiness(data?.[0] ?? null);
    } else {
      // Try: business owned by this user's auth id
      const { data: ownedData } = await supabase.from("businesses").select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (ownedData?.[0]) {
        setBusiness(ownedData[0]);
      } else if (user.email) {
        // Fallback: business where admin set owner_email = this user's email
        const { data: emailData } = await supabase.from("businesses").select("*")
          .eq("owner_email", user.email)
          .order("created_at", { ascending: true })
          .limit(1);
        setBusiness(emailData?.[0] ?? null);
      } else {
        setBusiness(null);
      }
    }
    setLoading(false);
  }, [supabase]);

  const refresh = useCallback(async () => {
    // No setLoading(true) here — that unmounts child components mid-operation.
    // fetchBusiness() will call setLoading(false) when done; loading stays false throughout.
    await fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    // Initial data load from Supabase (external system) — the setState inside
    // fetchBusiness runs after the async fetch resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBusiness();
  }, [fetchBusiness]);

  // Any part of the app can broadcast that the business row changed
  // (e.g. Settings saving dashboard_lang) — every instance refetches.
  useEffect(() => {
    const onUpdated = () => { fetchBusiness(); };
    window.addEventListener("bapita:business-updated", onUpdated);
    return () => window.removeEventListener("bapita:business-updated", onUpdated);
  }, [fetchBusiness]);

  return { business, loading, refresh, isAdmin };
}
