"use client";

import type { Business, Service } from "@/types";
import { ClassicPage } from "./themes/classic/ClassicPage";
import { StudioAviPage } from "./customs/studio-avi";

// ─── Add new barbers here ─────────────────────────────────────────────────
// Each entry: slug (must match businesses.slug in DB) → dedicated page component
const CUSTOM_PAGES: Record<string, React.ComponentType<{ business: Business; services: Service[] }>> = {
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
    case "classic":
    default:
      return <ClassicPage business={business} services={services} />;
  }
}
