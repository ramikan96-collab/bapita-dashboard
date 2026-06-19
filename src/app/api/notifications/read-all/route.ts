import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!biz) return NextResponse.json({ ok: true });

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("business_id", biz.id)
    .is("read_at", null);

  return NextResponse.json({ ok: true });
}
