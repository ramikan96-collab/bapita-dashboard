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

    let query = supabase.from("businesses").select("*").eq("owner_id", user.id);
    if (personalSlug) {
      query = query.eq("slug", personalSlug);
    } else {
      query = query.order("created_at", { ascending: true }).limit(1);
    }
    const { data } = await query;

    setBusiness(data?.[0] ?? null);
    setLoading(false);
  }, [supabase]);

  const refresh = useCallback(async () => {
    // No setLoading(true) here — that unmounts child components mid-operation.
    // fetchBusiness() will call setLoading(false) when done; loading stays false throughout.
    await fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  return { business, loading, refresh, isAdmin };
}
