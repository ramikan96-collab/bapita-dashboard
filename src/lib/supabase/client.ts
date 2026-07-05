import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Dedupes concurrent auth.getUser() calls (each hits the server to revalidate
// the session) so multiple components mounting at once — e.g. AppShell +
// useBusiness — share one network round trip instead of firing one each.
let inFlightUser: Promise<User | null> | null = null;

export function getUserDeduped(): Promise<User | null> {
  if (inFlightUser) return inFlightUser;
  const request = createClient()
    .auth.getUser()
    .then(({ data }: { data: { user: User | null } }) => data.user)
    .finally(() => {
      inFlightUser = null;
    });
  inFlightUser = request;
  return request;
}
