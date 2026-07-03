# Staff-as-Resource + Per-Staff Calendars — Design

**Date:** 2026-07-03
**Repo:** bapita-dashboard (dashboard.bapita.com)
**Status:** Approved — build Phase 1 + Phase 2, commit & push after Phase 2. Phase 3 (Google) deferred.

## Problem

The booking dashboard treats staff as display-only "meet the team" photo cards. There is no way
to assign a booking to a staff member, view an individual staff member's calendar, or let a
customer choose their professional. The owner wants:

1. Manage staff from **Settings** (and keep admin in sync).
2. Click a staff member and see **only their calendar**, easy to view.
3. (Later) connect each staff member to Google Calendar.

## Decisions (locked)

- **Both** internal scheduling and Google sync, **phased**.
- **Owner-managed** — no staff logins. Auth/RLS untouched. Owner sees and filters all staff.
- **Configurable public choice** — `allow_staff_choice` per business: off = owner assigns in
  dashboard; on = public "choose your professional" step with per-staff availability.
- Google Calendar is a **separate later phase** (Phase 3), not in this build.

## Current state (as explored)

- **Staff, dual-stored:** `business.staff_members` (JSON, edited in Settings → Website, powers
  public "meet the team" cards) AND a real `public.staff` table
  (`id, business_id, name, role, photo_url, sort_order, color, active`) — but that table is only
  written from **admin** `BusinessForm` via `syncStaffTable`/`loadStaff` in `src/lib/staff.ts`.
  Owner Settings never touches the real table.
- **Bookings have no `staff_id`.** `Booking` type in `src/types/index.ts` has no staff link.
  Services aren't tied to staff. `src/lib/availability.ts` ignores staff.
- **Calendar selector base exists.** `src/components/calendar/CalendarSelectorPanel.tsx` already
  renders "All calendars" + an owner row with a colored dot and drives a `calendarFilter: string[]`.
  Hardcoded to owner only today — scaffolded for exactly this feature.
- Calendar views (`Day/Week/Month/Agenda`) already consume a filtered booking list.
- No Google Calendar integration exists (only Google Places/Reviews).

## Architecture

Staff becomes a first-class **schedulable resource**. The `staff` table is the source of truth
for scheduling; `business.staff_members` JSON remains only as the public display list (kept in
sync during transition so the public "meet the team" section does not break).

### Data model changes

Migration file in `docs/migrations/` (repo convention), applied via Supabase.

- `staff`: reuse existing columns. Add (Phase 3, not now): `google_refresh_token`,
  `google_calendar_id`, `google_sync_enabled`. `color` drives calendar dots/event tint.
- `bookings`: **add `staff_id uuid null references staff(id) on delete set null`** — the keystone.
  Nullable so existing/unassigned bookings keep working.
- `services`: **add `staff_ids uuid[]`** — which staff perform the service. null/empty = anyone.
- `business`: **add `allow_staff_choice boolean not null default false`**.
- Index `bookings(business_id, staff_id, appointment_date)` for calendar filtering.

## Phase 1 — internal scheduling (ship, then continue)

**Goal:** owner manages staff in Settings, assigns staff to bookings, and filters the calendar
per staff. Fully useful on its own.

### Units of work

1. **Migration** — add columns + index above; backfill nothing (nulls fine).
2. **Types** — `Booking.staff_id`, `Service.staff_ids`, `Business.allow_staff_choice`,
   `StaffMember.color`/`active` in `src/types/index.ts`.
3. **`src/lib/staff.ts`** — extend `syncStaffTable`/`loadStaff` to carry `color` and `active`
   (currently omitted). Add `loadActiveStaff` for the calendar/booking pickers.
4. **Settings → new "Team" section** (`src/app/(dashboard)/settings/page.tsx`): new tab beside
   Services/Hours. CRUD: name, role, photo (reuse `uploadStaffPhoto`), **color picker**, active
   toggle, drag-reorder. Writes the **`staff` table** via `syncStaffTable` (today Settings only
   writes JSON — wire the table in, keep JSON in sync for public display). Add the
   `allow_staff_choice` toggle here.
5. **Admin `BusinessForm`** — add color field to its existing staff editor so admin and owner
   edit the same shape via the same `syncStaffTable`.
6. **Services editor** (in Settings) — multi-select "who performs this" writing `service.staff_ids`.
7. **Booking assignment** — staff `<select>` in `new-booking/page.tsx`, `BookingDrawer.tsx`,
   `EditBookingSheet.tsx`. Writes `booking.staff_id`. Optional/nullable.
8. **CalendarSelectorPanel** — render one row per active staff (dot = `staff.color`) under
   "All calendars", keeping the owner row. Reuse existing `calendarFilter: string[]` (values =
   staff ids; empty = all).
9. **Calendar `page.tsx`** — filter bookings by `staff_id ∈ calendarFilter`. Views light up for
   free. Color event blocks by staff color; fall back to status color when unassigned. Small
   "color by: staff / status" toggle.

### UI/UX (professional/elegant)

- Color-coded staff everywhere (selector dot, event tint, avatar).
- Avatar stack in calendar header; click avatar = quick-filter to that staff.
- "Unassigned" pill on staff-less bookings + one-tap assign from the booking card.
- Per-staff day summary in Agenda/Day header (e.g. "Dana · 6 appts · ₪740").
- Use existing design tokens (`--color-amber`, `--color-cream-2`, `--color-dark`, `--color-muted`),
  **RTL-safe**, avoid the known dashboard `*{padding:0}` global-reset footgun when adding UI.

## Phase 2 — public staff choice + per-staff availability

**Goal:** customers can choose their professional when `allow_staff_choice` is on.

### Units of work

1. **`src/lib/availability.ts`** — extend to compute per-staff availability: business hours minus
   that staff's bookings (filter by `staff_id`). "Any available" = union across eligible staff
   (respecting `service.staff_ids`). Google busy is Phase 3 (leave a seam).
2. **Public booking flow** (`src/app/[slug]/booking/`) — when `allow_staff_choice`, insert a
   "choose your professional" step (+ "Any available") before the time step; filter staff by the
   selected service's `staff_ids`. Off = flow unchanged, `staff_id` stays null for owner to assign.
3. **`/api/public/slots` + `/api/public/book`** — accept optional `staff_id`; slots respect it;
   book writes it. "Any available" picks a free eligible staff at booking time.
4. Public "meet the team" cards keep rendering from `staff_members` JSON (unchanged).

### Deploy gate

After Phase 2: commit + push. Owner verifies on live — staff visible/manageable in Settings and
admin, per-staff calendar filtering works, public choose-staff flow works. Deploy target: Vercel
`bapita-dashboard`. Watch lockfile "Invalid Version" gotcha; ensure Supabase env vars scoped to
Preview.

## Phase 3 — Google Calendar (deferred, out of scope for this build)

OAuth per staff (connected from the Team settings row), tokens on `staff`, pull busy → read-only
blocks + availability, push Bapita bookings → Google events (`google_event_id` on booking).
New `/api/google/*` routes. Own spec/plan when we get there.

## Testing

- Migration applies cleanly; existing bookings (null `staff_id`) still render.
- Settings Team CRUD round-trips to `staff` table; public "meet the team" still renders.
- Assigning `staff_id` to a booking filters correctly across Day/Week/Month/Agenda.
- `allow_staff_choice` off → public flow identical to today.
- `allow_staff_choice` on → staff step appears, availability reflects chosen staff, "Any
  available" books a free eligible staff.
- RTL: Team section and public staff step render correctly right-to-left.

## Out of scope

- Staff logins / per-staff RLS / role permissions.
- Google Calendar (Phase 3).
- Retiring the `staff_members` JSON entirely (kept as public display; only scheduling source of
  truth moves to the table).
