import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

// Admins edit businesses they don't own (e.g. a barber's site). The browser
// client can't: RLS `businesses: owner update` only matches owner_id = auth.uid(),
// so a cross-tenant UPDATE silently affects 0 rows with no error. This route runs
// under the service role (bypasses RLS) and is gated to admin emails.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Never let the body reassign identity / ownership columns.
  delete payload.id;
  delete payload.owner_id;
  delete payload.created_at;

  const service = createServiceClient();
  const { data, error } = await service
    .from("businesses")
    .update(payload)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "business not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
