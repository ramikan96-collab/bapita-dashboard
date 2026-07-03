"use client";

import { useState, useEffect } from "react";

export function useSlots(
  businessId: string,
  date: string | null,
  duration: number | null,
  serviceId: string | null = null,
  staffId: string | null = null,
) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !duration) { setSlots([]); return; }

    let cancelled = false;
    setLoading(true);
    setSlots([]);
    setError(null);

    let url = `/api/public/slots?businessId=${businessId}&date=${date}&duration=${duration}`;
    if (serviceId) url += `&serviceId=${serviceId}`;
    if (staffId)   url += `&staffId=${staffId}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) { setSlots(data.slots || []); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError("Failed to load times"); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [businessId, date, duration, serviceId, staffId]);

  return { slots, loading, error };
}
