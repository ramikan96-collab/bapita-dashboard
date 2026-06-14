"use client";

import type { ComponentType } from "react";
import type { Business, Service } from "@/types";
import { ClassicPage } from "./themes/classic/ClassicPage";
import { CleanPage }   from "./themes/clean/CleanPage";
import { DarkPage }    from "./themes/dark/DarkPage";
import { StudioAviPage } from "./customs/studio-avi";

type PageComponent = ComponentType<{ business: Business; services: Service[] }>;

// ─── Add new barbers here ─────────────────────────────────────────────────
// Each entry: slug (must match businesses.slug in DB) → dedicated page component
const CUSTOM_PAGES: Record<string, PageComponent> = {
  "studio-avi": StudioAviPage,
};
// ──────────────────────────────────────────────────────────────────────────

interface Props {
  business: Business;
  services: Service[];
}

export default function BookingShell({ business, services }: Props) {
  // 1. Dedicated custom page for this barber?
  const CustomPage = CUSTOM_PAGES[business.slug ?? ""];
  if (CustomPage) return <CustomPage business={business} services={services} />;

  // 2. Fall back to template by template_style (demos / new barbers before custom page is created)
  switch (business.template_style) {
    case "clean":
      return <CleanPage business={business} services={services} />;
    case "dark":
      return <DarkPage business={business} services={services} />;
    case "classic":
    default:
      return <ClassicPage business={business} services={services} />;
  }
}
