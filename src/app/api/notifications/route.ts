import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBusinessId } from "@/lib/business";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const businessId = await getOwnerBusinessId(supabase, user.id, user.email);
  if (!businessId) return NextResponse.json({ notifications: [], unreadCount: 0 });

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(30);

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return NextResponse.json({ notifications: notifications ?? [], unreadCount, businessId });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const businessId = await getOwnerBusinessId(supabase, user.id, user.email);
  if (!businessId) return NextResponse.json({ ok: true });

  await supabase
    .from("notifications")
    .delete()
    .eq("business_id", businessId);

  return NextResponse.json({ ok: true });
}
