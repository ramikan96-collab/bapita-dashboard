import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBusinessId } from "@/lib/business";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const businessId = await getOwnerBusinessId(supabase, user.id, user.email);
  if (!businessId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const businessId = await getOwnerBusinessId(supabase, user.id, user.email);
  if (!businessId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  return NextResponse.json({ ok: true });
}
