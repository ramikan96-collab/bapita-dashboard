/**
 * The four audiences bapita.com sells to.
 *
 * This replaces the Hub's PRODUCTS list as the page's spine. The suite page
 * asked "which of our four tools do you want"; this page asks "which of you are
 * you", and answers with the same product every time. That is the whole point
 * of the relaunch: one product, a wider room.
 *
 * `mode` maps 1:1 onto `businesses.business_type` — the salon/clinic/restaurant
 * rows are `appointment`, the property row is `stay`. The mock renders from it,
 * so what a visitor sees on the marketing page is the shape of the page they
 * would actually be given.
 *
 * Every mock is deliberately branded "Your …" on a book.bapita.com path, which
 * is the address a tenant actually gets (`src/app/[slug]/page.tsx`) before they
 * point their own domain at it. Inventing plausible business names on plausible
 * .co.il domains would read as a client list we don't have.
 */

export type AudienceId = "salons" | "properties" | "clinics" | "restaurants";

export interface Audience {
  id: AudienceId;
  /** Tab label. */
  label: string;
  /** Who this actually covers, in their own words. */
  covers: string;
  /** The line under the tab row — the promise for this audience. */
  headline: string;
  blurb: string;
  /** Product color for this audience's accent. */
  accent: string;
  mode: "appointment" | "stay";
  /** What the booking page is choosing between. */
  items: Array<{ name: string; meta: string; price: string }>;
  /** Appointment: times. Stay: nights, rendered as a date strip. */
  slots: string[];
  mock: {
    name: string;
    initial: string;
    url: string;
    status: string;
    /** Label above the slot row. */
    slotLabel: string;
    cta: string;
  };
  /** Three things this audience stops doing by hand. */
  wins: string[];
}

export const AUDIENCES: Audience[] = [
  {
    id: "salons",
    label: "Salons & barbers",
    covers: "Barbershops, hair, nails, lashes, beauty",
    headline: "A chair that fills itself.",
    blurb:
      "Clients pick a service, see your real openings and book. No DM thread, no double booking, no calling anyone back at 22:00.",
    accent: "#e8920a",
    mode: "appointment",
    items: [
      { name: "Haircut", meta: "30 min", price: "₪80" },
      { name: "Beard trim", meta: "20 min", price: "₪50" },
      { name: "Cut + beard", meta: "45 min", price: "₪120" },
    ],
    slots: ["09:30", "11:00", "14:30", "16:00", "17:15"],
    mock: {
      name: "Your Hair Salon",
      initial: "H",
      url: "book.bapita.com/hairsalon",
      status: "Open · books 24/7",
      slotLabel: "Thursday",
      cta: "Book 16:00 · ₪80",
    },
    wins: [
      "Reminders that cut no shows",
      "Deposits on the big services",
      "Your own domain, your own brand",
    ],
  },
  {
    id: "properties",
    label: "Short term rentals",
    covers: "Apartments, studios, guest suites, cabins",
    headline: "Your own booking site. Not someone else's listing.",
    blurb:
      "Nightly rates, a real availability calendar and a minimum stay, on a page you own, with guests who found you instead of a platform that charges you for them.",
    accent: "#d4622a",
    mode: "stay",
    items: [
      { name: "Big Kasa", meta: "Sleeps 4 · 1 bed", price: "₪650" },
      { name: "Small Kasa", meta: "Sleeps 3 · 1 bed", price: "₪500" },
      { name: "Quiet Studio", meta: "Sleeps 2 · studio", price: "₪450" },
    ],
    slots: ["12", "13", "14", "15", "16"],
    mock: {
      name: "Your Apartments",
      initial: "A",
      url: "book.bapita.com/apartments",
      status: "3 units · 2 night minimum",
      slotLabel: "March · check in",
      cta: "Request 14 to 16 March · ₪1,300",
    },
    wins: [
      "Per unit availability that can't overlap",
      "Photo galleries per unit",
      "Requests by email, no commission",
    ],
  },
  {
    id: "clinics",
    label: "Clinics & practices",
    covers: "Physio, dental, aesthetics, therapy, wellness",
    headline: "The front desk, after hours.",
    blurb:
      "Patients book the right appointment length for the right practitioner, and get the reminder that makes them turn up. You stop losing the evening to the phone.",
    accent: "#1fa971",
    mode: "appointment",
    items: [
      { name: "First consultation", meta: "45 min", price: "₪320" },
      { name: "Follow up", meta: "30 min", price: "₪240" },
      { name: "Treatment session", meta: "60 min", price: "₪400" },
    ],
    slots: ["08:00", "09:15", "10:30", "13:00", "15:45"],
    mock: {
      name: "Your Clinic",
      initial: "C",
      url: "book.bapita.com/clinic",
      status: "3 practitioners · books 24/7",
      slotLabel: "Tuesday",
      cta: "Book 13:00 · ₪240",
    },
    wins: [
      "A calendar per practitioner",
      "Different lengths per treatment",
      "Client history in one place",
    ],
  },
  {
    id: "restaurants",
    label: "Restaurants",
    covers: "Dining rooms, bars, chef's tables, private events",
    headline: "Tables booked before you open.",
    blurb:
      "Sittings, party sizes and your real capacity, on your own page, with the guest's details in your hands rather than a reservations platform's.",
    accent: "#2d6cf0",
    mode: "appointment",
    items: [
      { name: "Dinner · 2 guests", meta: "90 min", price: "Free" },
      { name: "Dinner · 4 guests", meta: "2 hrs", price: "Free" },
      { name: "Chef's table", meta: "2.5 hrs", price: "₪280 pp" },
    ],
    slots: ["18:00", "18:30", "19:45", "20:30", "21:15"],
    mock: {
      name: "Your Restaurant",
      initial: "R",
      url: "book.bapita.com/restaurant",
      status: "Two sittings · books 24/7",
      slotLabel: "Friday",
      cta: "Reserve 19:45 · 4 guests",
    },
    wins: [
      "Capacity you set, per sitting",
      "Guest details you keep",
      "Confirmation the moment they book",
    ],
  },
];
