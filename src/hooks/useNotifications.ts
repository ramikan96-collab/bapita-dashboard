"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type AppNotification = {
  id: string;
  type: "booking_created" | "booking_cancelled" | "booking_rescheduled";
  title: string;
  body: string;
  booking_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        if (data.businessId) setBusinessId(data.businessId);
      }
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  // initial fetch + 60s poll as fallback if Realtime drops
  useEffect(() => {
    // Fetching from an external API; setState runs after the response resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
    intervalRef.current = setInterval(refetch, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch]);

  // Realtime — set up once businessId is known
  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) =>
              [payload.new as AppNotification, ...prev].slice(0, 30)
            );
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== (payload.old as { id: string }).id)
            );
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === (payload.new as AppNotification).id
                  ? (payload.new as AppNotification)
                  : n
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const markOneRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  }, []);

  const deleteAll = useCallback(async () => {
    setNotifications([]);
    await fetch("/api/notifications", { method: "DELETE" });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return { notifications, unreadCount, loading, refetch, markAllRead, markOneRead, deleteOne, deleteAll };
}
