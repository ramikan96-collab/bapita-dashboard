import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGreenInvoiceToken, encryptSecret, giEnv } from "@/lib/greeninvoice";

// POST — owner connects their Green Invoice account.
// Body: { businessId, apiId, apiSecret }. Runs a token-exchange test; on success
// stores the ENCRYPTED secret in payment_credentials (never on businesses) and
// flips the `payments` addon active. The secret never leaves the server.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { businessId, apiId, apiSecret } = await req.json().catch(() => ({}));
  if (!businessId || !apiId || !apiSecret) {
    return NextResponse.json({ error: "missing businessId, apiId or apiSecret" }, { status: 400 });
  }

  const admin = createServiceClient();

  // Ownership check — the caller must own this business.
  const { data: biz } = await admin
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .single();
  if (!biz || biz.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Payments must be opened by an admin first (the `payments` addon active).
  // Owners cannot self-enable — this is a gated, admin-approved feature.
  const { data: gate } = await admin
    .from("addons")
    .select("active")
    .eq("business_id", businessId)
    .eq("addon_type", "payments")
    .maybeSingle();
  if (!gate?.active) {
    return NextResponse.json({ error: "Payments are not enabled for this business yet. Contact Bapita to turn it on." }, { status: 403 });
  }

  // Token-exchange test against Green Invoice.
  try {
    await getGreenInvoiceToken({ apiId, apiSecret, env: giEnv() });
  } catch (e) {
    return NextResponse.json(
      { error: "Green Invoice rejected these keys. Check the API ID + Secret and that the account has API access.", detail: (e as Error).message },
      { status: 400 }
    );
  }

  // Store encrypted credentials (upsert on business_id+provider).
  let encrypted: string;
  try {
    encrypted = encryptSecret(apiSecret);
  } catch (e) {
    console.error("encrypt failed:", e);
    return NextResponse.json({ error: "server misconfigured (encryption key)" }, { status: 500 });
  }

  const { error: credErr } = await admin
    .from("payment_credentials")
    .upsert(
      { business_id: businessId, provider: "greeninvoice", api_id: apiId, api_secret_encrypted: encrypted, connected_at: new Date().toISOString() },
      { onConflict: "business_id,provider" }
    );
  if (credErr) {
    console.error("credential upsert failed:", credErr);
    return NextResponse.json({ error: "failed to save credentials" }, { status: 500 });
  }

  // NOTE: the `payments` addon (admin approval) is NOT touched here — an admin
  // controls that flag. Connecting only stores the owner's credentials.
  return NextResponse.json({ ok: true, connected: true });
}

// DELETE — owner disconnects. Removes credentials + deactivates the addon.
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { businessId } = await req.json().catch(() => ({}));
  if (!businessId) return NextResponse.json({ error: "missing businessId" }, { status: 400 });

  const admin = createServiceClient();
  const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", businessId).single();
  if (!biz || biz.owner_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Only remove the owner's credentials. The admin-controlled `payments` addon
  // (approval) is left as-is — disconnecting is not un-approving.
  await admin.from("payment_credentials").delete().eq("business_id", businessId).eq("provider", "greeninvoice");

  return NextResponse.json({ ok: true, connected: false });
}
