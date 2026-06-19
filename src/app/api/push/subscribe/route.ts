import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOwnerBusinessId } from "@/lib/business";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const businessId = await getOwnerBusinessId(supabase, user.id);
  if (!businessId) return NextResponse.json({ error: "no business" }, { status: 404 });

  const { subscription } = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const service = createServiceClient();

  // Delete any existing row with same endpoint for this business, then insert
  await service
    .from("push_subscriptions")
    .delete()
    .eq("business_id", businessId)
    .eq("subscription_json->>endpoint", subscription.endpoint);

  await service.from("push_subscriptions").insert({
    business_id: businessId,
    subscription_json: subscription,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const businessId = await getOwnerBusinessId(supabase, user.id);
  if (!businessId) return NextResponse.json({ ok: true });

  const { endpoint } = await req.json().catch(() => ({ endpoint: undefined }));

  const service = createServiceClient();
  let query = service
    .from("push_subscriptions")
    .delete()
    .eq("business_id", businessId);
  if (endpoint) query = query.eq("subscription_json->>endpoint", endpoint);
  await query;

  return NextResponse.json({ ok: true });
}
