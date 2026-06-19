import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS policy scopes this to all businesses owned by auth.uid() — no manual filter needed
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return NextResponse.json({ notifications: notifications ?? [], unreadCount });
}
