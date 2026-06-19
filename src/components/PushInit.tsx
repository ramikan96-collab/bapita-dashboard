"use client";

import { useEffect } from "react";

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

async function sendSubscription(sub: PushSubscription) {
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
}

export function PushInit() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    )
      return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    async function init() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // If there's already a subscription, re-send it (handles page reload / re-installs)
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await sendSubscription(existing);
          return;
        }

        // Request permission — on iOS this only works in standalone mode;
        // on Android it works from the browser tab too.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        });

        await sendSubscription(subscription);
      } catch {
        // Non-fatal — app works without push
      }
    }

    // Small delay so SW has time to install on first load
    const t = setTimeout(init, 1500);
    return () => clearTimeout(t);
  }, []);

  return null;
}
