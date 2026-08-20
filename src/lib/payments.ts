// Shared payment-mode resolution. Used by the public booking API, the public
// booking UI, the dashboard and the webhook so all four agree on one number.
//
// There is deliberately NO `payment_mode` column: the mode is DERIVED from the
// existing deposit config, so no migration is needed and old rows keep working.
//
//   none    deposit_required = false (or the computed amount is 0)
//   full    the computed amount covers the whole service price (percent = 100,
//           or a fixed value >= price)
//   deposit anything in between
//
// The amount is always recomputed from the server-fetched service price. The
// client value is never trusted.

export type PaymentMode = "none" | "deposit" | "full";
export type DepositType = "percent" | "fixed";

export interface ServiceDepositConfig {
  price?: number | null;
  deposit_required?: boolean | null;
  deposit_type?: string | null;
  deposit_value?: number | null;
}

export interface BusinessDepositConfig {
  deposit_enabled?: boolean | null;
  deposit_default_type?: string | null;
  deposit_default_value?: number | null;
}

export interface ResolvedPayment {
  mode: PaymentMode;
  /** Amount the customer pays online now, ILS, rounded to agorot. */
  amountDue: number;
  /** Amount still payable at the business after an online deposit. */
  balanceDue: number;
  /** Full service price used for the calculation. */
  price: number;
}

export const NO_PAYMENT: ResolvedPayment = { mode: "none", amountDue: 0, balanceDue: 0, price: 0 };

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Resolve what the customer must pay online for one service.
 *
 * @param paymentsActive whether the business has the `payments` addon active
 *        AND has connected Green Invoice. Callers pass the flag they already
 *        have; when false the result is always `none`.
 */
export function resolvePayment(
  service: ServiceDepositConfig | null | undefined,
  business: BusinessDepositConfig | null | undefined,
  paymentsActive: boolean,
): ResolvedPayment {
  const price = round2(Number(service?.price ?? 0));
  if (!paymentsActive || !business?.deposit_enabled || !service?.deposit_required || price <= 0) {
    return { ...NO_PAYMENT, price };
  }

  const type = (service.deposit_type || business.deposit_default_type || "percent") as DepositType;
  const rawValue = service.deposit_value != null
    ? Number(service.deposit_value)
    : Number(business.deposit_default_value ?? 0);

  const raw = type === "percent" ? (price * rawValue) / 100 : rawValue;
  // Never charge more than the service costs, never a negative amount.
  const amountDue = Math.min(Math.max(round2(raw), 0), price);

  if (amountDue <= 0) return { ...NO_PAYMENT, price };

  return {
    mode: amountDue >= price ? "full" : "deposit",
    amountDue,
    balanceDue: round2(price - amountDue),
    price,
  };
}

/** Money for display: whole shekels stay clean, agorot show two digits. */
export function formatIls(amount: number): string {
  const n = Number(amount) || 0;
  return Number.isInteger(n) ? `₪${n}` : `₪${n.toFixed(2)}`;
}
