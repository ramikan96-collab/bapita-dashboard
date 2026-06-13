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
  google_review_link: string | null;
  business_hours?: BusinessHours;
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
  duration: number;
  price: number;
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
