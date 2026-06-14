"use client";

import { useState, useEffect } from "react";

export function useSlots(businessId: string, date: string | null, duration: number | null) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !duration) { setSlots([]); return; }

    let cancelled = false;
    setLoading(true);
    setSlots([]);
    setError(null);

    fetch(`/api/public/slots?businessId=${businessId}&date=${date}&duration=${duration}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) { setSlots(data.slots || []); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError("Failed to load times"); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [businessId, date, duration]);

  return { slots, loading, error };
}
