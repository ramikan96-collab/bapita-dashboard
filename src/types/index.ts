export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "none" | "cash" | "transfer" | "stripe";

export interface BookingService {
  name: string;
  duration: number; // minutes
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
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS from Supabase
  status: BookingStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  checkout_at: string | null;
  created_at: string;
  service: BookingService | null;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
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
  cancelled:  "Cancelled",
  no_show:   "No-show",
};
