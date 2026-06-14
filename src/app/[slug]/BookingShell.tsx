"use client";

import type { Business, Service } from "@/types";
import { ClassicPage } from "./themes/classic/ClassicPage";

interface Props {
  business: Business;
  services: Service[];
}

export default function BookingShell({ business, services }: Props) {
  // Clean and Dark templates built in next chats — fall through to Classic
  return <ClassicPage business={business} services={services} />;
}
