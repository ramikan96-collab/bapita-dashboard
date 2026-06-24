import type { SupabaseClient } from "@supabase/supabase-js";

const ADMIN_PERSONAL_SLUGS: Record<string, string> = {
  "ramikan96@gmail.com": "bapita-admin",
  "info.bapita@gmail.com": "bapita-admin",
};

/**
 * Resolve the active business id for the authenticated owner.
 *
 * Admin emails get their personal slug. Non-admin users first match by
 * owner_id (self-created), then fall back to owner_email (admin-created
 * with their email assigned). Returns null if no match.
 */
export async function getOwnerBusinessId(
  supabase: SupabaseClient,
  ownerId: string,
  userEmail?: string | null
): Promise<string | null> {
  const personalSlug = userEmail ? ADMIN_PERSONAL_SLUGS[userEmail] : undefined;

  if (personalSlug) {
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("slug", personalSlug)
      .limit(1);
    return data?.[0]?.id ?? null;
  }

  // Try business owned by this user's auth id
  const { data: ownedData } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (ownedData?.[0]?.id) return ownedData[0].id;

  // Fallback: business where admin assigned owner_email to this user
  if (userEmail) {
    const { data: emailData } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_email", userEmail)
      .order("created_at", { ascending: true })
      .limit(1);
    return emailData?.[0]?.id ?? null;
  }

  return null;
}
