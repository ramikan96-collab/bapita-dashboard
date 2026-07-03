# Staff Calendars (Phase 1 + 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make staff a schedulable resource — assign bookings to staff, filter the calendar per staff, and (Phase 2) let customers choose a professional when the owner enables it.

**Architecture:** The existing `public.staff` table becomes the scheduling source of truth. Add `bookings.staff_id`, `services.staff_ids`, `businesses.allow_staff_choice`. Owner Settings gains a Team section that writes the `staff` table (today it only writes the `business.staff_members` JSON, which stays as the public "meet the team" display). The already-scaffolded `CalendarSelectorPanel` + `calendarFilter` mechanism is wired to filter by `staff_id`.

**Tech Stack:** Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5, Supabase (`@supabase/ssr`), Tailwind 4, date-fns. No test runner in repo.

## Global Constraints

- **No test framework exists.** Verify each task with `npx tsc --noEmit`, `npm run lint`, and manual dev-server checks (`npm run dev`). Do NOT add a test runner.
- **Design tokens only** — use CSS vars (`--color-amber`, `--color-cream-2`, `--color-dark`, `--color-muted`, `--color-surface`, `--amber-soft`). Never hardcode hex except staff colors chosen by the user.
- **RTL-safe** — dashboard supports `dashboard_lang` en/he. New user-facing strings go through the existing `t()` i18n (`src/i18n/dict.ts`, add both `en` and `he` keys). Use logical layout (avoid hard left/right where it breaks RTL).
- **Avoid the dashboard `*{padding:0}` global-reset footgun** — set padding via inline style or scoped classes, not bare Tailwind `p-*` that the reset can nullify.
- **Commits:** commit locally after each task. **Do NOT `git push` or deploy until Phase 2 (Task 14) is complete and the owner has verified.**
- Staff assignment is **optional/nullable** — existing bookings with `staff_id = null` must render as "Unassigned". No backfill.
- Supabase region Sydney; migrations applied via Supabase SQL editor or Supabase MCP.

---

## File Structure

- `docs/migrations/2026-07-03-staff-scheduling.sql` — new migration (Task 1)
- `src/types/index.ts` — extend Booking / Service / Business / StaffMember (Task 2)
- `src/lib/staff.ts` — carry color/active; add `loadActiveStaff` (Task 3)
- `src/app/(dashboard)/settings/page.tsx` — Team section + Services staff multi-select (Tasks 4, 6)
- `src/i18n/dict.ts` — new keys (Tasks 4, 6, 7, 8, 14)
- `src/app/(dashboard)/admin/businesses/_components/BusinessForm.tsx` — staff color field (Task 5)
- `src/app/(dashboard)/new-booking/page.tsx` — staff picker + insert (Task 7)
- `src/components/calendar/EditBookingSheet.tsx` — staff reassign (Task 8)
- `src/components/calendar/BookingDrawer.tsx` — show assigned staff (Task 9)
- `src/components/calendar/CalendarSelectorPanel.tsx` — render staff rows (Task 10)
- `src/components/calendar/CalendarChrome.tsx` + `src/components/AppShell.tsx` — thread `staff` (Task 10)
- `src/app/(dashboard)/calendar/page.tsx` — load staff, apply staff filter, color events (Task 11)
- `src/lib/availability.ts` — per-staff availability (Task 12)
- `src/app/api/public/slots/route.ts` + `src/app/api/public/book/route.ts` — accept `staff_id` (Task 13)
- `src/app/[slug]/booking/*` — choose-staff step (Task 14)

---

# PHASE 1 — Internal scheduling

## Task 1: Database migration

**Files:**
- Create: `docs/migrations/2026-07-03-staff-scheduling.sql`

**Interfaces:**
- Produces: `bookings.staff_id uuid`, `services.staff_ids uuid[]`, `businesses.allow_staff_choice boolean`. Later tasks read/write these.

- [ ] **Step 1: Write the migration**

```sql
-- 2026-07-03 staff scheduling: make staff a schedulable resource
alter table public.bookings
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

alter table public.services
  add column if not exists staff_ids uuid[] not null default '{}';

alter table public.businesses
  add column if not exists allow_staff_choice boolean not null default false;

-- staff table already has color/active; ensure defaults exist for older rows
alter table public.staff
  add column if not exists color text,
  add column if not exists active boolean not null default true;

create index if not exists idx_bookings_business_staff_date
  on public.bookings (business_id, staff_id, appointment_date);
```

- [ ] **Step 2: Apply it** via Supabase SQL editor (or Supabase MCP) against the project DB. Run the file's contents.

- [ ] **Step 3: Verify** — run in SQL editor:

```sql
select column_name from information_schema.columns
where table_name='bookings' and column_name='staff_id';
```
Expected: one row, `staff_id`.

- [ ] **Step 4: Commit**

```bash
git add docs/migrations/2026-07-03-staff-scheduling.sql
git commit -m "feat(db): staff scheduling columns — bookings.staff_id, services.staff_ids, allow_staff_choice"
```

## Task 2: Type definitions

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `Booking.staff_id?: string | null`, `Booking.staff?: StaffMember | null`, `Service.staff_ids?: string[] | null`, `Business.allow_staff_choice?: boolean | null`, `StaffMember.color?: string | null`, `StaffMember.active?: boolean`.

- [ ] **Step 1: Extend `Booking`** — add after `label?` (line ~33):

```ts
  staff_id?: string | null;
  staff?: StaffMember | null;
```

- [ ] **Step 2: Extend `Service`** — add after `active: boolean` (line ~177):

```ts
  staff_ids?: string[] | null;
```

- [ ] **Step 3: Extend `Business`** — add near `show_staff` (line ~123):

```ts
  allow_staff_choice?: boolean | null;
```

- [ ] **Step 4: Extend `StaffMember`** (line ~131):

```ts
export interface StaffMember {
  id:        string;
  name:      string;
  role:      string;
  photo_url?: string | null;
  color?:     string | null;
  active?:    boolean;
}
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): staff_id on Booking, staff_ids on Service, allow_staff_choice, StaffMember color/active"
```

## Task 3: Staff data layer

**Files:**
- Modify: `src/lib/staff.ts`

**Interfaces:**
- Consumes: `StaffMember` (now with `color`/`active`).
- Produces: `syncStaffTable` persists `color`/`active`; `loadStaff` returns them; new `loadActiveStaff(supabase, businessId): Promise<StaffMember[]>` returns only `active !== false`, ordered.

- [ ] **Step 1: Persist color/active in `syncStaffTable`** — in the `rows` map add `color` and `active`:

```ts
    const rows = members.map((m, i) => ({
      id:          m.id,
      business_id: businessId,
      name:        m.name.trim(),
      role:        (m.role || "").trim(),
      photo_url:   m.photo_url || null,
      color:       m.color || null,
      active:      m.active !== false,
      sort_order:  i,
    }));
```

- [ ] **Step 2: Select color/active in `loadStaff`**:

```ts
  const { data } = await supabase
    .from("staff")
    .select("id, name, role, photo_url, color, active")
    .eq("business_id", businessId)
    .order("sort_order");
  return (data || []) as StaffMember[];
```

- [ ] **Step 3: Add `loadActiveStaff`** at end of file:

```ts
/** Load only active staff (ordered) — for calendar filtering and booking assignment. */
export async function loadActiveStaff(supabase: Client, businessId: string): Promise<StaffMember[]> {
  const { data } = await supabase
    .from("staff")
    .select("id, name, role, photo_url, color, active")
    .eq("business_id", businessId)
    .neq("active", false)
    .order("sort_order");
  return (data || []) as StaffMember[];
}
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/staff.ts
git commit -m "feat(staff): persist color/active, add loadActiveStaff"
```

## Task 4: Settings — Team section

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/i18n/dict.ts`

**Interfaces:**
- Consumes: `syncStaffTable`, `loadStaff` from `@/lib/staff`; `StaffMember` type.
- Produces: a `"team"` value in the `Section` type + `SECTIONS` array; a `TeamSection` component writing the `staff` table and the `allow_staff_choice` toggle.

- [ ] **Step 1: Add the tab** — in `SECTIONS` (line ~67) add after `hours`:

```ts
  { id: "team",     label: "Team" },
```
Add `"team"` to the `Section` type union (find `type Section =`).

- [ ] **Step 2: Add i18n keys** in `src/i18n/dict.ts` under both `en` and `he` maps (Hebrew values in parentheses as guidance — use natural Hebrew):

```ts
  "settings.team": "Team",                    // he: "צוות"
  "team.add": "Add team member",              // he: "הוסף איש צוות"
  "team.name": "Name",                        // he: "שם"
  "team.role": "Role",                        // he: "תפקיד"
  "team.color": "Calendar color",             // he: "צבע ביומן"
  "team.active": "Active",                    // he: "פעיל"
  "team.allowChoice": "Let customers choose their professional", // he: "אפשר ללקוחות לבחור איש צוות"
```

- [ ] **Step 3: Build `TeamSection`** — add a component modeled on the existing `ServicesSection` (same `SectionCard`, `svcLabel` styles, `showToast`, `createClient`). It:
  - loads staff via `loadStaff(supabase, business.id)` into `useState<StaffMember[]>`,
  - renders a list with name input, role input, a native `<input type="color">` bound to `member.color`, an Active toggle, photo upload (reuse the `uploadStaffPhoto` pattern already in the Website section), and a remove button,
  - an "Add team member" button pushing `{ id: crypto.randomUUID(), name: "", role: "", photo_url: null, color: "#E8920A", active: true }`,
  - a Save that calls `await syncStaffTable(supabase, business.id, staffMembers)` then `showToast(t("saved"), "success")`,
  - the `allow_staff_choice` toggle: `await supabase.from("businesses").update({ allow_staff_choice: next }).eq("id", business.id)`.

```tsx
function TeamSection({ business }: { business: Business }) {
  const { t } = useI18n();
  const supabase = createClient();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allowChoice, setAllowChoice] = useState(!!business.allow_staff_choice);
  useEffect(() => { loadStaff(supabase, business.id).then(setStaff); }, [business.id]);

  async function save() {
    await syncStaffTable(supabase, business.id, staff);
    // keep public "meet the team" JSON in sync for the booking page
    await supabase.from("businesses").update({ staff_members: staff }).eq("id", business.id);
    showToast(t("saved"), "success");
  }
  async function toggleChoice() {
    const next = !allowChoice; setAllowChoice(next);
    const { error } = await supabase.from("businesses").update({ allow_staff_choice: next }).eq("id", business.id);
    if (error) { setAllowChoice(!next); showToast(t("error"), "error"); }
  }
  // ...render list + color input + active toggle + add button + save (follow ServicesSection markup)
  return (/* SectionCard with the above; use existing token styles */ null);
}
```
(Match the exact JSX conventions of `ServicesSection` in this file — same `SectionCard`, label styles, buttons. Import `useI18n`, `showToast`, `syncStaffTable`, `loadStaff`, `StaffMember`, `Business` as the file already does or add imports.)

- [ ] **Step 4: Render the section** — near line ~2196 where `activeSection === "business" && (...)` branches are, add:

```tsx
          {activeSection === "team" && <TeamSection business={business} />}
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit && npm run lint`. Then `npm run dev`, open `/settings`, click **Team**: add a member with a color, Save, reload — it persists. Toggle "let customers choose" and reload — it persists.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/settings/page.tsx src/i18n/dict.ts
git commit -m "feat(settings): Team section — staff CRUD writing staff table, color, active, allow_staff_choice toggle"
```

## Task 5: Admin BusinessForm — staff color field

**Files:**
- Modify: `src/app/(dashboard)/admin/businesses/_components/BusinessForm.tsx`

**Interfaces:**
- Consumes: `syncStaffTable` (now persists color/active) — already imported here.

- [ ] **Step 1: Add a color input** to each staff row in the existing staff editor (near line ~1039 where the name/role inputs are). Bind to `member.color`:

```tsx
                        <input
                          type="color"
                          value={member.color || "#E8920A"}
                          onChange={e => { setDirty(true); setStaffMembers(ms => ms.map((m, i) => i === idx ? { ...m, color: e.target.value } : m)); }}
                          style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer" }}
                          aria-label="Calendar color"
                        />
```
Ensure the "add member" pushes `color: "#E8920A", active: true` too (line ~1061).

- [ ] **Step 2: Verify** — `npx tsc --noEmit`. Then in admin, edit a business, set a staff color, save; confirm `staff.color` populated in DB.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/businesses/_components/BusinessForm.tsx
git commit -m "feat(admin): staff color field in BusinessForm, synced via syncStaffTable"
```

## Task 6: Settings — per-service staff assignment

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/i18n/dict.ts`

**Interfaces:**
- Consumes: active staff list (load with `loadStaff`), `service.staff_ids`.
- Produces: service create/update payloads include `staff_ids`.

- [ ] **Step 1: i18n key** — add `"service.staff": "Who performs this"` (he: "מי נותן שירות זה") to `dict.ts`.

- [ ] **Step 2: Load staff in `ServicesSection`** — add `const [staff, setStaff] = useState<StaffMember[]>([])` and load via `loadStaff(supabase, business.id)` in the existing effect.

- [ ] **Step 3: Add a multi-select** in the service form (a row of toggle chips, one per staff, using `staff.color` dots). Track `selectedStaffIds: string[]` in the edit state; when starting edit of a service, seed from `service.staff_ids ?? []`.

```tsx
        <label style={svcLabel}>{t("service.staff")}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {staff.map(s => {
            const on = selectedStaffIds.includes(s.id);
            return (
              <button key={s.id} type="button"
                onClick={() => setSelectedStaffIds(ids => on ? ids.filter(x => x !== s.id) : [...ids, s.id])}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999,
                  border: `1.5px solid ${on ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                  background: on ? "var(--amber-soft)" : "transparent", cursor: "pointer", fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color || "var(--color-amber)" }} />
                {s.name}
              </button>
            );
          })}
        </div>
```

- [ ] **Step 4: Include in save** — in `saveService` (line ~522) add `staff_ids: selectedStaffIds` to BOTH the `.update({...})` (line ~529) and `.insert({...})` (line ~535) payloads.

- [ ] **Step 5: Verify** — `npx tsc --noEmit`. Dev: assign staff to a service, save, reopen — selection persists.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/settings/page.tsx src/i18n/dict.ts
git commit -m "feat(settings): assign staff to services (service.staff_ids)"
```

## Task 7: New booking — staff picker

**Files:**
- Modify: `src/app/(dashboard)/new-booking/page.tsx`
- Modify: `src/i18n/dict.ts`

**Interfaces:**
- Consumes: `loadActiveStaff`; if a service has `staff_ids`, offer only those (else all active).
- Produces: `bookings.insert` payload includes `staff_id`.

- [ ] **Step 1: i18n keys** — `"booking.staff": "Staff"` (he: "איש צוות"), `"booking.staffAny": "Any"` (he: "כל אחד") in `dict.ts`.

- [ ] **Step 2: Load active staff** — add `const [staff, setStaff] = useState<StaffMember[]>([])` and load via `loadActiveStaff(supabase, business.id)` in the existing business-load effect. Add `const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)`.

- [ ] **Step 3: Render a picker** (only when `staff.length > 0`) near the service/time selection UI — a select or chip row (reuse the chip pattern from Task 6), filtered by the chosen service's `staff_ids` when non-empty. Include an "Any" option (`null`).

- [ ] **Step 4: Add to insert** — in the `.from("bookings").insert({ ... })` at line ~298, add:

```ts
      staff_id: selectedStaffId,
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit`. Dev: create a booking, pick a staff, confirm `bookings.staff_id` set in DB.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/new-booking/page.tsx src/i18n/dict.ts
git commit -m "feat(new-booking): assign staff on creation"
```

## Task 8: Edit booking — reassign staff

**Files:**
- Modify: `src/components/calendar/EditBookingSheet.tsx`
- Modify: `src/i18n/dict.ts` (reuse `booking.staff` from Task 7)

**Interfaces:**
- Consumes: `loadActiveStaff`, `booking.staff_id`.
- Produces: on save, `bookings.update({ staff_id })`.

- [ ] **Step 1: Load active staff** in the sheet (via `loadActiveStaff(supabase, business_id)` — the sheet already has the booking's `business_id`). Seed `selectedStaffId` from `booking.staff_id`.

- [ ] **Step 2: Render a staff picker** (chip row / select, "Any" = null), matching the sheet's existing field styling.

- [ ] **Step 3: Persist** — include `staff_id: selectedStaffId` in the sheet's existing `bookings.update({...})` call, and surface it through the sheet's `onSaved`/`onUpdated` patch so the calendar updates optimistically.

- [ ] **Step 4: Verify** — `npx tsc --noEmit`. Dev: open a booking → edit → change staff → save; calendar reflects it.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/EditBookingSheet.tsx src/i18n/dict.ts
git commit -m "feat(calendar): reassign staff from EditBookingSheet"
```

## Task 9: Booking drawer — show assigned staff

**Files:**
- Modify: `src/components/calendar/BookingDrawer.tsx`

**Interfaces:**
- Consumes: `booking.staff` / `booking.staff_id` (populated once Task 11 selects the join). When absent, show "Unassigned".

- [ ] **Step 1: Render a staff chip** in the drawer's detail area — a colored dot (`booking.staff?.color`) + name, or a muted "Unassigned" pill when `!booking.staff_id`:

```tsx
{booking.staff_id && booking.staff ? (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-dark)" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: booking.staff.color || "var(--color-amber)" }} />
    {booking.staff.name}
  </span>
) : (
  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "var(--color-cream-2)", color: "var(--color-muted)" }}>
    Unassigned
  </span>
)}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`. (Visual check after Task 11 wires the join.)

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/BookingDrawer.tsx
git commit -m "feat(calendar): show assigned staff / unassigned pill in BookingDrawer"
```

## Task 10: Calendar selector — staff rows

**Files:**
- Modify: `src/components/calendar/CalendarSelectorPanel.tsx`
- Modify: `src/components/calendar/CalendarChrome.tsx`
- Modify: `src/components/AppShell.tsx`

**Interfaces:**
- Consumes: a `staff: StaffMember[]` list threaded from the calendar page (Task 11) through chrome.
- Produces: clicking a staff row sets `calendarFilter` to `[staffId]` (toggle); "All calendars" clears it.

- [ ] **Step 1: Extend the panel props + rows** — add `staff: StaffMember[]` to `Props`; after the owner row, map staff to rows with a colored dot (`s.color`) and a checkbox reflecting `calendarFilter.includes(s.id)`. Toggle logic:

```tsx
      {staff.map((s) => {
        const on = calendarFilter.includes(s.id);
        return (
          <button key={s.id}
            onClick={() => setCalendarFilter(on ? calendarFilter.filter(id => id !== s.id) : [...calendarFilter.filter(id => id !== "owner"), s.id])}
            style={{ ...rowStyle, color: on ? "var(--color-amber)" : "var(--color-dark)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-cream-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <Checkbox checked={on} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: s.color || "var(--color-amber)" }} />
            {s.name}
          </button>
        );
      })}
```

- [ ] **Step 2: Thread `staff` through chrome** — in `CalendarChrome.tsx` add `staff: StaffMember[]` to the chrome type (default `[]`).

- [ ] **Step 3: Pass to panel in AppShell** — in `AppShell.tsx` where `CalendarSelectorPanel` is rendered, pass `staff={chrome.staff ?? []}`.

- [ ] **Step 4: Verify** — `npx tsc --noEmit`. (Rows appear after Task 11 supplies the list.)

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/CalendarSelectorPanel.tsx src/components/calendar/CalendarChrome.tsx src/components/AppShell.tsx
git commit -m "feat(calendar): render per-staff rows in CalendarSelectorPanel"
```

## Task 11: Calendar page — load staff, filter, color events

**Files:**
- Modify: `src/app/(dashboard)/calendar/page.tsx`

**Interfaces:**
- Consumes: `loadActiveStaff`; `calendarFilter` (staff ids); `booking.staff_id`.
- Produces: `visibleBookings` filtered by staff; `staff` published to chrome; bookings query joins staff.

- [ ] **Step 1: Load active staff** — add `const [staff, setStaff] = useState<StaffMember[]>([])`; in an effect, `loadActiveStaff(supabase, business.id).then(setStaff)` when business is set.

- [ ] **Step 2: Join staff in the query** — change the three `bookings` selects (lines ~64, ~118, ~179) to include staff:

```ts
.select("*, service:services(name, duration, price), label:labels(id,name,color), staff:staff(id,name,color)")
```

- [ ] **Step 3: Apply the staff filter** — replace `visibleBookings` (line ~303):

```ts
  const byStatus =
    statusFilter.length === 0 ? bookings : bookings.filter((b) => statusFilter.includes(b.status));
  const visibleBookings =
    calendarFilter.length === 0
      ? byStatus
      : byStatus.filter((b) => b.staff_id != null && calendarFilter.includes(b.staff_id));
```

- [ ] **Step 4: Publish staff to chrome** — in the `setChrome({...})` call (line ~148) add `staff,` and add `staff` to that effect's dependency array.

- [ ] **Step 5: Verify** — `npx tsc --noEmit && npm run lint && npm run build`. Dev: create 2 staff, assign bookings to each, open calendar → staff rows appear in the selector → clicking one shows only that staff's bookings → BookingDrawer shows the staff chip.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/calendar/page.tsx
git commit -m "feat(calendar): filter calendar by staff, join staff, publish staff to chrome"
```

**PHASE 1 COMPLETE — do not push yet. Continue to Phase 2.**

---

# PHASE 2 — Public staff choice + per-staff availability

## Task 12: Per-staff availability

**Files:**
- Modify: `src/lib/availability.ts`

**Interfaces:**
- Consumes: bookings pre-filtered by `staff_id`; service `staff_ids`.
- Produces: `getAvailableSlots` accepts an optional `staffId` so callers can pass staff-scoped existing bookings; "Any available" is computed by the caller as the union across eligible staff.

- [ ] **Step 1: Read the current `getAvailableSlots` signature** and confirm it takes `existing bookings`. Keep the core slot math unchanged — availability is driven by which `existing` bookings the caller passes. Add a small helper if needed:

```ts
/** Filter existing bookings to a single staff member (null staff_id excluded when a staff is chosen). */
export function bookingsForStaff<T extends { staff_id?: string | null }>(rows: T[], staffId: string | null): T[] {
  if (!staffId) return rows;
  return rows.filter(r => r.staff_id === staffId);
}
```
Google busy is Phase 3 — leave a `// TODO(phase3): merge Google busy blocks here` seam, no implementation.

- [ ] **Step 2: Verify** — `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/availability.ts
git commit -m "feat(availability): staff-scoped slot filtering helper"
```

## Task 13: Public slots + book API — accept staff_id

**Files:**
- Modify: `src/app/api/public/slots/route.ts`
- Modify: `src/app/api/public/book/route.ts`

**Interfaces:**
- Consumes: optional `staff_id` in request body/query; service `staff_ids` for eligibility; `bookingsForStaff` from Task 12.
- Produces: slots respect the chosen staff; book writes `staff_id`; "any" picks a free eligible staff at booking time.

- [ ] **Step 1: slots route** — accept optional `staff_id`. Load the service's `staff_ids`. When `staff_id` provided, filter existing bookings via `bookingsForStaff(existing, staff_id)` before computing slots. When absent (Any), a slot is offered if ANY eligible staff is free at it.

- [ ] **Step 2: book route** — accept optional `staff_id`; include it in the `bookings.insert`. For "Any", after re-checking the slot, pick the first eligible staff with no conflicting booking at that time and set `staff_id` to it.

- [ ] **Step 3: Verify** — `npx tsc --noEmit`. Curl `/api/public/slots` with and without `staff_id`; confirm different availability when the staff has an existing booking.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/public/slots/route.ts src/app/api/public/book/route.ts
git commit -m "feat(public-api): staff-aware slots and booking (staff_id, any-available)"
```

## Task 14: Public booking — choose-staff step

**Files:**
- Modify: `src/app/[slug]/booking/BookingOverlay.tsx` (+ a new step component under `src/app/[slug]/booking/steps/`)
- Modify: `src/i18n` for the `[slug]` public translations (`src/app/[slug]/translations/en.ts` + `he.ts`)

**Interfaces:**
- Consumes: `business.allow_staff_choice`, `business.staff_members` (public list, has color), selected service's `staff_ids`.
- Produces: selected `staff_id` (or null = Any) passed to slots + book requests.

- [ ] **Step 1: Add translations** — "Choose your professional" / "Any available" to `en.ts` and `he.ts` public dictionaries.

- [ ] **Step 2: Gate the step** — when `allow_staff_choice` is false, the flow is unchanged and `staff_id` stays null. When true, insert a `StaffStep` between service and date/time. List eligible staff (filter `staff_members` by selected service's `staff_ids` when non-empty) as cards with color dot + photo + name + an "Any available" option.

```tsx
// StaffStep: cards from business.staff_members, filtered by service.staff_ids; "Any available" => null
// onSelect(staffId: string | null) => advance to date/time; pass staffId into slots + book calls
```

- [ ] **Step 3: Thread staff_id** — pass the chosen `staff_id` into the `/api/public/slots` and `/api/public/book` calls (Task 13).

- [ ] **Step 4: Verify** — `npx tsc --noEmit && npm run lint && npm run build`. Dev: with `allow_staff_choice` off, public flow unchanged. Turn it on in Settings → Team; public page shows the staff step; booking with a chosen staff sets `bookings.staff_id`; that booking then filters correctly in the dashboard calendar.

- [ ] **Step 5: Commit**

```bash
git add src/app/\[slug\]/booking src/app/\[slug\]/translations
git commit -m "feat(public): choose-your-professional step gated by allow_staff_choice"
```

---

## Deploy gate (after Task 14)

- [ ] `npm run build` clean.
- [ ] Regenerate lockfile if deps changed (`npm install`) — guards the Vercel "Invalid Version" gotcha.
- [ ] Confirm Supabase env vars scoped to Preview + Production on Vercel `bapita-dashboard`.
- [ ] `git push`, let Vercel deploy, **owner verifies on live**: Team section in Settings + admin, per-staff calendar filtering, public choose-staff flow.

## Self-review notes (coverage)

- Spec §"Data model" → Task 1, 2. §"Where to add CRUD" → Tasks 4 (Settings Team), 5 (admin), 6 (services). §"Per-staff calendar" → Tasks 8, 9, 10, 11. §"Public + availability" → Tasks 12, 13, 14. §"UI/UX" (color-coding, Unassigned pill) → Tasks 5, 9, 10, 11. Google (Phase 3) intentionally excluded.
- Type names consistent: `staff_id`, `staff_ids`, `allow_staff_choice`, `StaffMember.color/active`, `loadActiveStaff`, `bookingsForStaff` used identically across tasks.
- Avatar-stack header + per-staff day summary from the spec's UI/UX list are polish items — fold into Task 11 if time allows, otherwise a fast follow (not blocking).
