import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!biz) return NextResponse.json({ notifications: [], unreadCount: 0 });

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("business_id", biz.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return NextResponse.json({ notifications: notifications ?? [], unreadCount, businessId: biz.id });
}
