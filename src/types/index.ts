export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "none" | "cash" | "transfer" | "stripe";

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface BookingService {
  name: string;
  duration: number;
  price: number;
}

export interface Booking {
  id: string;
  business_id: string;
  service_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  appointment_date: string;
  appointment_time: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  checkout_at: string | null;
  created_at: string;
  service: BookingService | null;
  label_id?: string | null;
  label?: Label | null;
}

export interface DayHours {
  open: boolean;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface BusinessHours {
  monday:    DayHours;
  tuesday:   DayHours;
  wednesday: DayHours;
  thursday:  DayHours;
  friday:    DayHours;
  saturday:  DayHours;
  sunday:    DayHours;
}

export type DayKey = keyof BusinessHours;

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  google_review_link: string | null;
  google_maps_url: string | null;
  waze_url: string | null;
  status: "draft" | "live";
  business_hours?: BusinessHours;
  // booking page fields
  template_style?: string | null;
  tagline?: string | null;
  tagline_he?: string | null;
  hero_image_url?: string | null;
  gallery_images?: string[] | null;
  about_text?: string | null;
  about_text_he?: string | null;
  accent_color?: string | null;
  show_gallery?: boolean | null;
  show_about?: boolean | null;
  show_hours?: boolean | null;
  show_location?: boolean | null;
  section_order?: string[] | null;
  // bilingual name
  name_he?: string | null;
  // Bapita plan (Rami-only)
  plan_tier?:          string | null;
  plan_price?:         number | null;
  plan_addons?:        string[] | null;
  plan_booking_limit?: number | null;
  plan_start_date?:    string | null;
  plan_renewal_date?:  string | null;
  plan_notes?:         string | null;
  default_lang?:       string | null;
  // booking page display stats (editable by admin)
  stat_years?:         number | null;
  stat_clients?:       number | null;
  stat_rating?:        string | null;
}

export interface BlockedTime {
  id: string;
  business_id: string;
  block_date: string;  // yyyy-MM-dd
  start_time: string;  // "HH:MM[:SS]"
  end_time: string;    // "HH:MM[:SS]"
  label: string | null;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes?: string;
  total_visits: number;
  last_visit_at: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  name_he?: string | null;
  duration: number;
  price: number;
  description?: string | null;
  description_he?: string | null;
  active: boolean;
  display_order: number;
  created_at?: string;
}

export const STATUS_COLOR: Record<BookingStatus, string> = {
  pending:   "#94A3B8",
  confirmed: "#E8920A",
  completed: "#22C55E",
  cancelled: "#EF4444",
  no_show:   "#EF4444",
};

export const STATUS_BG: Record<BookingStatus, string> = {
  pending:   "rgba(148,163,184,0.15)",
  confirmed: "rgba(232,146,10,0.15)",
  completed: "rgba(34,197,94,0.15)",
  cancelled: "rgba(239,68,68,0.12)",
  no_show:   "rgba(239,68,68,0.12)",
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show:   "No-show",
};
