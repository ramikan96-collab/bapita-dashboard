import { createClient } from "@/lib/supabase/server";

// Who may use the admin board and the admin API routes.
export const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

/**
 * True when the caller's session is an admin. API routes MUST call this
 * themselves — the redirect in admin/layout.tsx guards the UI, not the API.
 */
export async function isAdminRequest(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}
