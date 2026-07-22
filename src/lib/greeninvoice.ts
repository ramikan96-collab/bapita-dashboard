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
 *   Verify pay  POST /documents/payments/search  (re-fetch by txn/doc; don't trust redirect)
 *   Doc types   320/400/405 require a `payment` array; deposit receipt/invoice auto-issued
 *   Token chg   POST /payments/tokens/{id}/charge            (Phase 4 no-show)
 *   Tokens      POST /payments/tokens/search                 (Phase 4)
 *   Webhooks    POST /webhooks {url, events:[...]}  · GET /webhooks/{id} · DELETE /webhooks/{id}
 *               Events: document.paid, payment.received, payment.failed, payment.refunded, ...
 *
 * ── Sandbox verification result (Phase 0) ───────────────────────────────────
 *   ✓ Auth mechanism resolved: classic /account/token {id,secret}.
 *   ✓ /payments/form contract confirmed (field = amount; validation passes to the
 *     clearing-terminal check).
 *   ✓ Webhook subscription endpoint + event names confirmed from API reference.
 *   ✓ Premium grants API access (authenticated + /businesses/me 200).
 *   ⧗ Live hosted-page URL response + live webhook payload can only be observed
 *     once a clearing terminal (סליקה) is active on a test account — GI account
 *     config, not a code blocker. Lock createPaymentForm's response type then.
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
  const body: Record<string, unknown> = {
    type: p.type ?? 320,
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

  const res = await fetch(`${apiBase}/payments/form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((raw.errorMessage as string) || (raw.error as string) || `GI /payments/form failed (${res.status})`);
  }
  // GI returns the hosted URL as `url` (string) or `{ url: { origin } }`; read both.
  const url =
    typeof raw.url === 'string'
      ? (raw.url as string)
      : (raw.url as { origin?: string } | undefined)?.origin ?? (raw.formUrl as string | undefined) ?? '';
  if (!url) throw new Error('GI payment form returned no URL');
  return { url, raw };
}

// ── Verify a payment by re-fetching from GI (never trust the redirect) ───────
/**
 * Re-fetch a payment/document from GI to confirm it was actually paid before we
 * mark a booking confirmed. Returns the matched payment record or null.
 * Field/endpoint shape is finalised once a live terminal produces a real txn.
 */
export async function verifyPayment(
  businessId: string,
  providerTxnId: string,
): Promise<{ paid: boolean; amount?: number; invoiceUrl?: string; raw: Record<string, unknown> } | null> {
  const { token, apiBase } = await getBusinessGiContext(businessId);
  const res = await fetch(`${apiBase}/documents/payments/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paymentId: providerTxnId }),
  });
  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;
  const items = (raw.items as Array<Record<string, unknown>> | undefined) ?? [];
  const match = items.find((i) => String(i.id ?? i.paymentId) === String(providerTxnId)) ?? items[0];
  if (!match) return { paid: false, raw };
  return {
    paid: true,
    amount: Number(match.amount ?? match.price ?? 0) || undefined,
    invoiceUrl:
      typeof match.url === 'string'
        ? (match.url as string)
        : (match.url as { origin?: string } | undefined)?.origin,
    raw,
  };
}
