import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getBusinessGiContext, giEnv, giDocType } from "@/lib/greeninvoice";

// "Test payment setup" — owner-facing diagnosis of a Green Invoice connection.
//
// Connecting the API keys is only half the setup: an account also needs digital
// payments (סליקה) switched on before it can take a single shekel. Without this
// endpoint that failure only shows up when a real customer cannot pay. Here the
// owner presses a button and gets the actual Green Invoice answer.
//
// It creates a ₪1 payment FORM and never charges anything — an unpaid form
// issues no document. Owner-scoped: you can only diagnose your own business.

interface Diagnosis {
  ok: boolean;
  env: string;
  docType: number;
  credentials: "connected" | "missing";
  token: "ok" | "rejected" | "skipped";
  clearing: "active" | "not_active" | "unknown";
  message: string;
  errorCode?: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { businessId } = await req.json().catch(() => ({}));
  if (!businessId) return NextResponse.json({ error: "missing businessId" }, { status: 400 });

  const admin = createServiceClient();
  const { data: biz } = await admin.from("businesses").select("id, owner_id").eq("id", businessId).single();
  if (!biz || biz.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result: Diagnosis = {
    ok: false,
    env: giEnv(),
    docType: giDocType(),
    credentials: "missing",
    token: "skipped",
    clearing: "unknown",
    message: "",
  };

  let ctx: { token: string; apiBase: string };
  try {
    ctx = await getBusinessGiContext(businessId);
    result.credentials = "connected";
    result.token = "ok";
  } catch (e) {
    const msg = (e as Error).message || "";
    if (/has not connected/i.test(msg)) {
      result.message = "No Green Invoice account is connected for this business.";
    } else if (/PAYMENTS_ENC_KEY/i.test(msg)) {
      // Server misconfiguration, not the owner's problem — say so without detail.
      result.message = "Server is missing its payment encryption key. Contact Bapita.";
      result.credentials = "connected";
    } else {
      result.credentials = "connected";
      result.token = "rejected";
      result.message = `Green Invoice rejected the saved keys: ${msg}`;
    }
    return NextResponse.json(result);
  }

  // Probe with a ₪1 form. Nothing is charged and no document is issued unless a
  // customer actually pays it.
  const probe = await fetch(`${ctx.apiBase}/payments/form`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ctx.token}` },
    body: JSON.stringify({
      type: result.docType,
      description: "Bapita connection test",
      lang: "he",
      currency: "ILS",
      vatType: 0,
      amount: 1,
      maxPayments: 1,
      client: { name: "Bapita test", emails: [] },
      income: [{ description: "Bapita connection test", quantity: 1, price: 1, currency: "ILS", vatType: 0 }],
    }),
  });
  const body = (await probe.json().catch(() => ({}))) as Record<string, unknown>;

  if (probe.ok) {
    result.ok = true;
    result.clearing = "active";
    result.message = "Ready — this account can take online payments.";
    return NextResponse.json(result);
  }

  const code = Number(body.errorCode) || 0;
  result.errorCode = code;
  if (code === 2600) {
    result.clearing = "not_active";
    result.message = "Green Invoice has no active clearing terminal (סליקה). Turn on digital payments in your Green Invoice account, then test again.";
  } else if (code === 2403) {
    result.message = "Green Invoice rejected the document type for this business type. Contact Bapita — this is a settings fix on our side.";
  } else {
    result.message = (body.errorMessage as string) || `Green Invoice returned an error (${probe.status}).`;
  }
  return NextResponse.json(result);
}
