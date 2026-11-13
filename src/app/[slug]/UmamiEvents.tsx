"use client";

import { useEffect } from "react";
import { pageLang, umamiTrack } from "@/lib/analytics/umami";

/** WhatsApp-link clicks on a tenant page, as the Umami event cta_whatsapp. Booking clicks are fired from useExternalCta. */
export function UmamiEvents() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !(a.getAttribute("href") ?? "").startsWith("https://wa.me/")) return;
      const placement = a.closest("footer") ? "footer" : a.closest("dialog,[role=dialog]") ? "dialog" : a.closest("[id]")?.id || "floating";
      umamiTrack("cta_whatsapp", { placement, lang: pageLang(), page: location.pathname });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
