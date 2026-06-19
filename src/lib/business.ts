import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve the active business id for the authenticated owner.
 *
 * An owner can have more than one business row. The client (`useBusiness`)
 * picks the oldest one via `.order("created_at").limit(1)`, so server routes
 * MUST use the same rule — otherwise `.single()` throws on multi-business
 * owners and the route silently treats them as having no business.
 */
export async function getOwnerBusinessId(
  supabase: SupabaseClient,
  ownerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1);

  return data?.[0]?.id ?? null;
}
