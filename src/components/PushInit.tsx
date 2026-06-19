"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function sendSubscription(sub: PushSubscription) {
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
}

export type EnablePushResult =
  | "ok"
  | "denied"
  | "unsupported"
  | "no-key"
  | "needs-install"
  | "error";

/**
 * Subscribe to push. MUST be called from a user gesture (button tap) —
 * iOS Safari rejects Notification.requestPermission() outside one, and only
 * allows push at all when the PWA is installed to the home screen.
 */
export async function enablePush(): Promise<EnablePushResult> {
  if (!pushSupported()) return "unsupported";
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return "no-key";
  if (isIOS() && !isStandalone()) return "needs-install";

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    await sendSubscription(sub);
    return "ok";
  } catch {
    return "error";
  }
}

/**
 * On load: register the service worker and re-send any existing subscription
 * (handles reloads / re-installs). Does NOT prompt for permission — that now
 * happens only via enablePush() behind a user gesture.
 */
export function PushInit() {
  useEffect(() => {
    if (!pushSupported()) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const existing = await reg.pushManager.getSubscription();
        if (existing && !cancelled) await sendSubscription(existing);
      } catch {
        // Non-fatal — app works without push
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export type PushStatus =
  | "loading"
  | "unsupported"
  | "needs-install"
  | "enabled"
  | "disabled";

/** Tracks whether push is already enabled, for the opt-in button. */
export function usePushStatus() {
  const [status, setStatus] = useState<PushStatus>("loading");

  const refresh = useCallback(async () => {
    if (!pushSupported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setStatus("unsupported");
      return;
    }
    if (isIOS() && !isStandalone()) {
      setStatus("needs-install");
      return;
    }
    if (Notification.permission !== "granted") {
      setStatus("disabled");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "enabled" : "disabled");
    } catch {
      setStatus("disabled");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, refresh };
}
