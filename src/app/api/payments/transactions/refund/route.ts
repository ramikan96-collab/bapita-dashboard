import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Mark a collected payment as refunded.
//
// Money moves in the OWNER'S Green Invoice account, not ours (pass-through
// model), so the actual refund is issued there. This records the outcome so the
// Financials page and the booking stop showing the money as collected.
//
// Owners have no UPDATE policy on transactions (webhook writes them via service
// role), so this route does the ownership check and writes with service role.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { transactionId } = await req.json().catch(() => ({}));
  if (!transactionId || typeof transactionId !== "string") {
    return NextResponse.json({ error: "missing transactionId" }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: txn } = await admin
    .from("transactions")
    .select("id, business_id, booking_id, status")
    .eq("id", transactionId)
    .single();
  if (!txn) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: biz } = await admin
    .from("businesses")
    .select("id, owner_id")
    .eq("id", txn.business_id)
    .single();
  if (!biz || biz.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (txn.status === "refunded") return NextResponse.json({ ok: true, alreadyRefunded: true });
  if (txn.status !== "paid") {
    return NextResponse.json({ error: "only a paid transaction can be refunded" }, { status: 400 });
  }

  const { error } = await admin.from("transactions").update({ status: "refunded" }).eq("id", transactionId);
  if (error) {
    console.error("refund mark failed:", error);
    return NextResponse.json({ error: "failed to update transaction" }, { status: 500 });
  }

  // The booking no longer has money against it. Leave status alone — refunding a
  // deposit does not necessarily cancel the appointment; the owner decides that.
  if (txn.booking_id) {
    await admin.from("bookings").update({ payment_status: "none" }).eq("id", txn.booking_id);
  }

  return NextResponse.json({ ok: true });
}
