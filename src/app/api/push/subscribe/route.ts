import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 404 });

  const { subscription } = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const service = createServiceClient();

  // Delete any existing row with same endpoint for this business, then insert
  await service
    .from("push_subscriptions")
    .delete()
    .eq("business_id", biz.id)
    .eq("subscription_json->>endpoint", subscription.endpoint);

  await service.from("push_subscriptions").insert({
    business_id: biz.id,
    subscription_json: subscription,
  });

  return NextResponse.json({ ok: true });
}
