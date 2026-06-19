import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBusinessId } from "@/lib/business";

export async function PATCH() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const businessId = await getOwnerBusinessId(supabase, user.id);
  if (!businessId) return NextResponse.json({ ok: true });

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .is("read_at", null);

  return NextResponse.json({ ok: true });
}
