// Client-safe pieces of the pay-link feature. Server logic lives in payment-links.ts.
import { bookingUrl } from "@/lib/site-url";

/** Hours a new link stays payable unless the host picks otherwise. */
export const LINK_DEFAULT_HOURS = 48;
export const LINK_MAX_HOURS = 24 * 14;
/** Highest amount one link may carry, ILS. Mirrors the table check. */
export const LINK_MAX_AMOUNT = 100000;

export function payLinkUrl(token: string): string {
  return bookingUrl(`/pay/l/${token}`);
}
