# Good Living Herzliya: Hebrew URLs, approved copy, live rating (2026-10-10)

**What.** A per-business "brand copy" pack (`src/lib/brand-copy/`) for good-living-herzeliya only:
server-rendered Hebrew URLs (`/<slug>/he`, `/<slug>/he/<unit>`), brand name "Good Living Herzliya",
Debby's approved EN/HE titles, metas, H1, intro, About, Location, visible FAQ (+ FAQPage JSON-LD),
unit metas and intros, per-photo alt text keyed by file name. Places lookups move to Places API (New)
with the legacy endpoint as fallback, and log why a lookup failed.

**Why.** Google only saw English (`lang="en"`, client-side toggle, hreflang `he` = EN URL), the brand
read "Good Living" / "כאסה הרצליה", and the hero showed a hand-typed "5.0 · 300+ happy guests" because
no live business has received Places data.

**Acceptance.** 4 EN + 4 HE URLs return 200 with own-language `lang`/`dir`, title, meta, H1; self
canonical; reciprocal hreflang en/he + x-default=EN; HE URLs in sitemap with real lastmod; JSON-LD
name "Good Living Herzliya", no alternateName, aggregateRating only with a Google review count; zero
empty alts; no other business's page changes (no `/he` route for them, Shimi's Places data held).
Photo moves and amenities are DB data: `scripts/good-living-data-2026-10-10.mjs` (dry run by default).
