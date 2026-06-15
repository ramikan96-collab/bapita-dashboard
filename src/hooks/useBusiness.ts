"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types";

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchBusiness = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    setBusiness(data?.[0] ?? null);
    setLoading(false);
  }, [supabase]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  return { business, loading, refresh };
}
