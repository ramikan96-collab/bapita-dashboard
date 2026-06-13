# Calendar Page Redesign

**Date:** 2026-06-13  
**Status:** Approved for implementation  
**Reference:** Acuity Scheduling screenshots (competitor analysis)

---

## Goal

Turn the calendar into the platform's primary dashboard. Better than Acuity Scheduling — simpler, warmer, more premium. Inspired by Google Calendar's clarity and Airbnb's warmth.

---

## Design System Tokens

All UI uses existing design-system tokens: `--color-cream`, `--color-cream-2`, `--color-amber`, `--color-dark`, `--color-muted`, `--wash-amber`, `--line`. No raw hex except where noted.

---

## 1. Navigation & Chrome

### CalendarChrome context

Add `"agenda"` to `CalView` union:
```ts
export type CalView = "day" | "week" | "month" | "agenda";
```

### Mobile top bar (calendar-only state)

```
[☰]   [Sat, Jun 13 · 3 appointments]   [🔍 filter icon]
```

- Center label: day-of-week + date + appointment count for selected date
- Right icon: funnel/filter → opens status filter bottom sheet
- ⋮ menu removed entirely

Below the top bar, a **permanent view strip** (calendar-only, sticky):

```
[ Day ]  [ Week ● ]  [ Month ]  [ Agenda ]
```

- Pill tabs, amber fill + white text = active, muted text = inactive
- 44px touch target each
- Appears between top bar and the content area (not part of the grid)

### Desktop sidebar (calendar-only)

Keep existing structure. Add `Agenda` as 4th option in the view pill group. Replace the "click to pick date" button with an actual mini-calendar grid (Sun–Sat, current month, today circled in amber, selected day filled amber).

---

## 2. Stats Header

Single-line bar immediately below the view strip. Always visible on all 4 views.

```
Saturday, June 13  ·  amber dot  ·  3 appointments
```

- Cream background, 14px, muted text, amber dot only when showing today
- If selected date ≠ today: no amber dot, just "June 10 · 2 appointments"
- Replaces the current day-only multi-card strip (remove the large revenue/next-booking cards from day view; those stats live on Insights page)

---

## 3. Views

### Week (default landing view)

No structural changes to grid layout. Improvements:
- Today column: amber-tinted background (`rgba(232,146,10,0.06)`)
- Booking chips: show left-border in label color if label set, else status color
- Chip content: `[Client Name]  [Service]` on one line (truncated), time below
- Past slots: `opacity-40` on booking chips in the past

### Day

No structural changes to time grid. Add **agenda list below the grid**:
- Same component as the month-view agenda list (see §3 Month View)
- Shows all bookings for the selected day as cards below the scrollable grid
- Sticky date header: "Wednesday, June 10"
- Each card: time range · client name · service · status badge

### Month

Grid: same as current. Add **expandable agenda section below the grid**:
- Auto-expands to show today's bookings on load
- Clicking a date cell scrolls to / expands that date's section below
- Each day section: sticky date header (collapsible) + booking cards
- Empty days: hidden (not rendered)
- Booking card: `[time]  [client name]  [service]  [status badge]  [label dot]`

### Agenda

Flat chronological list, next 90 days, grouped by date.
- Date headers: full date + day of week
- Empty days: skipped
- Past bookings: not shown (forward-only; add "Show past" toggle later)
- Booking card: same layout as month agenda cards
- Infinite scroll (load more on scroll bottom)
- Empty state: "No upcoming appointments. Tap + to add one."

### Shared AgendaCard component

Single `<AgendaCard booking={b} onClick={...} />` component used by day, month, and agenda views:

```
┌──────────────────────────────────────────────┐
│  10:50  Jane McTest          [Confirmed]      │
│         Consultation · 50min  ● (label dot)  │
└──────────────────────────────────────────────┘
```

---

## 4. Booking Detail Panel (BookingDrawer)

### Layout

Bottom sheet on mobile, right-panel `w-96` on `md:` desktop.

```
────────── drag handle ──────────
Jane McTest                [● Confirmed ▾]
Wed, Jun 10  ·  10:50–11:40  ·  50min
Consultation with Rami Kandiyoti

[✓ Complete]  [↺ Reschedule]  [✕ Cancel]

──────────────────────────────
▼ Label
▼ Contact
▼ Payment
▼ Notes
▼ History
──────────────────────────────
[Edit appointment]  [Print]
```

**Header area:**
- Client initials avatar (amber bg, white text, 44px circle)
- Client name (18px bold dark)
- Status badge: tappable → opens status change sheet (6 options)
- Date · time range · duration (muted, 14px)
- Service name (muted)

**Action buttons (context-sensitive):**
| Current status | Buttons shown |
|---|---|
| pending | [Confirm] [Complete] [Cancel] |
| confirmed | [Complete] [Reschedule] [Cancel] |
| completed | [Reschedule] [Reopen as confirmed] |
| cancelled / no-show | [Reschedule] [Reopen] |

**Accordion sections:**

_Label_
- Shows current label pill (colored) or "No label"
- Tap → LabelPickerSheet (see §5)

_Contact_
- Phone (tap to call/copy), Email (tap to email), Time zone

_Payment_
- Total price · Amount Owed · Payment status badge
- [Mark as paid →] or payment method shown

_Notes_
- Appointment notes (editable textarea, auto-save on blur)
- Client notes (shown read-only with "Notes about this client show on all appointments")

_History_
- Previous appointment: date + service + status (if any)
- [View client history →] → `/clients/{id}`

**Footer actions:**
- [Edit appointment] → opens EditBookingSheet (full edit form)
- [Print] → `window.print()` with scoped print styles for this booking's details

### EditBookingSheet

Full-screen bottom sheet (or right panel on desktop):
- Pre-filled service selector (dropdown of business services)
- Date picker + time picker
- Client name fields (first, last), phone, email
- Notes textarea
- [Mark as paid] checkbox
- [Save changes] button (patches booking in Supabase)
- [Cancel] closes without saving

### RescheduleSheet

Lighter sheet: date picker + time picker only. No client/service editing.

---

## 5. Labels System

### Database

```sql
-- New table
create table labels (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null check (char_length(name) <= 16),
  color text not null,  -- hex string e.g. '#E53E3E'
  created_at timestamptz default now()
);

-- Add to bookings
alter table bookings add column label_id uuid references labels(id) on delete set null;
```

RLS: labels readable/writable by `business_id = auth.uid()`'s business.

### Label colors (14 options, matches Acuity palette)

```ts
const LABEL_COLORS = [
  '#E53E3E', '#ED64A6', '#ED8936', '#ECC94B', '#F6E05E',
  '#9AE6B4', '#276749', '#63B3ED', '#3182CE',
  '#805AD5', '#B794F4', '#1A202C', '#718096', '#FFFFFF',
];
```

### LabelPickerSheet

Bottom sheet triggered from BookingDrawer Label section:
- List of existing labels (colored pills, checkmark on selected)
- [+ New label] → inline form: name input (max 16 chars) + color grid + [Save]
- [Edit / Delete] per label (long-press or edit icon)
- Selecting a label → patches `bookings.label_id` immediately

### Calendar chip display

Week/Day grid booking blocks: 3px left border in label color (if set), otherwise status color.

---

## 6. Calendar Selector

### UI

Desktop sidebar: add "Calendars" section below View switcher.
Mobile: accessible from filter icon bottom sheet.

```
Calendars
☑ All calendars
☑ Rami Kandiyoti (amber color dot)
```

Checkboxes to show/hide. RESET + APPLY buttons (like Acuity).

### Backend

Single calendar per business for now. Scaffold the filter UI with one entry (owner's name). Data model deferred — when multi-staff lands, each staff member = one calendar entry.

State: `calendarFilter: string[]` (array of calendar IDs) in CalendarChrome context. Currently only one value, filter is a no-op on queries.

---

## 7. Print

### Print icon

Top bar (both mobile and desktop), calendar-only. Placed after the view strip, top-right area.

### Behavior

`window.print()` with `@media print` styles:
- Hides nav, sidebar, bottom nav, FAB, drawer
- Renders a clean agenda list of current view's bookings
- Header: business name + date range
- Each booking: time · client · service · status · notes

---

## 8. Search

Search icon in top bar (calendar-only). Tap → expands full-width search input.

- Searches: `customer_name`, `service.name`
- Debounced 300ms, queries Supabase `.ilike`
- Results: shown as agenda-list cards below the input (replaces current view temporarily)
- Clear (×) → returns to normal view

---

## 9. New Booking Form Improvements

- Add "Mark as paid" toggle at confirmation step (step 4)
- Clean up wizard layout: cream page bg, white cards, consistent 15px+ type
- Remove any remaining `alert()` calls → `useToast`

---

## 10. Component Architecture

```
src/
  components/
    calendar/
      CalendarChrome.tsx          ← add "agenda" to CalView, add calendarFilter
      AgendaCard.tsx              ← NEW: shared booking card for agenda lists
      AgendaList.tsx              ← NEW: grouped list used by day/month/agenda views
      AgendaView.tsx              ← NEW: standalone agenda view (90-day list)
      BookingDrawer.tsx           ← full redesign
      EditBookingSheet.tsx        ← NEW: edit form (extracted from new-booking wizard)
      RescheduleSheet.tsx         ← NEW: lightweight date/time-only reschedule
      LabelPickerSheet.tsx        ← NEW: label selection + create/edit/delete
      CalendarSelectorPanel.tsx   ← NEW: all-calendars toggle
      DayView.tsx                 ← add agenda list below grid
      MonthView.tsx               ← add expandable agenda list below grid
      WeekView.tsx                ← update chip styles (label border, past opacity)
      BlockTimeSheet.tsx          ← unchanged
  app/(dashboard)/calendar/
    page.tsx                      ← add agenda view routing, stats bar, view strip
  components/
    AppShell.tsx                  ← mobile top bar update, add view strip, print icon
```

---

## 11. DB Migrations Required

1. `labels` table (new)
2. `bookings.label_id` (new column)

Both applied via `supabase migration` before feature deploy.

---

## 12. What Stays Unchanged

- CalendarChrome context provider location (AppShell wraps it)
- BlockTimeSheet (block time flow unchanged)
- Bottom nav (Calendar · Clients · Insights · Financials)
- FAB (calendar-only, above bottom nav)
- Realtime subscription on bookings table
- `useBusiness()` hook usage
- RTL-readiness (logical CSS props throughout)

---

## 13. Feature Checklist (implementation tracker)

Legend: ✅ done · 🔄 in progress · ⬜ todo

### Navigation & Chrome
- ✅ Add `"agenda"` to `CalView` type in CalendarChrome
- ⬜ Add `calendarFilter` state to CalendarChrome context
- ✅ Mobile top bar: replace center label + remove ⋮ menu
- ✅ Add permanent view strip (4 tabs) below mobile top bar
- ✅ Desktop sidebar: add Agenda tab (4-item pill group)
- ⬜ Desktop sidebar: replace date button with mini-calendar grid
- ⬜ Print icon in top bar

### Stats header
- ✅ Replace day-only stats cards with `headerLabel` in top bar (all views)

### Views
- ✅ Create `AgendaCard.tsx` shared component
- ✅ Create `AgendaList.tsx` shared component
- ✅ Day view: add AgendaList below time grid (independent scroll, max 40% height)
- ✅ Month view: add AgendaList below calendar grid (fixed 80px rows + scroll)
- ✅ Create `AgendaView.tsx` standalone view
- ✅ Wire Agenda as 4th view in calendar page routing
- ⬜ Week view: label-color left-border on chips, past-opacity

### Booking detail
- ✅ Redesign BookingDrawer header (avatar, name, status badge, time)
- ✅ Context-sensitive action buttons
- ✅ Label accordion section
- ✅ Contact accordion section
- ✅ Payment accordion section
- ✅ Notes accordion section (appointment + client)
- ✅ History accordion section + client link
- ✅ Footer: Edit + Print buttons
- ✅ Create EditBookingSheet
- ✅ Create RescheduleSheet

### Labels
- ⬜ DB migration: labels table
- ⬜ DB migration: bookings.label_id
- ⬜ Create LabelPickerSheet
- ⬜ Update booking chip display (label border color)

### Calendar selector
- ⬜ Create CalendarSelectorPanel
- ⬜ Wire into filter bottom sheet (mobile) + sidebar (desktop)

### Search
- ⬜ Search icon + expand input
- ⬜ Debounced Supabase query
- ⬜ Results as AgendaList

### New booking form
- ⬜ Add paid toggle at confirmation step
- ⬜ Layout polish pass

### Print
- [ ] `@media print` styles
- [ ] Print icon triggers `window.print()`
