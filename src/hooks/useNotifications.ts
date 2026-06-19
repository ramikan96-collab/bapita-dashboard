"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    intervalRef.current = setInterval(refetch, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch]);

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

  return { notifications, unreadCount, loading, refetch, markAllRead, deleteOne, deleteAll };
}
