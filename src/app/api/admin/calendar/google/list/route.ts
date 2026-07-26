import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

// GET — businesses/staff/connections for the admin Calendar tab. Client
// components can't read calendar_connections directly (RLS deny-all), so
// this route fetches with the service role, same as the old calendar-dev page.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createServiceClient();
  const [businessesRes, staffRes, connectionsRes] = await Promise.all([
    admin.from("businesses").select("id, name").order("name"),
    admin.from("staff").select("id, name, business_id").order("name"),
    admin.from("calendar_connections").select("business_id, staff_id, connected_email, status, sync_mode"),
  ]);

  return NextResponse.json({
    businesses: businessesRes.data ?? [],
    staff: staffRes.data ?? [],
    connections: connectionsRes.data ?? [],
  });
}
