"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types";

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("businesses")
      .select("*")
      .single()
      .then(({ data }) => {
        setBusiness(data ?? null);
        setLoading(false);
      });
  }, []);

  return { business, loading };
}
