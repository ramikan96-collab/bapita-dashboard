# Google Calendar Integration

> **Status:** Planning · **Date:** 2026-07-22 · **Owner:** Rami
> **Model:** Single Bapita OAuth app · **one-time setup add-on** (no monthly)
> **OAuth path:** Publish app to production (unverified at launch) → run Google verification in parallel → warning + user-cap both vanish once verified.

## TL;DR
Each staff links their Google Calendar. Bapita reads busy times (no double-booking) and
writes bookings back as events. **One Bapita-owned Google Cloud OAuth client** for all
businesses (not per-business). Launch with the app **Published/In-production** so refresh
tokens persist. Google verification runs in parallel to remove the warning and the user cap.

| Phase | What | When |
|---|---|---|
| **0** | Dogfood — working slice on **my own** calendar | **Today** |
| **A** | Customer-facing "request add-on" (extras + sidebar + homepage) | Next |
| **B** | Full multi-staff productionize | Later |
| **V** | Google OAuth verification (start ASAP, runs in background) | In parallel |

---

## OAuth model — read this first

**One** Google Cloud project, owned by Bapita. **One** OAuth client. **One** fixed redirect URI.
`client_id` + `client_secret` live in **server env vars** — NOT in the database, NOT per-business.

Publishing-status rules that drive the plan:

| App status | Warning | Refresh token life | User cap |
|---|---|---|---|
| Testing | none | **7 days** ❌ (reconnect weekly) | 100 test users |
| Published, unverified | **shown** | persistent ✅ | ~100 users **total across all customers** |
| Published, **verified** | none ✅ | persistent ✅ | none ✅ |

**Decisions locked:**
- Launch **Published/unverified** (persistent tokens, accept the warning short-term).
- Cap is **global (~100 grants across ALL businesses)** — ~30 businesses at ~3 staff each.
  Start verification before hitting that.
- **Phase 0 dogfood only** may use Testing status on my own account (7-day expiry is fine
  while dogfooding). Do NOT ship customers on Testing.
- Least-privilege scopes: `calendar.events` (push) + freebusy read (pull). Narrower = easier verification.
- Timezone: **Asia/Jerusalem** for all freebusy reads and event writes.

---

## How it works

**Sync (per connection, mode = `pull` \| `push` \| `both`):**
- **Pull** — read staff busy blocks → hide those slots.
- **Push** — write Bapita bookings to their calendar.

**Push loop prevention:** tag Bapita-created events via `extendedProperties.private`
(e.g. `bapita_booking_id=<id>`). On pull, ignore any event carrying that key. Never tag via title text.

**Idempotency:** store `google_event_id` on the booking. Create/update/cancel map to the same
event — no duplicates on retry, reschedule updates in place, cancel deletes.

---

## Phase 0 — Dogfood (TODAY)
Single connection (my business, my calendar). Not multi-tenant yet.

**Build order:**
1. [ ] Google Cloud: one project · enable Calendar API · OAuth consent screen · OAuth client + single redirect URI. (Testing status OK for dogfood only.)
2. [ ] `calendar_connections` table — minimal (see Data Model)
3. [ ] OAuth connect flow: consent → store refresh/access token (encrypted). Client id/secret from **env**, not DB.
4. [ ] Setup UI I can drive myself — connect / disconnect *(location TBD, see Decisions)*
5. [ ] **Pull**: my freebusy (Asia/Jerusalem) → busy slots hidden in booking flow (wire `availability.ts:80`)
6. [ ] **Push**: new booking → tagged event on my calendar (`extendedProperties.private`, loop prevention)

**✅ Exit test:** book a slot → it appears in Google; add a busy block in Google → that slot
disappears in Bapita.

## Phase A — Customer request add-on
Reuses existing add-on infra — **no new backend**.
- [ ] `extras/page.tsx` CATALOG: add `google_calendar`, `recurring: false` (one-time)
- [ ] `AppShell.tsx:991` sidebar "Soon" row → clickable → route to `/extras`
- [ ] Homepage: add to features/add-ons — framed one-time setup, not monthly

## Phase B — Full multi-staff productionize
- [ ] **Flip app to Published/In-production** (not Testing) before onboarding real customers → tokens persist
- [ ] Per-staff connect link → run consent → store tokens (shared Bapita OAuth client, no per-business secrets)
- [ ] Per-connection sync-mode selector (`pull`|`push`|`both`)
- [ ] Pull engine: cron over connected staff → cache freebusy → `availability.ts` merges (multi-staff)
- [ ] Push engine: booking create/update/cancel → create/update/delete event (via stored `google_event_id`)
- [ ] Token refresh + `invalid_grant` → set `needs_reconnect`, surface to admin
- [ ] *(Later)* consider Calendar `watch` webhooks instead of cron for near-real-time pull

## Phase V — Google verification (start ASAP, parallel)
- [ ] Privacy policy page (public URL)
- [ ] Domain verification (Search Console)
- [ ] OAuth consent screen: app name, logo, scopes justification
- [ ] Demo video of the consent + usage flow
- [ ] Submit for verification (sensitive scopes → days-to-weeks review)
- [ ] **Done → warning gone + user cap gone.** Must land before ~30 businesses connect.

---

## Data Model — `calendar_connections`
One row per staff calendar. **No client_id / client_secret columns** — single app creds live in env.

| Column | Notes |
|---|---|
| `id` | pk |
| `business_id` | fk |
| `staff_id` | fk (Phase 0: me) |
| `provider` | `google` |
| `refresh_token` | 🔒 encrypted at rest |
| `access_token` | short-lived (optional — derivable from refresh) |
| `token_expires_at` | for refresh |
| `calendar_id` | default `primary` |
| `sync_mode` | `pull` \| `push` \| `both` |
| `status` | `connected` \| `needs_reconnect` \| `error` |
| `created_at` / `updated_at` | |

*(Push mapping: store `google_event_id` on the booking row, not here.)*

## Security — do not regress
- `refresh_token` encrypted at rest · service-role only · **never** sent to client
- OAuth `client_secret` in **server env**, never in DB, never in client bundle
- Token columns never reach the client: RLS business-scopes rows, but service role bypasses RLS —
  ensure NO client-reachable API selects token columns. Prefer a private schema or a
  secret-excluding view for anything the client can hit.
- Encrypt before insert; decrypt only server-side with service role. (Recommend Supabase Vault.)
- Redirect URI = single fixed Bapita callback
- Push loop prevention: `extendedProperties.private` tag; ignore tagged events on pull
- Never log tokens — not console, not error messages, not Supabase logs

## Code touch points
| File | Role |
|---|---|
| `src/lib/availability.ts:80` | `TODO(phase3)` merge busy blocks → **Pull** wires here |
| `src/components/AppShell.tsx:991` | sidebar "Soon" row → **Phase A** |
| `src/app/(dashboard)/extras/page.tsx` | CATALOG + request modal → **Phase A** |
| `src/app/api/notify-addon-request/route.ts` | existing request email — reuse |
| Booking create/update/cancel paths | **Push** hooks (store/read `google_event_id`) |

## Open decisions (gate Phase 0)
- [ ] **Freebusy cache** — separate table vs JSON column (lean: separate table, has its own TTL/expiry)
- [ ] **Token encryption** — Supabase Vault (recommended) vs pgcrypto vs app-layer AES + env key
- [ ] **Phase 0 setup UI** — Settings page vs hidden admin route
