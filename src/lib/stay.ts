/**
 * Stay (short-term rental) domain logic.
 *
 * A stay business reuses `services` as unit inventory and `bookings` as
 * reservations. `appointment_date` is the CHECK-IN date and `check_out` is the
 * checkout date; a booking with `check_out === null` is an appointment and none
 * of this file applies to it.
 *
 * Dates are handled as plain "yyyy-MM-dd" strings throughout. They come out of
 * Postgres `date` columns that way and comparing them lexicographically is the
 * same as comparing them chronologically, so there is no Date object and no
 * timezone to get wrong. Every caller — public page, booking API, dashboard —
 * goes through these helpers so availability can never disagree with itself.
 */

import type { Business, Service } from "@/types";

/** Check-in time stamped on every stay, so the row satisfies NOT NULL appointment_time. */
export const STAY_CHECK_IN_TIME = "15:00";

/** Upper bound on a single reservation. Guards against a fat-fingered date range. */
export const MAX_STAY_NIGHTS = 90;

export interface DateRange {
  /** check-in, "yyyy-MM-dd" (inclusive) */
  start: string;
  /** check-out, "yyyy-MM-dd" (exclusive — the guest is gone by this date) */
  end: string;
}

export function isStay(business: Pick<Business, "business_type"> | null | undefined): boolean {
  return business?.business_type === "stay";
}

/** True when a booking row is a stay rather than an appointment. */
export function isStayBooking(b: { check_out?: string | null } | null | undefined): boolean {
  return !!b?.check_out;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false;
  // Reject calendar-invalid strings like "2026-02-31" that still match the shape.
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Nights between two ISO dates. Checkout day is not a night. */
export function nightsBetween(start: string, end: string): number {
  const a = Date.parse(`${start}T12:00:00Z`);
  const b = Date.parse(`${end}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(now: Date = new Date()): string {
  // Local calendar day, not UTC — "today" for a guest in Israel is what matters.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Half-open overlap: [aStart, aEnd) vs [bStart, bEnd).
 *
 * Checkout day is bookable as the next guest's check-in day — standard hotel
 * semantics, and the reason this is `<`/`>` and not `<=`/`>=`. Getting this
 * wrong costs a bookable night on every single turnover.
 */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start < b.end && a.end > b.start;
}

/** Every night occupied by a range, check-in included, checkout excluded. */
export function nightsInRange({ start, end }: DateRange): string[] {
  const out: string[] = [];
  for (let d = start; d < end; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

export interface StayBookingRow {
  appointment_date: string;
  check_out: string | null;
  service_id?: string | null;
}

/**
 * Ranges that are NOT bookable for one unit: existing stays plus the business's
 * one-off blocked dates.
 *
 * `bookings` should already be filtered to statuses that actually hold
 * inventory. Phase 1 blocks on `confirmed` only — a pending request is a request,
 * not a reservation, so two guests may ask for the same week and the host picks.
 *
 * A blocked single date becomes the one-night range [date, date+1).
 */
export function unavailableRanges(
  bookings: StayBookingRow[],
  blockedDates: string[] | null | undefined,
  unitId?: string | null,
): DateRange[] {
  const ranges: DateRange[] = [];

  for (const b of bookings) {
    if (!b.check_out) continue;
    if (unitId && b.service_id && b.service_id !== unitId) continue;
    ranges.push({ start: b.appointment_date, end: b.check_out });
  }

  for (const d of blockedDates ?? []) {
    if (isIsoDate(d)) ranges.push({ start: d, end: addDaysIso(d, 1) });
  }

  return ranges;
}

/** Flat set of every unbookable night — what the date picker greys out. */
export function unavailableNights(ranges: DateRange[]): string[] {
  const set = new Set<string>();
  for (const r of ranges) for (const n of nightsInRange(r)) set.add(n);
  return [...set].sort();
}

export type StayValidationError =
  | "invalid_dates"
  | "past_date"
  | "too_short"
  | "too_long"
  | "too_many_guests"
  | "unavailable";

export interface StayValidationInput {
  start: string;
  end: string;
  guests?: number | null;
  unit: Pick<Service, "min_nights" | "max_guests"> | null;
  unavailable: DateRange[];
  today?: string;
}

/**
 * Single source of truth for "is this request bookable?".
 *
 * The public page runs it to disable the submit button; the API runs it again
 * on the server against freshly-read rows, because the client copy is UX and
 * the server copy is the guard.
 */
export function validateStayRequest(input: StayValidationInput): StayValidationError | null {
  const { start, end, guests, unit, unavailable } = input;
  const today = input.today ?? todayIso();

  if (!isIsoDate(start) || !isIsoDate(end)) return "invalid_dates";

  const nights = nightsBetween(start, end);
  if (nights < 1) return "invalid_dates";
  if (start < today) return "past_date";
  if (nights > MAX_STAY_NIGHTS) return "too_long";
  if (nights < Math.max(1, unit?.min_nights ?? 1)) return "too_short";

  if (unit?.max_guests != null && guests != null && guests > unit.max_guests) {
    return "too_many_guests";
  }

  const requested: DateRange = { start, end };
  if (unavailable.some((r) => rangesOverlap(requested, r))) return "unavailable";

  return null;
}

/** Nightly rate x nights. Stay pricing is linear in phase 1 — no seasonal rates. */
export function stayTotal(nightlyPrice: number, nights: number): number {
  return Math.round(nightlyPrice * nights);
}

// ─── Gallery grouping ─────────────────────────────────────────────────────────

/**
 * Photos assigned to one unit, in the order the host arranged them.
 *
 * Deliberately NOT filtered against `gallery_images`. The public page strips
 * `gallery_hidden` URLs out of `gallery_images` before rendering, and a cover
 * shot is exactly the kind of image a host hides from the flat grid while still
 * wanting it on the unit card. Filtering here would silently delete it.
 */
export function unitPhotos(
  business: Pick<Business, "gallery_groups">,
  unitId: string,
): string[] {
  const group = business.gallery_groups?.[unitId];
  return Array.isArray(group) ? group.filter((u) => typeof u === "string" && u) : [];
}

/** Every URL claimed by some unit. */
export function groupedPhotoUrls(business: Pick<Business, "gallery_groups">): Set<string> {
  const out = new Set<string>();
  for (const urls of Object.values(business.gallery_groups ?? {})) {
    for (const u of urls ?? []) out.add(u);
  }
  return out;
}

/**
 * Photos for the shared gallery section: everything not claimed by a unit.
 *
 * Once the host groups photos per unit, repeating them in a flat grid below is
 * noise — the unit cards already show them.
 */
export function ungroupedPhotos(
  business: Pick<Business, "gallery_groups" | "gallery_images">,
): string[] {
  const grouped = groupedPhotoUrls(business);
  if (grouped.size === 0) return business.gallery_images ?? [];
  return (business.gallery_images ?? []).filter((u) => !grouped.has(u));
}

/**
 * A gallery photo, paired with the unit it belongs to.
 *
 * Units keep the host's ordering; anything unassigned lands in a final
 * untitled group so no photo is ever silently dropped from the page.
 */
export interface PhotoGroup {
  unitId: string | null;
  title: string | null;
  photos: string[];
}

export function groupedGallery(
  business: Pick<Business, "gallery_groups" | "gallery_images">,
  units: { id: string; name: string }[],
): PhotoGroup[] {
  const visible = new Set(business.gallery_images ?? []);
  const groups: PhotoGroup[] = [];

  for (const unit of units) {
    // Only photos still present in gallery_images — a deleted photo must not
    // linger here just because its id is still listed under a unit.
    const photos = unitPhotos(business, unit.id).filter((u) => visible.has(u));
    if (photos.length > 0) groups.push({ unitId: unit.id, title: unit.name, photos });
  }

  const leftover = ungroupedPhotos(business);
  if (leftover.length > 0) groups.push({ unitId: null, title: null, photos: leftover });

  return groups;
}

/**
 * Remove a photo everywhere it is referenced.
 *
 * A URL lives in up to four places — the gallery list, the hidden list, the
 * focal-point map and a unit group. Deleting it from only the first leaves
 * orphans that resurface as broken images later, so this returns a patch for
 * all of them at once. The file itself is left in storage; see the design note.
 */
export function removePhotoEverywhere(
  business: Pick<Business, "gallery_images" | "gallery_hidden" | "image_focal" | "gallery_groups">,
  url: string,
): {
  gallery_images: string[];
  gallery_hidden: string[];
  image_focal: Record<string, string>;
  gallery_groups: Record<string, string[]>;
} {
  const focal = { ...(business.image_focal ?? {}) };
  delete focal[url];

  const groups: Record<string, string[]> = {};
  for (const [unitId, urls] of Object.entries(business.gallery_groups ?? {})) {
    const kept = (urls ?? []).filter((u) => u !== url);
    if (kept.length > 0) groups[unitId] = kept;
  }

  return {
    gallery_images: (business.gallery_images ?? []).filter((u) => u !== url),
    gallery_hidden: (business.gallery_hidden ?? []).filter((u) => u !== url),
    image_focal: focal,
    gallery_groups: groups,
  };
}
