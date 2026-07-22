# Online Deposits via Green Invoice — Build Doc & Todo

**Status:** decisions locked, ready to build. This is the running tracker for the build chat — check off TODO items as they land, add sandbox findings under "Open items."

---

## Context — why

Bapita businesses (Israeli salons/barbers/clinics) want customers to pay a **deposit at booking time** to cut no-shows. Today there is **no real payment integration** — only UI stubs (`addons.type='stripe'`, `bookings.payment_status` enum, unused `businesses.stripe_account_id`, a shell Financials page). This builds the real thing.

Research settled two facts:
- Stripe is a poor fit for Israeli **consumer** payments (no תשלומים, no Bit, no local tax invoice). Local rails win.
- Cheapest-friction path for *our* merchants = **Green Invoice (Morning)**, because they very likely already use it for invoicing, its API charges cards + Bit + Apple/Google Pay AND auto-issues the legal חשבונית, and each owner connects their own account (pass-through).

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | What we build | Deposit-at-booking (customer → business). No-show charge is a later phase. |
| 2 | Money-flow | **Pass-through.** Owner's own Green Invoice account. Bapita never holds funds → no license/KYC. |
| 3 | Gateway | **Green Invoice (Morning) API.** Single integration — no second gateway. |
| 4 | Deposit config | **Per-service:** owner sets which services require a deposit + amount (% or fixed ₪), with a business-level default. |
| 5 | Our own owner-billing (₪200/mo) | Out of scope. Stays manual. |
| 6 | MVP payment UX | **Hosted payment link/redirect** (lowest PCI — Bapita never sees card). Card-token/no-show flow is Phase 4. |

**One-integration confirmation:** Green Invoice alone delivers online payments end-to-end. Owner needs Premium **with digital payments (סליקה) switched on**; Bapita integrates the GI API once; every connected owner's bookbapita page can then take deposits (card / Bit / Apple / Google Pay), money → owner, invoice auto-issued.

---

## Flow A — Onboard a client (connect their Green Invoice)

Owner-facing (Settings → Payments); admin (Rami) can also do it from the admin business form.

1. Owner has a Green Invoice **Premium** account with **digital payments (סליקה) enabled**. *(Verify Premium tier grants API access in sandbox — one open item.)*
2. In Green Invoice → **My Account → Developer Tools → API Keys → Add Key** → owner copies **API ID + Secret**.
3. In Bapita **Settings → Payments** → owner pastes API ID + Secret → Bapita does a **token-exchange test call** → on success marks the business **Payments Connected** and flips the `payments` addon `active`.
4. Owner sets deposit rules: enable deposits, default type (% or ₪) + value, then per-service overrides ("which services require it").
5. Done — public booking page now shows the deposit and a pay-to-confirm step for those services.

**Store the API ID+Secret encrypted, per-tenant, in a table NOT readable cross-tenant** (see Security). Never on the `businesses` row — that row already has an open cross-tenant read flag.

## Flow B — Customer pays a deposit at booking

1. Customer picks service + slot on the public page.
2. If the service requires a deposit → booking is created as **`pending_payment`** (slot soft-held), **deposit amount computed server-side** (reuse the existing re-fetch-price guard in `api/public/book`, never trust client).
3. Bapita calls Green Invoice API → creates a **payment link/form** for the deposit → returns the redirect URL.
4. Customer pays on Green Invoice's **hosted page** (card / Bit / Apple / Google Pay). Green Invoice **auto-issues the legal invoice/receipt** to the customer.
5. Green Invoice **webhook/callback** → Bapita route **verifies the payment** (re-fetch txn from GI API, don't trust the redirect), then: booking → `confirmed`, `payment_status='deposit_paid'`, inserts a `transactions` row (idempotent on provider txn id), fires the existing confirmation email.
6. **Unpaid `pending_payment` bookings auto-expire** after N minutes → slot released (prevents dead-holding slots).

## Flow C — Track from admin

- **Financials page** (currently a stub): wire to the real `transactions` table — deposits collected per business, counts, dates, status. Replace the fake `revenue * 0.019` math.
- **Admin business view** (`BusinessForm.tsx`): show Payments-connected state + deposit config per business.
- Every paid deposit = one `transactions` row + the Green-Invoice-hosted invoice URL for reference.

---

## Data model changes

- **New `transactions` table:** `id, business_id, booking_id, amount, currency('ILS'), provider('greeninvoice'), provider_txn_id (unique), invoice_url, status, created_at`. (README already flags this table as needed/empty.)
- **Payment credentials** — dedicated `payment_credentials` table (owner-only RLS), `business_id, provider, api_id, api_secret_encrypted, connected_at`. Do **not** reuse `businesses.stripe_account_id`; deprecate that stub.
- **Per-service deposit fields** on `services`: `deposit_required bool, deposit_type ('percent'|'fixed'), deposit_value numeric`. Plus business-level defaults on `businesses`: `deposit_enabled, deposit_default_type, deposit_default_value`.
- **`bookings.payment_status`** enum: add `pending_payment`, `deposit_paid`, `expired` (keep existing `none|cash|transfer`; drop/ignore `stripe`).
- **`addons`**: new `type='payments'` as the on/off switch (replaces the `stripe` stub the Financials page reads).

## Security (must-haves)

- Encrypt GI API secret at rest; only server (service role) reads it; never sent to client.
- Fix the open **authenticated cross-tenant read** of billing/credential columns flagged in `docs/audits/2026-07-04-full-audit.md` — do not add secrets to a leaky table.
- Webhook: **verify** by re-fetching the transaction from Green Invoice (don't trust redirect/client); **idempotent** on `provider_txn_id`.
- Deposit amount always computed server-side from `services.price`.

## Files to touch (reuse existing patterns)

- `src/app/api/public/book/route.ts` — add deposit branch; reuse server-side price re-fetch (~L147-159), booking insert (~L270-281).
- `src/app/(dashboard)/settings/page.tsx` — new **Payments** section (connect + deposit config).
- `src/app/(dashboard)/financials/page.tsx` — replace stub (L46, 477-481, 1105-1156, 608-617) with real `transactions` data.
- `src/types/index.ts` — Service deposit fields (L179-192), Booking `payment_status` (L2, 16-36), Business payment fields.
- `src/app/(dashboard)/admin/businesses/_components/BusinessForm.tsx` — admin visibility of connect + config.
- **New:** `src/lib/greeninvoice.ts` (API client: token exchange, create payment link, fetch txn), `src/app/api/payments/greeninvoice/create/route.ts`, `src/app/api/payments/greeninvoice/webhook/route.ts`, `docs/migrations/2026-07-22-payments.sql`.

---

## TODO (running tracker — check off in the build chat)

### Phase 0 — verify + schema
- [x] Sandbox: confirmed GI endpoints live (2026-07-22). See "Sandbox findings" below. Endpoints written into `src/lib/greeninvoice.ts` header; `getGreenInvoiceToken()` implemented.
- [x] Migration `docs/migrations/2026-07-22-payments.sql` written (NOT yet applied): `transactions`, `payment_credentials`, per-service deposit fields, business deposit defaults, `bookings.payment_status` new values, `addons` `payments` type. RLS: owner-only creds. Billing-column leak fix included as a commented review-before-apply block (risky prod RLS change, kept out of the additive txn — separate `payment_credentials` table already keeps secrets off the leaky row).

### Phase 1 — owner connect + config ✅
- [x] Settings → Payments UI: enter GI API ID+Secret → validate via token exchange → show Connected. (`settings/_components/PaymentsSection.tsx`, `api/payments/greeninvoice/connect`)
- [x] Deposit config UI: business default + per-service toggle/type/value.
- [x] `getBusinessGiContext(businessId)` server helper; AES-256-GCM encrypt/decrypt secret (`PAYMENTS_ENC_KEY`).

### Phase 2 — deposit booking flow ✅
- [x] `api/public/book`: deposit branch → create `pending_payment` booking → create GI payment form → return redirect URL (rolls back the hold on form failure).
- [x] Public booking UI: `useBookingFlow` redirects to GI hosted page; `/pay/success` + `/pay/cancel` return pages.
- [x] `api/payments/greeninvoice/webhook`: verify (re-fetch txn), mark paid, insert `transactions`, idempotent on `provider_txn_id`.
- [x] Auto-expire unpaid `pending_payment` bookings → release slot (`api/payments/greeninvoice/expire` + `vercel.json` cron, 15 min window).
- [x] Confirmation email only after payment confirmed (sent from the webhook).

### Phase 3 — admin tracking ✅
- [x] Financials page → real `transactions` data (dropped `revenue*0.019` stub; gate fixed to `addon_type='payments'`).
- [x] Admin business view: Payments-connected + deposit config (read-only card in `BusinessForm.tsx`).

### Phase 4 — no-show protection (LATER — not built)
- [ ] Save card token at booking (with consent) → charge on no-show via GI token charge (`POST /payments/tokens/{id}/charge`). Deferred: needs a live clearing terminal to test + explicit consent UX. Endpoints already documented in `src/lib/greeninvoice.ts`.

## Sandbox findings (2026-07-22, verified live)
- **Auth:** `POST /account/token {id,secret}` → `{token, expires}` (unix, ~30 min JWT). Classic GI auth — the owner Developer-Tools keys use this, not the Morning OAuth path the old Airbnb Apps Script used. Sandbox base `https://sandbox.d.greeninvoice.co.il/api/v1`; prod host rejects the sandbox key (401, as expected).
- **`/payments/form` contract:** fields `{type, description, lang, currency, vatType, amount, maxPayments, pluginId, group, client, income, remarks, successUrl, failureUrl, notifyUrl, custom}`. Total field is **`amount`** (not `sum` → 2417). Requires an active clearing terminal (סליקה): without one, errorCode **2600** "לא נמצא מסוף סליקה פעיל".
- **Webhooks:** `POST /webhooks {url, events:[...]}`, `GET/DELETE /webhooks/{id}`. Events: `document.paid, payment.received, payment.failed, payment.refunded, ...`
- **Premium/API:** API access confirmed (`/businesses/me` → 200). Digital payments (סליקה) is NOT enabled on this sandbox account → that is the one thing still needed to observe a live hosted-page URL + live webhook payload. GI account config, not a code blocker.
- **Phase-4 token charge:** `POST /payments/tokens/{id}/charge`, `POST /payments/tokens/search`.

## Open items to confirm (not blockers)
1. ~~Green Invoice Premium grants API~~ ✅ confirmed. Digital payments (סליקה) still needs enabling on a test account to see the live form URL + webhook payload.
2. ~~Exact GI payment-link + webhook contract~~ ✅ confirmed (see Sandbox findings). Response type of `/payments/form` (the hosted URL + txn id field) can only be locked once a clearing terminal is active.
3. Auto-expire window for unpaid bookings (default: 15 min — confirm).

## Reference
- Green Invoice API docs (Apiary): https://jsapi.apiary.io/apis/greeninvoice.html
- API keys: Green Invoice → My Account → Developer Tools → API Keys
