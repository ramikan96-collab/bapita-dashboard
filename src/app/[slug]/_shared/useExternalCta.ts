"use client";

import { useCallback } from "react";
import type { Business } from "@/types";
import type { Translations, Lang } from "../translations";
import { resolveCta, type ResolvedCta } from "@/lib/cta";
import { track } from "@/lib/analytics/track";

interface Options {
  stayMode?: boolean;
  /** Overrides the theme's default fallback label. Dark passes t.hero.bookNow. */
  fallback?: string;
}

/**
 * Wires a theme's CTA to whatever the business actually uses.
 *
 * Returns the resolved CTA plus a guard the theme puts at the top of each of its
 * open handlers. The guard returns true when it has handled the click by opening
 * the external destination — the theme then returns early and never opens
 * Bapita's booking overlay.
 *
 *   const { cta, handledExternally } = useExternalCta(business, t, lang, { stayMode });
 *   function openFromCTA() { if (handledExternally()) return; ...existing native path... }
 *   {cta.mode === "native" && overlayOpen && <BookingOverlay ... />}
 *
 * Both halves are required. Suppressing the overlay without the guard leaves a
 * dead button; guarding without suppressing opens the overlay behind the new tab.
 */
export function useExternalCta(
  business: Business,
  t: Translations,
  lang: Lang,
  opts: Options = {}
): { cta: ResolvedCta; handledExternally: (serviceId?: string) => boolean } {
  const cta = resolveCta(business, t, { ...opts, isRtl: lang === "he" });

  const handledExternally = useCallback(
    (serviceId?: string) => {
      if (cta.mode !== "external" || !cta.url) return false;

      // Record the click before navigating away: for an external-CTA business
      // this is the conversion, and there is no funnel behind it to measure.
      // track() is fire-and-forget via sendBeacon and swallows its own errors,
      // so it can never stop the window from opening.
      track("cta_click", { businessId: business.id, slug: business.slug, status: business.status, lang }, {
        meta: { target_kind: cta.targetKind, service_id: serviceId ?? null },
      });

      window.open(cta.url, "_blank", "noopener,noreferrer");
      return true;
    },
    [cta.mode, cta.url, cta.targetKind, business.id, business.slug, business.status, lang]
  );

  return { cta, handledExternally };
}
