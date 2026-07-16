# Bapita Dashboard

Done-for-you booking platform for Israeli appointment businesses (solo barbers first).
Next.js 16 (App Router) · Tailwind CSS v4 · Supabase auth · Heebo font · PWA.
Lives at `dashboard.bapita.com`.

Design system: `/Users/admin/Desktop/bapita/v2/docs/design-system.md` — **read before any UI work**.

---

## Running

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

---

## Infrastructure & Ops

**Where things live** — the naming is confusing, so read this before touching deploys or email.

| Thing | Location |
|---|---|
| **Live app** (this repo) | Vercel project `bapita-dashboard`, team **rami's projects** (`ramis-projects-ff4a249e`). Account: **ramikan96**. |
| Production domains | `book.bapita.com`, `dashboard.bapita.com` |
| Git repo | `github.com/ramikan96-collab/bapita-dashboard`, branch `main` (git-connected to Vercel) |
| Git commit author | GitHub user `info-bapita` (unrelated to which Vercel account hosts the app) |
| **Other** Vercel account | **info.bapita** / team `infobapita-4729's-projects` → owns bapita.com marketing (`bapita-hub`), `social-ops-platform`. **NOT the booking app.** |

Don't assume the booking app is on the info.bapita account just because email/commits say info.bapita — it is on **ramikan96 / rami's projects**. Env vars (including `GMAIL_*`) live there.

### Transactional email

All emails (booking confirmations, barber notifications, auth) send via **nodemailer Gmail SMTP** (`smtp.gmail.com:465`), authenticating as **info.bapita@gmail.com** with a Google **app password**.

- Env vars in Vercel prod: `GMAIL_USER` (= info.bapita@gmail.com) and `GMAIL_APP_PASSWORD` (16 chars, no spaces). Both are **sensitive** — `vercel env pull` returns `[SENSITIVE]`, not the value.
- Code paths: `src/app/api/public/book/route.ts` (customer + barber, sent in `after()`) and `src/app/api/send-confirmation/route.ts` (dashboard new-booking).

**If emails silently stop** (bookings/calendar still work, no emails to anyone): check Vercel runtime logs for `535-5.7.8 ... BadCredentials` (`code: EAUTH`). This means the Gmail **app password was revoked** — Google auto-revokes app passwords whenever the account password or 2FA changes. Fix:

1. Generate a new app password at <https://myaccount.google.com/apppasswords> (signed into info.bapita@gmail.com; 2FA must be on).
2. Update `GMAIL_APP_PASSWORD` in Vercel prod (Production scope), then **redeploy** — env changes only take effect in a build created after the change.
3. Verify before shipping: `nodemailer.createTransport({host:"smtp.gmail.com",port:465,secure:true,auth:{user,pass}}).verify()`.

> Note: a git push to `main` does not always trigger a Vercel build (webhook has failed before). After pushing, confirm a new deployment actually appears in Vercel; if not, deploy manually.

---

## Decision Log (locked)

Decisions confirmed with the owner. Do not silently reverse — change here first.

| # | Date | Decision | Notes |
|---|------|----------|-------|
| D1 | 2026-06-10 | **English LTR now, RTL-ready** | Keep `<html lang="en">`. Build with logical CSS props (`ms/me/ps/pe`, `border-s`, `start/end`, `rtl:` variants) so a Hebrew RTL flip later = set `dir="rtl"` + add Heebo `hebrew` subset. No physical `left/right/ml/mr`. |
| D2 | 2026-06-10 | **Bottom nav = Calendar · Clients · Insights · Financials** | Matches design system. `New Booking` moved to FAB; `Add-ons` moved to drawer. `Financials` page is a "Coming soon" stub for now. |
| D3 | 2026-06-10 | **Drawer shows real business name + slug** | Pulled from Supabase via existing `useBusiness()` hook, not hardcoded. |
| D4 | 2026-06-10 | **Calendar top bar built in AppShell (not deferred)** | Done in Chat 3. The design's `☰ + Month ▾ + ⋮` calendar bar lives in AppShell, driven by a shared `CalendarChrome` context (`src/components/calendar/CalendarChrome.tsx`). The calendar page publishes its state (month label, view, status filter, date-picker, today) into the context; its old in-page toolbar was removed to avoid a double bar. Chat 4 fills the grid inside this frame. |
| D5 | 2026-06-10 | **Booking entry points — canonical** | Exactly two ways to start a booking, one way to add a contact. Booking `+` (FAB) lives **only on the calendar** (+ tap empty slot). Clients tab `+` = add-customer (name + phone), with an optional attach-booking step. Client profile "New booking for X" pre-fills the wizard. No booking `+` anywhere else. Done in Chat 6. |

---

## Changelog

### Chat 3 — App Shell + Login (2026-06-10)
- **AppShell rewrite** to design system:
  - Bottom nav cut from 5 tabs to 4 (Calendar · Clients · Insights · Financials). `New Booking` + `Add-ons` removed from tabs.
  - FAB added (amber `+`, fixed bottom-end, above nav) → routes to `/new-booking`. Hidden while drawer open.
  - Drawer rebuilt: real business name + slug (via `useBusiness`), items Settings · Add-ons · Usage · Profile · Sign out, slide-in animation, `dark/40` overlay, `min(320px,85vw)` width, amber active-item border.
  - Desktop sidebar: cream bg, icons **+ labels**, amber active indicator (was white bg, icons only).
  - All physical props → logical (RTL-ready per D1).
  - z-index scale normalized: top bar/nav/sidebar `z-30`, FAB `z-40`, drawer overlay `z-40`, drawer panel `z-50`, calendar ⋮ menu `z-40`.
  - Bottom nav: `env(safe-area-inset-bottom)` padding for iPhone notch.
  - **Calendar top bar** (`☰ + Month ▾ + ⋮`): built in AppShell via new `CalendarChrome` context (D4). ⋮ menu = Day/Week/Month toggle + status filter (All/Pending/Confirmed/Completed/Cancelled/No-show) + Jump to today + Calendar settings. Month ▾ opens the native date picker. Calendar page now publishes state to it and its in-page toolbar was removed; status filter applies to the day/week/month views.
- **Login rewrite** to design system: white inputs `h-12`, ≥15px text (mobile-min rule), CSS amber focus ring (was inline-JS focus hack), error border state, labels 13px medium dark, amber button with hover/active states, trust line "Free consultation. No commitment.", tabs "Login / Create account".
- **Root layout**: Heebo weights extended to include 500/600/800 (design uses medium/semibold/extrabold; were faux-rendering).
- **New stub pages**: `/financials`, `/usage` — "Coming soon" placeholders so nav + drawer don't 404 (per D2).

### Chat 4 — Calendar (2026-06-10) · `152fa95`, `323a145`
- Premium week / day / month views inside the AppShell calendar frame (D4): swipeable week strip, scrollable time grid with auto-scroll to opening hour, status-colored booking blocks, tap-empty-slot-to-book, BookingDrawer.
- Premium empty state for the no-business case (welcome card + onboarding steps).

### Chat 5 — Clients List + Client Profile (2026-06-10) · `e5b61eb`
- Clients list: cream bg, white cards, debounced name+phone search (`.or`), Recent/Name/Visits sort pills, warm empty state.
- Client profile: header stats, booking history, internal notes, "New booking for X" → `/new-booking?clientId=`.

### Chat 7 — Insights (2026-06-10) · `08d956d`
- **Full redesign** to design system: cream bg, white cards, warm shadows, 15px+ type scale.
- Revenue hero: `₪` at 48px font-black, amber bg + amber-tinted shadow.
- Stat grid: 2-col (Bookings, No-show %, New clients, Returning).
- Chart switched from daily booking count → **revenue by day**, amber bars, dark tooltip.
- Status breakdown: all 5 statuses (confirmed was missing), pill badges with % + count.
- Top services: ranked list with booking count + revenue.
- **Bug: `service:services(price)` missing `name`** — service names were always undefined; top services always empty. Fixed.
- **Bug: `returningCustomers` went negative** — added `Math.max(0, ...)`.
- **Bug: no-show color was `#f97316` (orange)** — corrected to `#EF4444` (matches design system).
- **Bug: `confirmed` status absent from breakdown** — added.

### Chat 8 — Settings + Profile + Add-ons + Financials + Usage (2026-06-11)
- **Settings** full redesign: Hebrew tabs (פרטי העסק / שירותים / שעות פעילות), Sunday-first Israeli day order, slug field with inline `bapita.com/` prefix, all `alert()` → `useToast()`, service add/toggle/delete, proper `InputField` component.
- **Profile**: reads real email from `supabase.auth.getUser()`, show/hide password toggles, live mismatch inline error, danger ghost sign-out button.
- **Add-ons**: expanded from 3 to 5 cards (WhatsApp, Stripe, Google Business, Social Media, Ads), WhatsApp green CTA with pre-filled message, amber active badge, custom add-on footer CTA.
- **Usage**: per-add-on stat cards; inactive add-ons show empty state with link to `/addons`; active add-ons show stat rows ready for real data.
- **Financials**: checks `addons` table for Stripe `active: true`; not connected → premium upsell page with feature bullets + WA CTA; connected → revenue hero (amber), payout summary with fee calc, transaction list.
- All 5 pages: cream page background, white cards with warm shadows, design-system tokens throughout.

### Chat 6 — New Booking Flow + entry-point cleanup (2026-06-10) · `65aefa4`
- **Booking entry points (D5)**: FAB gated to `/calendar` only (was every screen). Clients tab gets an add-customer `+` → `AddCustomerSheet` (name + phone + optional email, with an optional attach-booking step: service + date + time). Empty-state CTA repointed to add-customer.
- **New-booking wizard rebuilt** to design system (cream page, white cards, amber, cream-2 tokens — was `bg-white`/`gray`/`amber-500`): 4-step progress indicator (Client → Service → Time → Confirm), Back never loses data, success screen with "Go to calendar" / "Add another" (replaced hard redirect).
- **Wizard bug fixes**: reads `?clientId=` → preselects customer + jumps to Service step; client search now matches phone too (`.or(name.ilike,phone.ilike)`); `alert()` → `useToast(...,"error")` everywhere; slot grid filters past times on today, renders booked slots as distinct/disabled, shows "No times available" empty state.
- **New shared lib** `src/lib/availability.ts` (`getAvailableSlots`) used by both the wizard and `AddCustomerSheet`.

---

## Bug / Fix Log

| Area | Bug found | Status |
|------|-----------|--------|
| AppShell | Physical props (`left-0`, `-ml-2`, `md:pl-20`) break RTL | Fixed (logical props) |
| AppShell | 5 nav tabs incl. New Booking + Add-ons (design = 4) | Fixed |
| AppShell | No FAB | Fixed |
| AppShell | Drawer business name hardcoded `"Owner Dashboard"` | Fixed (`useBusiness`) |
| AppShell | Drawer missing Add-ons + Usage items | Fixed |
| AppShell | Drawer popped in (no animation), overlay `black/50` | Fixed (slide + `dark/40`) |
| AppShell | Bottom nav no safe-area inset | Fixed |
| AppShell | Desktop sidebar white bg, icons only | Fixed (cream + labels) |
| AppShell | z-index scale inconsistent | Fixed (normalized) |
| Login | Inputs 14px (violates 15px-min-mobile rule) | Fixed |
| Login | Focus via inline JS hack, no amber ring | Fixed (CSS ring) |
| Login | No error border state on inputs | Fixed |
| Login | Missing trust line | Fixed |
| Root | Heebo missing weights 500/600/800 | Fixed |
| Calendar | In-page toolbar duplicated the design's AppShell calendar bar | Fixed (moved to `CalendarChrome` context) |
| Calendar | Status filter from design ⋮ menu had no implementation | Fixed (filters day/week/month views) |
| AppShell | Booking FAB rendered on every screen (should be calendar-only, D5) | Fixed (gated on `onCalendar`) |
| New booking | `?clientId=` from client profile was ignored | Fixed (preselect + jump to Service) |
| New booking | Client search matched name only despite "name or phone" | Fixed (`.or` name+phone) |
| New booking | Errors used `alert()` | Fixed (`useToast`) |
| New booking | Off-system styling (`bg-white`/`gray`/`amber-500`) | Fixed (design-system tokens) |
| New booking | Past times shown on today; no "no slots" state; booked slots silently dropped | Fixed (past-filter + empty state + distinct unavailable) |
| New booking | Hard redirect on success, no confirmation | Fixed (success screen) |
| Clients | No add-customer entry point | Fixed (`+` header → `AddCustomerSheet`) |
| Insights | `service:services(price)` query missing `name` — top services always empty | Fixed |
| Insights | `returningCustomers` could go negative | Fixed (`Math.max(0,...)`) |
| Insights | No-show status color was `#f97316` (orange, wrong) | Fixed (`#EF4444`) |
| Insights | `confirmed` status missing from breakdown | Fixed |
| Insights | Chart Y-axis showed booking count, not revenue | Fixed (revenue by day) |
| Insights | Page bg was `bg-white` (should be cream) | Fixed |
| Settings | `alert()` used for save feedback | Fixed (`useToast`) |
| Settings | Days in Mon-first order (should be Sun-first for Israel) | Fixed |
| Settings | Missing `slug` field in Business Info form | Fixed |
| Settings | "Blocked dates" tab was dead content (coming soon) | Removed (cleaned up) |
| Profile | Email field showed placeholder text, not real email | Fixed (reads from `supabase.auth.getUser()`) |
| Profile | No password visibility toggle | Fixed |
| Profile | Sign-out was full red bg (design = ghost danger button) | Fixed |
| Add-ons | Only 3 add-ons (missing Social Media, Ads) | Fixed (5 add-ons) |
| Add-ons | Toggle called `alert()` with phone number | Fixed (WhatsApp CTA with pre-filled message) |
| Financials | Was "coming soon" stub | Built out (Stripe check + upsell/connected views) |
| Usage | Was "coming soon" stub | Built out (per-add-on stats with empty states) |

---

## Deferred / TODO

- **FAB → bottom-sheet new-booking drawer** — currently routes to `/new-booking` page; design wants an in-place drawer pre-filled with next slot.
- **Usage stats API** — stat cards are ready but data feed not wired yet; needs backend aggregation per add-on type.
- **Financials transactions** — connected view ready but `transactions` list is empty; needs Stripe webhook or DB query.
- **Hebrew RTL** flip when ready (D1): `dir="rtl"`, Heebo `hebrew` subset, translate labels.
