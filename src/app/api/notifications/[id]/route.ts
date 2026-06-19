import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBusinessId } from "@/lib/business";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const businessId = await getOwnerBusinessId(supabase, user.id);
  if (!businessId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  return NextResponse.json({ ok: true });
}
