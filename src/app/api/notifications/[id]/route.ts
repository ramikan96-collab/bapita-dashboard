import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!biz) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("business_id", biz.id);

  return NextResponse.json({ ok: true });
}
