import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();

  // Fetch all businesses owned by this user
  const { data: businesses } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id);

  if (businesses && businesses.length > 0) {
    const businessIds = businesses.map((b) => b.id);

    // Delete all child rows scoped by business_id before the business rows,
    // so no orphaned records linger after account deletion.
    await admin.from("bookings").delete().in("business_id", businessIds);
    await admin.from("customers").delete().in("business_id", businessIds);
    await admin.from("services").delete().in("business_id", businessIds);
    await admin.from("staff").delete().in("business_id", businessIds);
    await admin.from("blocked_times").delete().in("business_id", businessIds);
    await admin.from("notifications").delete().in("business_id", businessIds);
    await admin.from("push_subscriptions").delete().in("business_id", businessIds);
    await admin.from("businesses").delete().in("id", businessIds);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
