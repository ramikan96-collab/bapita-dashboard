# Book Bapita — stay (short-term rental) business type

**Date:** 2026-08-22
**Status:** Phases 1 & 2 built, awaiting migration + manual verification
**Driver:** Finish `book.bapita.com/kasa-herzeliya` so it takes real booking requests, and do it as a reusable business type rather than a one-off page.

---

## 1. Why

Book Bapita is an appointment platform that currently looks like a barber platform. Short-term rental
(Airbnb / Booking.com style) is a genuinely different shape of the same idea: a guest picks a **date range**
against a **unit**, not a time slot against a staff member.

Two reasons to build it as a first-class type rather than a custom page:

1. **Kasa Herzeliya is the demo.** It is what a property owner gets shown before they buy. A one-off
   (`customs/shimi-azut-hairstudio.tsx` style) gets one site; the abstraction gets the vertical.
2. **The gap was smaller than it looked.** `bookings` already had date, service, status, payments and
   Google Calendar sync. What was missing was an end date, per-unit availability, and vocabulary.

### What was actually broken

Investigation before writing any code found the live page was not merely mislabelled — it was **non-functional**:

| Finding | Detail |
| --- | --- |
| **Booking produced zero slots** | The three units carry `duration: 1440`. `getAvailableSlots` loops `for (t = open; t + duration <= close; …)`. With hours of `00:00–00:00`, and with any normal hours, that condition is never true. Nobody could have booked. |
| **`bookings_slot_unique` would have blocked multi-unit nights** | The index is `(business_id, appointment_date, appointment_time)` with no predicate. Every stay checks in at the same time, so booking two units for the same night would have collided. |
| Title tag said "Barber and Hair Studio" | On a live, indexable page |
| `HairSalon` / `BarberShop` JSON-LD | On a property page |
| "Closed · Opens Tomorrow at 12:00 AM" | Opening-hours pill on an apartment |
| "1440 min" printed on every unit | Duration surfaced as user-facing copy |
| "340 happy clients" | Barber social-proof wording |
| Flat 12-photo gallery | No way to tell which photo is which kasa |

---

## 2. Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| **Unit model** | Extend `services` + `bookings`, no new tables | Fastest path to a working request form, and forward-compatible. `appointment_date` doubles as check-in, so Google Calendar sync, confirmation emails, the clients table and every dashboard query keep working untouched. |
| **Who sets the type** | Bapita staff, in the admin board | Matches how onboarding actually works — Rami builds the site, the customer uses it. The customer never sees a switch that could break their page. |
| **v1 availability** | Block **confirmed** stays + `blocked_dates` | Honest availability without Google Calendar's edge cases. A pending request is a request, not a reservation: two guests may ask for the same week and the host decides. |
| **Page shape** | One page, unit cards → modal | No routing work, one page to maintain, whole flow under one URL. |
| **v1 outcome** | A **pending request**, no payment | The host confirms. Copy says so plainly — a guest who believes they hold a reservation and does not is the worst possible outcome. |
| **Checkout semantics** | **Exclusive** | The checkout day is bookable as the next guest's check-in. Getting this wrong burns a bookable night on every single turnover. |

---

## 3. Architecture

### Data model

```
businesses.business_type   'appointment' (default) | 'stay'
businesses.gallery_groups  jsonb  { "<service_id>": ["url", …] }

services.min_nights        int not null default 1
services.max_guests        int null

bookings.check_out         date null    <-- the discriminator
bookings.guests            int null
```

The whole design rests on one line:

```
check_out IS NULL      ->  appointment   (today's behavior, completely unchanged)
check_out IS NOT NULL  ->  stay
```

`services.price` becomes the nightly rate in stay mode; `duration` is unused and never rendered.

### The index change (required, not optional)

`bookings_slot_unique` was re-created as a **partial** index over `WHERE check_out IS NULL`. The appointment
guarantee is byte-for-byte identical (including the CLAUDE.md gotcha that a cancelled row still holds its
slot). Stays are exempt because their conflict rule is a range test, not an equality test, and is enforced
in the API instead.

### One source of truth for dates

`src/lib/stay.ts` owns every date decision. The public page, the booking API and the dashboard all call it,
so availability cannot disagree with itself. Dates are plain `"yyyy-MM-dd"` strings end to end — they come
out of Postgres `date` columns that way and compare lexicographically, so there is no `Date` object and no
timezone to get wrong.

The client copy of the check is UX (it disables the button). The server copy is the guard.

---

## 4. What was built

### Data
- `docs/migrations/2026-08-22-stay-business-type.sql` — additive, transactional, seeds `kasa-herzeliya`
- `src/types/index.ts` — `BusinessType`, plus the new `Business` / `Service` / `Booking` fields

### Core logic
- **`src/lib/stay.ts`** (new) — overlap, nights, validation, availability, gallery grouping
- `src/lib/social-proof.ts` — "guests" instead of "clients" for stays

### Public site
- `src/app/api/public/stay-availability/route.ts` (new) — blocked nights per unit
- `src/app/api/public/book/route.ts` — a self-contained stay branch that returns before any appointment
  logic runs, so the appointment path is untouched. Creates a pending request, emails host + guest.
- `src/app/[slug]/components/StayRangePicker.tsx` (new) — two-tap range picker; refuses to build a range
  that spans a blocked night; checkout day stays selectable
- `src/app/[slug]/components/SectionUnits.tsx` (new) — theme-tokenized unit cards with cover photo,
  nightly rate, sleeps, min nights
- `src/app/[slug]/booking/StayOverlay.tsx` (new) — photos, date range, guests, contact, notes, total
- `src/app/[slug]/themes/{dark,clean,classic}/*.tsx` — all three wired for stay mode
- `src/app/[slug]/translations/{en,he}.ts` — full `stay` vocabulary, both languages
- `src/app/[slug]/page.tsx` — stay SEO title/description, `LodgingBusiness` schema, opening hours dropped

### Dashboard
- `src/app/(dashboard)/calendar/page.tsx` — month view by default for stays (derived, so a manual choice
  always wins); fetch window widened backwards so a stay that started earlier but runs into view still loads
- `src/components/calendar/MonthView.tsx` — a stay fills every occupied night as a tinted band, labelled by
  unit; checkout day left clear
- `src/components/calendar/AgendaCard.tsx` — date range + nights + guests instead of start/end times
- `src/components/calendar/BookingDrawer.tsx` — "4 Sep → 7 Sep · 3 nights · 2 guests", stay total = rate × nights
- `src/app/(dashboard)/admin/.../BusinessForm.tsx` — **Business Type** selector; Services tab becomes
  **Units** (price per night, sleeps, minimum nights); new **Photos per unit** grouping UI

### Verification
- `scripts/verify-stay-logic.ts` (new) — 43 assertions, `npm run verify:stay`

---

## 5. Status

### Done
- [x] Migration written **and applied** (verified 2026-08-22: the public stay page returns 200)
- [x] `business_type` end to end: admin → DB → public page → dashboard
- [x] Units with nightly rate, min nights, sleeps
- [x] Per-unit photo groups; leftovers stay in the shared gallery
- [x] Date-range picker with real availability
- [x] Request flow → pending booking + host/guest emails
- [x] Stay-aware month view, agenda card, booking drawer
- [x] Stay SEO copy + `LodgingBusiness` schema; barber title tag fixed
- [x] `npx tsc --noEmit` clean · `npm run build` passes · lint clean except 2 known pre-existing
      `PaymentsSection` errors · 43/43 logic assertions pass

### Blocking, before the site works
- [x] **Run the migration.** Applied 2026-08-22.

### Deliberately out of scope
- [ ] Payments — reuse the existing `deposit_required` machinery, deposit = first night
- [ ] Google Calendar / Airbnb iCal pull per unit
- [ ] Confirm/decline buttons tuned for stay wording (the generic ones work)
- [ ] Seasonal or weekend pricing — `stayTotal` is deliberately linear
- [ ] Cancellation policy text
- [ ] Availability that accounts for pending requests

---

## 6. Later phases (notes only, not built)

### Phase 3 — Google Calendar / Airbnb iCal per unit
The feature that makes this *sellable*, and the one most likely to eat a week.

- Each unit needs its own calendar mapping (`services.calendar_id`), not one per business.
- Pull direction first: import busy ranges from Airbnb/Booking.com iCal so an OTA booking blocks the
  direct site. Push second.
- Watch: all-day events, timezones, and iCal feeds that only refresh every few hours (so the direct site
  can still double-book inside the refresh window — hence deposits matter here).
- Merge point already exists: `unavailableRanges()` takes a list. Feed calendar busy ranges into it and
  nothing else changes.

### Phase 4 — Payments
- `deposit_required` / `deposit_type` / `deposit_value` already exist per service, and the Green Invoice
  flow is built. Deposit value for a stay should be the first night.
- Flow changes from *request* → *pending* into *request* → *host confirms* → *payment link*, which is not
  the current one-shot appointment flow. Plan for a "send payment link" action in the dashboard.
- Note the standing blocker: GI sandbox terminal was never provisioned, so this gets tested in production
  behind `GREENINVOICE_ENV`.

### Smaller follow-ups worth doing
- A per-unit `/kasa-herzeliya/big-kasa` route would rank three pages instead of one. Real SEO upside; costs
  a route, sitemap entries and a back-nav pattern.
- `MAX_STAY_NIGHTS` (90) also widens the dashboard's month fetch window. If long stays are ever allowed,
  revisit that query rather than raising the constant blindly.
- The pending-request rate limit is inherited from appointments (2 per phone per 2 hours). Fine now,
  possibly tight for a family comparing dates.
