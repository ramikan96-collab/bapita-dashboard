import { CalendarCheck, Share2, Bot, MapPin } from "lucide-react";
import type { ProductId } from "@/lib/hub/products";
import type { LucideIcon } from "lucide-react";

export const PRODUCT_ICONS: Record<ProductId, LucideIcon> = {
  book: CalendarCheck,
  social: Share2,
  bots: Bot,
  reach: MapPin,
};
