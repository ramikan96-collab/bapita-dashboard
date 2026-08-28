/**
 * The four audiences bapita.com sells to.
 *
 * This replaces the Hub's PRODUCTS list as the page's spine. The suite page
 * asked "which of our four tools do you want"; this page asks "which of you are
 * you", and answers with the same product every time. That is the whole point
 * of the relaunch: one product, a wider room.
 *
 * `mode` maps 1:1 onto `businesses.business_type` — the salon/clinic/studio
 * rows are `appointment`, the property row is `stay`. The mock renders from it,
 * so what a visitor sees on the marketing page is the shape of the page they
 * would actually be given.
 *
 * Every mock is deliberately branded "Your …" on a book.bapita.com path, which
 * is the address a tenant actually gets (`src/app/[slug]/page.tsx`) before they
 * point their own domain at it. Inventing plausible business names on plausible
 * .co.il domains would read as a client list we don't have.
 */

/**
 * `studios` replaced `restaurants` on 2026-08-28. Restaurants were cut as a
 * product, so the homepage stopped selling them — but four rooms stay four, and
 * nail & lash is the room the existing product already fits best. The two
 * beauty rooms are named specifically for that reason: "Salons" and "Nail &
 * lash studios" side by side would blur, so the first one is "Hair salons".
 */
export type AudienceId = "salons" | "properties" | "clinics" | "studios";

/**
 * Structure only. Every word — the tab label, the promise, the service names,
 * the mock's business name — lives in `src/lib/marketing/i18n`, keyed by `id`.
 * What stays here is what a translation must never be able to change: which
 * business type the mock renders as, what its accent colour is, and which
 * times or nights the slot row shows.
 */
export interface Audience {
  id: AudienceId;
  /** Product color for this audience's accent. */
  accent: string;
  mode: "appointment" | "stay";
  /** Appointment: times. Stay: nights, rendered as a date strip. */
  slots: string[];
  /** The avatar letter and the address in the mock's URL bar. */
  initial: string;
  url: string;
}

export const AUDIENCES: Audience[] = [
  {
    id: "salons",
    accent: "#e8920a",
    mode: "appointment",
    slots: ["09:30", "11:00", "14:30", "16:00", "17:15"],
    initial: "H",
    url: "book.bapita.com/hairsalon",
  },
  {
    id: "properties",
    accent: "#d4622a",
    mode: "stay",
    slots: ["12", "13", "14", "15", "16"],
    initial: "A",
    url: "book.bapita.com/apartments",
  },
  {
    id: "clinics",
    accent: "#1fa971",
    mode: "appointment",
    slots: ["08:00", "09:15", "10:30", "13:00", "15:45"],
    initial: "C",
    url: "book.bapita.com/clinic",
  },
  {
    /* Daytime hours, deliberately. The row this replaced ran 18:00–21:15
       because it was a dinner service; leaving those times on a nail studio
       would read as a copy-paste rather than as a room we actually sell to. */
    id: "studios",
    accent: "#cf4f7e",
    mode: "appointment",
    slots: ["10:00", "11:30", "13:00", "15:30", "17:00"],
    initial: "N",
    url: "book.bapita.com/nailstudio",
  },
];
