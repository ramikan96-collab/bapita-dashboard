# Calendar: Readable Week View + Long-Hold Drag Reschedule

**Date:** 2026-07-17
**Surface:** `/calendar` (dashboard), primary audience is mobile (phone) barbers/owners.
**Reference UX:** easybizy.net (desktop 6-col week; mobile premium cards, drag-to-reschedule with inline confirm).

## Problem

1. **Readability.** On mobile the Week view crams 7 columns into ~44px each. Customer names and service names truncate to `Ra…`, `M…`, `Bal…` — unreadable at a glance. The owner has to tap every block to see who it is.
2. **Reschedule friction.** Moving an appointment today requires: tap block → BookingDrawer → "Reschedule" → date picker + slot grid. Owners want to drag a block to a new time/day directly on the grid. Additionally, rescheduling currently sends **no** email to the customer; it should notify them automatically like the booking-confirmation flow does.

## Goals

- Keep the multi-day **Week** view (owner explicitly wants week context, not a forced single-day view).
- Make blocks readable on mobile without tapping — "premium" like Easybizy.
- Long-hold + drag to reschedule (time and date), easy and reliable on touch.
- Every reschedule (drag OR the existing button) automatically emails the customer a "rescheduled" notice.
- No DB schema changes. No regression to existing views, gestures, or the confirmation-email flow.

## Non-Goals

- Changing service via drag (service stays fixed; change service = existing Edit flow).
- Redesigning Day / Month / Agenda views (untouched).
- Drag-to-resize (changing duration) — out of scope.

---

## Feature 1 — Readable Week View

Two independent, composable changes. Neither touches data fetching or persistence.

### 1a. Hide closed-and-empty days (display filter)

- `business_hours` already encodes per-weekday open/closed. Build the week's `days` array, then **drop any day that is both closed AND has zero bookings and zero blocked times.**
- Most barbers close 1 day/week → typically 6 columns, ~15% more width, and a cleaner grid.
- **Data-safety guard (critical):** never hide a day that has bookings or blocked times, even if marked closed. A booking on a hidden day would silently disappear. The filter is `closed && empty`, never `closed` alone.
- **Fetch is unchanged.** We still fetch the full 7-day range (`rangeFor("week", date)`) and bucket by real date. This is a pure *display* filter over the already-loaded buckets — computed after `byDay` is built, so emptiness is known. Zero DB/schema/load/save impact.
- Columns are already `flex-1`, so 5/6/7 columns reflow automatically. Verify the sticky week strip (day picker) and the grid columns use the **same filtered list** so headers stay aligned with columns.
- Edge cases: if *all* seven days are closed+empty (brand-new business), fall back to showing the standard 7 so the grid is never empty. "Today" landing on a hidden day is acceptable (no column highlight that day); prev/next-week still steps 7 real days.

### 1b. Wrap instead of truncate (the actual readability fix)

Dropping a day only adds ~7px/column — not enough to fit real names. The real fix is Easybizy's technique: **wrap text; let narrow blocks grow taller instead of clipping.**

Per booking block (Week columns), render:
- **Customer name** — full name, wrap up to **2 lines** (`line-clamp-2`), no mid-block truncation of the first name.
- **Service name** — always shown when present (muted), wrap up to 1–2 lines.
- **Time range** — start–end.
- **Label color** — existing left color bar + label dot retained.

Because grid blocks are absolutely positioned with a fixed height derived from duration, wrapping text can overflow a short block. Handle it:
- Keep `overflow: hidden` on the block, but drop the hard `truncate` on the name line in favor of `line-clamp` so 2 lines are allowed before clipping.
- Prioritize name > service > time when height is tight: name always; service if height ≥ ~34px; time if height ≥ ~48px (tunable thresholds; mirror the existing `tall` gate but staged).
- Very short appointments (15 min) remain single-line name — acceptable; tapping still opens full detail.

### 1c. Premium mobile styling

Match the Easybizy mobile card feel while staying inside the current token system (`--color-*`, `--shadow-sm`):
- Rounded card, soft shadow, left accent bar in the label/status color (already present — keep).
- Clear type hierarchy: name (semibold, `--color-dark`), service (11px, `--color-muted`), time (11px, muted).
- Comfortable inner padding; consistent 15-min grid rhythm.
- Desktop uses the same block component and rules; on wide columns everything fits on its own lines and reads like the Easybizy desktop card.

**No new view type.** Same `WeekView`, wider/wrapped blocks, fewer columns.

---

## Feature 2 — Long-Hold Drag Reschedule

### Interaction

1. **Grab:** long-press a booking block ~400ms → block "lifts" (scale/shadow bump + haptic via `navigator.vibrate` where available). Long-press threshold must not fight vertical scroll: while pressing, suppress scroll only after the hold fires.
2. **Drag:** a ghost/preview follows the finger/cursor. Position **snaps to a 15-minute grid**.
   - Vertical movement → new **time**.
   - **Desktop** week: horizontal movement across columns → new **day**.
   - **Mobile:** drag vertically for time; to change **day**, drag the block up onto a **day in the sticky week strip** (drop target highlights) → date changes, time preserved. This satisfies "change date too" on mobile without cramped multi-column dragging.
3. **Drop → conflict check:** reuse the availability logic (`getAvailableSlots` / the same overlap rules used by `RescheduleSheet`). If the target slot collides with another booking or a blocked time, reject the drop (snap back, brief "Slot taken" toast).
4. **Persist:** on a valid drop, **save immediately** (no confirm dialog) using the exact update `RescheduleSheet.handleSave` performs:
   ```
   appointment_date, appointment_time, appointment_datetime
   ```
   Service, duration, status, everything else untouched.
5. **Undo:** show a **"Moved · Undo"** toast for ~5s. Undo restores the previous date/time (and, per below, sends no second email / or sends a correcting one — see Email section).
6. Optimistic UI: move the block on drop; on DB error revert and toast an error (mirror existing error toasts).

### Reschedule email (applies to ALL reschedules)

Rescheduling must automatically email the customer — for the drag flow **and** the existing "Reschedule" button in `RescheduleSheet`, so behavior is uniform ("as usual, automatically").

- New authed route **`POST /api/send-reschedule`**, modeled on `/api/send-confirmation`:
  - Auth via `supabase.auth.getUser()`; 401 if no user.
  - Resolve business + `notification_email`/`owner_email` **server-side** from `businessId` scoped to the caller (same ownership `.or(owner_id / owner_email)` guard) — never trust client-supplied business name (anti-spoofing, same as confirmation route).
  - Body: `customerName, customerEmail, serviceName, oldDate, oldTime, newDate, newTime, businessId`.
  - If `customerEmail` is null → `{ ok: true }` no-op (silent, like confirmation).
  - Template: "Appointment rescheduled" — shows business, service, **old** date/time (struck/labelled "was") and **new** date/time, localized like the confirmation email. `esc()` all interpolations. BCC the owner.
  - On send failure: return 500 with error; caller surfaces a non-blocking toast ("Rescheduled, but the email didn't send") — consistent with the recent "surface confirmation-email send failures" change. The DB move still stands.
- **Fire-and-forget from the client** after a successful DB update (same pattern as `new-booking` calling `/api/send-confirmation`), from a shared helper so both the drag path and `RescheduleSheet` use it.
- **Undo:** to avoid spamming the customer, debounce the email — send only after the Undo window elapses (or immediately on toast dismiss). If undone within the window, no email is sent. (Simpler acceptable alternative if debounce proves fiddly: send immediately, and on Undo send a second "moved back" email — but debounce is preferred.)

### Fallbacks

- The existing Reschedule button and Edit sheet remain. Drag is an addition, not a replacement.

---

## Components / Files (anticipated)

- `src/components/calendar/WeekView.tsx` — filtered `days` (1a), wrapped/premium blocks (1b/1c), drag grab/drop + strip drop-target (2).
- `src/components/calendar/grid.ts` — snap-to-15 helper, long-press/drag gesture hook (extend `useGridGestures` or add `useDragReschedule`), pixel↔minute conversions (already present).
- `src/components/calendar/RescheduleSheet.tsx` — call the shared reschedule helper so its saves also email.
- `src/lib/reschedule.ts` (new) — shared `applyReschedule(booking, newDate, newTime)`: DB update + conflict check + email trigger, reused by drag and sheet.
- `src/app/api/send-reschedule/route.ts` (new) — email route.
- `src/app/(dashboard)/calendar/page.tsx` — wire optimistic update + Undo toast; pass `business_hours` to `WeekView` (may already have via business context).
- Types: no change (Booking already has needed fields).

## Testing

- **1a:** business with one closed day + no appts → that column hidden; add an appt on the closed day → column reappears (guard works). All-closed new business → 7 columns shown.
- **1b/1c:** long names (Latin + Hebrew RTL) wrap to 2 lines, service visible, nothing clipped mid-word in normal-height blocks; 15-min block stays single line.
- **2 drag:** long-press grabs (doesn't trigger on a quick tap → tap still opens drawer); vertical drag changes time on 15-min snap; desktop horizontal changes day; mobile drop-on-strip changes date, keeps time; collision → snap back + toast; valid drop → optimistic move + Undo works.
- **2 email:** valid reschedule (drag and button) → customer receives "rescheduled" email with correct old/new; no email when `customer_email` null; Undo within window → no email; send failure → move persists + non-blocking toast.
- **No regression:** Day/Month/Agenda unchanged; swipe prev/next week still works alongside long-press; confirmation email untouched.

## Rollout / Risk

- All changes are client display + one additive API route; no schema migration.
- Highest-risk area is the touch gesture (long-press vs scroll vs swipe-week coexistence) — build behind careful thresholds and test on a real phone.
- Email volume: reschedules are low-frequency; Gmail SMTP limits are not a concern.
