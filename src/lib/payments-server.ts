// Server-side load of a business's online-payment configuration.
//
// The public booking page runs on the anon key, which by design cannot read the
// businesses deposit columns (column-level grants) or the addons table (RLS).
// So the page asks for this via the service client and passes only booleans and
// amounts to the browser — never credentials.

import { createServiceClient } from "@/lib/supabase/service";

export interface BusinessPaymentsConfig {
  /** Online payments are switched on AND Green Invoice is connected. */
  active: boolean;
  deposit_enabled: boolean;
  deposit_default_type: string | null;
  deposit_default_value: number | null;
}

export const PAYMENTS_OFF: BusinessPaymentsConfig = {
  active: false,
  deposit_enabled: false,
  deposit_default_type: null,
  deposit_default_value: null,
};

export async function loadBusinessPaymentsConfig(businessId: string): Promise<BusinessPaymentsConfig> {
  if (!businessId) return PAYMENTS_OFF;
  const supabase = createServiceClient();

  const [{ data: addon }, { data: cred }, { data: biz }] = await Promise.all([
    supabase.from("addons").select("active").eq("business_id", businessId).eq("addon_type", "payments").maybeSingle(),
    supabase.from("payment_credentials").select("business_id").eq("business_id", businessId).eq("provider", "greeninvoice").maybeSingle(),
    supabase.from("businesses").select("deposit_enabled, deposit_default_type, deposit_default_value").eq("id", businessId).single(),
  ]);

  // Both must hold: an admin approved payments AND the owner connected their
  // Green Invoice account. Either alone would show a customer a price they
  // cannot actually pay.
  const active = !!addon?.active && !!cred;

  return {
    active,
    deposit_enabled: !!biz?.deposit_enabled,
    deposit_default_type: (biz?.deposit_default_type as string | null) ?? null,
    deposit_default_value: biz?.deposit_default_value != null ? Number(biz.deposit_default_value) : null,
  };
}
