# Calendar + Nav visual redesign (match social-ops look)

**What:** Reskin the booking dashboard's nav (AppShell) and the 4 calendar
views (Month/Week/Day/Agenda) to match the social-ops platform's cleaner
visual language. Keep the amber/terracotta brand color and all behavior.

**Why:** Rami: booking platform looks worse than social. Nav spacing/icons/
styling and calendar type sizes + spacing all need lifting. Mobile too.

**Design deltas (from social-ops):**
- Nav items: `rounded-xl` pills, `gap-3`, active = `bg sand` + `color primary`
  + weight 700 (drop the full-bleed left-border rows). `.label` mono group
  headers. Desktop calendar sidebar → w-60, refined view/filter pills.
- Month view: unified hairline grid (`gap-px` on line bg) in a rounded framed
  container, taller cells, lighter status-dot chips, cleaner weekday row.
- Week/Day: crisper booking blocks (stronger fill, 8px radius, better type),
  refined day/time headers + now-line.
- Agenda: tighten type + spacing rhythm.
- Bottom nav / mobile top bar / toolbar: spacing + text-size polish.

**Acceptance:** builds + lints clean; RTL (insetInline*) + i18n `t()` preserved;
reads cohesive with social on both desktop and mobile; brand amber unchanged.
