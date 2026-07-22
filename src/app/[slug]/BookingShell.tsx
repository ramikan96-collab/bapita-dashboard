"use client";

import { useState, useEffect } from "react";
import type { ComponentType } from "react";
import type { Business, Service } from "@/types";
import { track } from "@/lib/analytics/track";
import { ClassicPage } from "./themes/classic/ClassicPage";
import { CleanPage }   from "./themes/clean/CleanPage";
import { DarkPage }    from "./themes/dark/DarkPage";
import { DemoThemeSwitcher } from "./_shared/DemoThemeSwitcher";
import { ShimiAzutHairstudioPage } from "./customs/shimi-azut-hairstudio";

type PageComponent = ComponentType<{ business: Business; services: Service[] }>;
type ThemeKey = "classic" | "clean" | "dark";

// ─── Add new barbers here ─────────────────────────────────────────────────
// Each entry: slug (must match businesses.slug in DB) → dedicated page component
const CUSTOM_PAGES: Record<string, PageComponent> = {
  "shimi-azut-hairstudio": ShimiAzutHairstudioPage,
  // "studio-avi": StudioAviPage,
};
// ──────────────────────────────────────────────────────────────────────────

interface Props {
  business: Business;
  services: Service[];
}

export default function BookingShell({ business, services }: Props) {
  const initialTheme = (business.template_style as ThemeKey) ?? "classic";
  const [previewTheme, setPreviewTheme] = useState<ThemeKey>(initialTheme);

  // Analytics: one page_view per visit. Fired here (above the custom-page early
  // return) so custom pages and custom-domain traffic are covered too. No-ops on
  // draft/preview pages via the track() guard.
  useEffect(() => {
    track("page_view", { businessId: business.id, slug: business.slug, status: business.status });
  }, [business.id, business.slug, business.status]);

  // 1. Dedicated custom page for this barber?
  const CustomPage = CUSTOM_PAGES[business.slug ?? ""];
  if (CustomPage) return <CustomPage business={business} services={services} />;

  // 2. Show theme switcher for draft businesses (no custom page active)
  const showSwitcher = business.status === "draft";

  // 3. Render by previewTheme (draft: swappable; live: locked to saved template_style)
  const theme = business.status === "live" ? initialTheme : previewTheme;

  return (
    <>
      {showSwitcher && (
        <DemoThemeSwitcher active={previewTheme} onSwitch={setPreviewTheme} />
      )}
      {theme === "clean" && <CleanPage business={business} services={services} />}
      {theme === "dark"  && <DarkPage  business={business} services={services} />}
      {(theme === "classic" || !["clean","dark"].includes(theme)) && (
        <ClassicPage business={business} services={services} />
      )}
    </>
  );
}
