/**
 * Green Invoice (Morning) API client — deposit payments for Bapita.
 * Spec: docs/specs/2026-07-22-online-payments-greeninvoice.md
 *
 * Model: PASS-THROUGH. Each business connects its OWN Green Invoice account
 * (Premium + digital payments / סליקה enabled). Bapita never holds funds.
 * Per-tenant credentials live in the `payment_credentials` table (owner-only
 * RLS), NOT on the businesses row. The secret is app-layer encrypted; only the
 * server (service role) decrypts it for a token exchange.
 *
 * ── Endpoints (VERIFIED live against sandbox 2026-07-22) ─────────────────────
 *   PROD  base:  https://api.greeninvoice.co.il/api/v1
 *   SANDBOX base: https://sandbox.d.greeninvoice.co.il/api/v1
 *
 *   Auth        POST /account/token   body {id, secret}      -> {token, expires}   [✓ 200]
 *               JWT ~30 min (expires = unix seconds). Cache per business until then.
 *               (This classic auth is what the owner Developer-Tools keys use — NOT
 *                the Morning OAuth path the old Airbnb Apps Script used. Both accept
 *                the key, but /account/token is canonical for the GI v1 REST API.)
 *   Pay form    POST /payments/form                          -> hosted-page URL   (MVP redirect)
 *               Fields: {type, description, lang, currency, vatType, amount, maxPayments,
 *                        pluginId, group, client:{name,emails,...}, income:[...],
 *                        remarks, successUrl, failureUrl, notifyUrl, custom}
 *               NOTE: amount is the total field (NOT `sum` — sends 2417 otherwise).
 *               REQUIRES an active clearing terminal (סליקה) on the account, else
 *               errorCode 2600 "לא נמצא מסוף סליקה פעיל". That is the Flow-A
 *               prerequisite: owner must have Premium + digital payments switched on.
 *   Verify pay  POST /documents/payments/search  (clearing transactions only)
 *               GET  /documents/{id}             (the issued doc — our fallback)
 *               POST /documents/search           (list docs; used for reconcile)
 *   Doc types   320 = invoice/receipt, 400 = receipt. Support depends on the
 *               owner's business type (עוסק פטור rejects 320 with errorCode 2403).
 *   Token chg   POST /payments/tokens/{id}/charge            (Phase 4 no-show)
 *   Tokens      POST /payments/tokens/search                 (Phase 4)
 *
 * ── Sandbox verification result (2026-08-20, re-probed live) ────────────────
 *   ✓ Auth: classic /account/token {id,secret} → JWT ~30 min.
 *   ✓ /payments/form field contract confirmed (total field = `amount`).
 *   ✓ Document `url` is an OBJECT: {origin, he} — never a bare string. Both the
 *     form response and document records use this shape.
 *   ✓ /documents/payments/search exists (200) but returns ONLY cleared-terminal
 *     transactions — a document's own `payment[]` rows do NOT appear there. So
 *     verification falls back to GET /documents/{id} when the search misses.
 *   ✗ /webhooks does NOT exist on this API (404 on GET and POST). There is no
 *     subscription to register: the per-form `notifyUrl` IS the callback.
 *   ✗ Documents carry no `custom` field — only the callback echoes it. Server-side
 *     binding therefore also matches on `remarks` ("Booking <uuid>"), which the
 *     issued document does persist.
 *   ⧗ A live hosted-page URL still needs a clearing terminal (סליקה) on the
 *     account; without it /payments/form answers 2600 for every doc type.
 */

import crypto from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';

export type GiEnv = 'sandbox' | 'production';

export const GI_ENDPOINTS: Record<GiEnv, { apiBase: string }> = {
  sandbox: { apiBase: 'https://sandbox.d.greeninvoice.co.il/api/v1' },
  production: { apiBase: 'https://api.greeninvoice.co.il/api/v1' },
};

// Default environment for all GI calls. Flip to 'sandbox' via GREENINVOICE_ENV
// while testing against a sandbox account.
export function giEnv(): GiEnv {
  return process.env.GREENINVOICE_ENV === 'sandbox' ? 'sandbox' : 'production';
}

// Document type issued when a payment succeeds. 320 = חשבונית מס/קבלה, the right
// doc for a VAT-registered dealer (עוסק מורשה). Exempt dealers (עוסק פטור) cannot
// issue 320 and need 400 (קבלה) — GI answers errorCode 2403 for the wrong one.
// Override per deployment with GREENINVOICE_DOC_TYPE; createPaymentForm also
// retries with the other type automatically on a 2403.
export const GI_DOC_TYPE_DEFAULT = 320;
export const GI_DOC_TYPE_FALLBACK = 400;

export function giDocType(): number {
  const raw = Number(process.env.GREENINVOICE_DOC_TYPE);
  return Number.isFinite(raw) && raw > 0 ? raw : GI_DOC_TYPE_DEFAULT;
}

/**
 * Green Invoice returns URLs as `{origin, he}` objects on documents and, in some
 * responses, as a plain string. Read every shape we have seen.
 */
export function giUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const k of ['origin', 'he', 'en']) {
      if (typeof o[k] === 'string') return o[k] as string;
    }
  }
  return '';
}

// ── Secret encryption at rest (AES-256-GCM) ─────────────────────────────────
// PAYMENTS_ENC_KEY must be a 32-byte key, hex (64 chars) or base64. Server-only.
// Stored format: v1:<iv-b64>:<tag-b64>:<ciphertext-b64>.
function encKey(): Buffer {
  const raw = process.env.PAYMENTS_ENC_KEY;
  if (!raw) throw new Error('PAYMENTS_ENC_KEY is not set');
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('PAYMENTS_ENC_KEY must decode to 32 bytes');
  return buf;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  const [v, ivB64, tagB64, ctB64] = stored.split(':');
  if (v !== 'v1' || !ivB64 || !tagB64 || !ctB64) throw new Error('bad encrypted secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

export interface GiCredentials {
  apiId: string;
  apiSecret: string; // plaintext, in-memory only; never logged, never returned to client
  env?: GiEnv;
}

interface GiTokenResponse {
  token: string;
  expires?: number; // unix seconds
}

/**
 * Token exchange. id+secret -> short-lived JWT (~30 min). Throws on non-2xx.
 * Also the Flow-A "connect test": a successful call proves the credentials +
 * that the account has API access.
 */
export async function getGreenInvoiceToken(creds: GiCredentials): Promise<GiTokenResponse> {
  const base = GI_ENDPOINTS[creds.env ?? 'production'].apiBase;
  const res = await fetch(`${base}/account/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: creds.apiId, secret: creds.apiSecret }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Never echo the secret; surface GI's error only.
    throw new Error(body?.errorMessage || body?.error || `GI token exchange failed (${res.status})`);
  }
  return body as GiTokenResponse;
}

// ── Per-business token (reads + decrypts stored credentials) ────────────────
/**
 * Load a business's connected GI credentials (service role only) and exchange
 * for a short-lived token. Throws if the business has not connected payments.
 */
export async function getBusinessGiContext(businessId: string): Promise<{
  token: string;
  apiBase: string;
  env: GiEnv;
}> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('payment_credentials')
    .select('api_id, api_secret_encrypted')
    .eq('business_id', businessId)
    .eq('provider', 'greeninvoice')
    .single();
  if (error || !data) throw new Error('business has not connected Green Invoice');

  const env = giEnv();
  const secret = decryptSecret(data.api_secret_encrypted as string);
  const { token } = await getGreenInvoiceToken({ apiId: data.api_id as string, apiSecret: secret, env });
  return { token, apiBase: GI_ENDPOINTS[env].apiBase, env };
}

// ── Payment form (hosted redirect) ──────────────────────────────────────────
export interface CreatePaymentFormParams {
  amount: number;              // total, ILS — computed server-side, never from client
  description: string;
  lang?: 'he' | 'en';
  clientName: string;
  clientEmails?: string[];
  remarks?: string;
  successUrl: string;
  failureUrl: string;
  notifyUrl: string;
  /** GI document type issued on payment; 320 = invoice/receipt. */
  type?: number;
  /** clearing plugin id, if the account exposes more than one terminal. */
  pluginId?: string;
  /** opaque value echoed back on the callback — we pass the booking id. */
  custom?: string;
}

/**
 * Creates a Green Invoice hosted payment form and returns its URL.
 * Requires an active clearing terminal (סליקה) on the account, else GI returns
 * errorCode 2600. NOTE: the exact response field carrying the URL is confirmed
 * once a terminal is live; we read the common shapes defensively.
 */
export async function createPaymentForm(
  businessId: string,
  p: CreatePaymentFormParams,
): Promise<{ url: string; raw: Record<string, unknown> }> {
  if (!(p.amount > 0)) throw new Error('deposit amount must be > 0');
  const { token, apiBase } = await getBusinessGiContext(businessId);

  const build = (docType: number): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      type: docType,
      description: p.description,
      lang: p.lang ?? 'he',
      currency: 'ILS',
      vatType: 0,
      amount: p.amount,
      maxPayments: 1,
      client: { name: p.clientName, emails: p.clientEmails ?? [] },
      income: [{ description: p.description, quantity: 1, price: p.amount, currency: 'ILS', vatType: 0 }],
      remarks: p.remarks,
      successUrl: p.successUrl,
      failureUrl: p.failureUrl,
      notifyUrl: p.notifyUrl,
      custom: p.custom,
    };
    if (p.pluginId) body.pluginId = p.pluginId;
    return body;
  };

  const post = async (docType: number) => {
    const res = await fetch(`${apiBase}/payments/form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(build(docType)),
    });
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, raw };
  };

  const first = p.type ?? giDocType();
  let out = await post(first);

  // errorCode 2403 = this business type cannot issue that document. Exempt
  // dealers (עוסק פטור) need 400 instead of 320. Retry once with the other type
  // so an owner never has to know their GI document taxonomy.
  if (!out.ok && Number(out.raw.errorCode) === 2403) {
    const alt = first === GI_DOC_TYPE_FALLBACK ? GI_DOC_TYPE_DEFAULT : GI_DOC_TYPE_FALLBACK;
    out = await post(alt);
  }

  if (!out.ok) {
    const msg = (out.raw.errorMessage as string) || (out.raw.error as string) || `GI /payments/form failed (${out.status})`;
    // 2600 = no active clearing terminal. Surface it plainly; it is the single
    // most common owner-side misconfiguration and is not a code fault.
    throw new Error(Number(out.raw.errorCode) === 2600 ? `${msg} (Green Invoice: digital payments / סליקה is not active on this account)` : msg);
  }

  const url = giUrl(out.raw.url) || giUrl(out.raw.formUrl) || giUrl(out.raw.link);
  if (!url) throw new Error('GI payment form returned no URL');
  return { url, raw: out.raw };
}

/** Fetch one issued document (invoice/receipt) by id. */
export async function getDocument(
  businessId: string,
  docId: string,
): Promise<Record<string, unknown> | null> {
  if (!docId) return null;
  const { token, apiBase } = await getBusinessGiContext(businessId);
  const res = await fetch(`${apiBase}/documents/${encodeURIComponent(docId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

/**
 * Is an issued document actually settled? A receipt (400) or invoice/receipt
 * (320) carries a `payment[]` array; nothing left open means the money landed.
 * Cancelled documents (status 3) never count.
 */
export function documentIsPaid(doc: Record<string, unknown> | null): boolean {
  if (!doc) return false;
  if (Number(doc.status) === 3) return false;
  const payments = (doc.payment as Array<Record<string, unknown>> | undefined) ?? [];
  const paidSum = payments.reduce((sum, row) => sum + (Number(row.price ?? row.amount ?? 0) || 0), 0);
  const amount = Number(doc.amount ?? 0) || 0;
  const open = Number(doc.amountOpened ?? 0) || 0;
  if (amount > 0 && open === 0 && paidSum > 0) return true;
  return paidSum >= amount && amount > 0;
}

// ── Verify a payment by re-fetching from GI (never trust the redirect) ───────
/**
 * Re-fetch a payment/document from GI to confirm it was actually paid before we
 * mark a booking confirmed. Returns the matched payment record or null.
 * Field/endpoint shape is finalised once a live terminal produces a real txn.
 */
export interface VerifiedPayment {
  paid: boolean;
  amount?: number;
  invoiceUrl?: string;
  /** Booking id echoed back by GI (`custom`), when the record carries one. */
  customRef?: string;
  /** Document remarks — we write "Booking <uuid>" there as a second binding. */
  remarks?: string;
  raw: Record<string, unknown>;
}

export async function verifyPayment(
  businessId: string,
  providerTxnId: string,
): Promise<VerifiedPayment | null> {
  if (!providerTxnId) return null;
  const { token, apiBase } = await getBusinessGiContext(businessId);

  // 1. Clearing-transaction lookup. Covers payments taken through the terminal.
  const res = await fetch(`${apiBase}/documents/payments/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paymentId: providerTxnId }),
  });
  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    const items = (raw.items as Array<Record<string, unknown>> | undefined) ?? [];
    // SECURITY: require an EXACT id match. No `items[0]` fallback — otherwise a
    // forged callback with a bogus id would confirm against an unrelated payment.
    const match = items.find((i) => String(i.id ?? i.paymentId) === String(providerTxnId));
    if (match) {
      return {
        paid: true,
        amount: Number(match.amount ?? match.price ?? 0) || undefined,
        invoiceUrl: giUrl(match.url),
        customRef: String(match.custom ?? match.externalKey ?? match.reference ?? ''),
        remarks: String(match.remarks ?? ''),
        raw,
      };
    }
  }

  // 2. Fallback: the id may be a DOCUMENT id (verified in sandbox — a document's
  //    own payment rows never surface in /documents/payments/search). Fetch it
  //    directly and decide from its own payment array.
  const doc = await getDocument(businessId, providerTxnId);
  if (!doc) return { paid: false, raw };
  if (!documentIsPaid(doc)) return { paid: false, raw: doc };

  return {
    paid: true,
    amount: Number(doc.amount ?? 0) || undefined,
    invoiceUrl: giUrl(doc.url),
    customRef: String(doc.custom ?? ''),
    remarks: String(doc.remarks ?? ''),
    raw: doc,
  };
}

/**
 * Reconcile fallback: find a paid document that belongs to one booking.
 *
 * Used when the customer returns from the hosted page but the notifyUrl callback
 * has not arrived (or never will — a blocked webhook must not cost a paying
 * customer their slot). We list the business's recent documents and match on the
 * remarks we wrote when creating the form. Matching is exact on the full
 * "Booking <uuid>" string; a uuid is unguessable, so this cannot cross-bind.
 */
export async function findPaidDocumentForBooking(
  businessId: string,
  bookingId: string,
): Promise<VerifiedPayment | null> {
  if (!bookingId) return null;
  const { token, apiBase } = await getBusinessGiContext(businessId);
  const res = await fetch(`${apiBase}/documents/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    // Newest first, one page is plenty: reconcile runs minutes after payment.
    body: JSON.stringify({ pageSize: 50, page: 1, sort: 'creationDate', order: 'desc' }),
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const items = (body.items as Array<Record<string, unknown>> | undefined) ?? [];

  const marker = bookingRemark(bookingId);
  const hit = items.find((d) => String(d.remarks ?? '').trim() === marker && documentIsPaid(d));
  if (!hit) return null;

  return {
    paid: true,
    amount: Number(hit.amount ?? 0) || undefined,
    invoiceUrl: giUrl(hit.url),
    customRef: bookingId,
    remarks: String(hit.remarks ?? ''),
    raw: hit,
  };
}

/**
 * The remarks string written on every deposit document. Single source of truth —
 * createPaymentForm callers and the reconcile matcher must not drift apart.
 */
export function bookingRemark(bookingId: string): string {
  return `Booking ${bookingId}`;
}

/** GI document id for a reconciled payment, when the record carries one. */
export function documentIdOf(raw: Record<string, unknown> | undefined): string {
  return raw && typeof raw.id === 'string' ? raw.id : '';
}
