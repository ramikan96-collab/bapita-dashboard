# Identity foundation + Hebrew dashboard UI

**What:** Batch 1 — adopt the shared Bapita identity (social-ops token system + primitives)
with Book's terracotta accent. Batch 2 — per-user Hebrew UI language for the dashboard,
switchable in Settings.

**Why:** Social-ops (Loop) reads premium because of one disciplined token/primitive system.
Dashboard drifts (inline styles, amber-on-cream). Decision with Rami 2026-07-02: shared warm
paper base, accent per product (Book = terracotta #D4622A, Social = emerald #1FA971).

**Acceptance criteria:**
- globals.css holds the shared tokens (paper/sand/ink/ink-soft/line/card + primary terracotta)
  and primitives (.card/.btn/.btn-primary/.btn-ghost/.field/.badge/.label). Old var names keep
  working (aliased) so no page breaks.
- App visually shifts: paper background, terracotta primary, soft layered card shadows,
  mono uppercase eyebrow labels available.
- `businesses.dashboard_lang` ('en'|'he', default 'en') + toggle in Settings > Business.
- i18n dictionary (en/he) + provider; shell nav, drawer, calendar chrome, settings section
  titles and common actions render in Hebrew when selected. LTR layout kept (per Rami).
- `npm run lint && npm run build` green. No regression to rate limiting / double-booking /
  delete-account fixes.
