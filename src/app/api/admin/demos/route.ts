import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { isExpiredDemo } from "@/lib/outreach/demo";

/**
 * The Demos list for the admin board.
 *
 * This is a route rather than a browser query on purpose. `demo_expires_at` and `lead_source`
 * are read through the service-role client only — neither is in the anon column allowlist, and
 * naming an ungranted column in a client-side select is exactly the mistake that 404'd every
 * public tenant page on 2026-08-22. Going through service-role sidesteps the grant question
 * entirely and keeps sales pipeline state off the public key.
 *
 * Rami asked to see demos explicitly: they are hidden from counts and analytics, never from him.
 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("businesses")
    .select("id, name, slug, phone, status, lead_source, demo_expires_at, created_at, google_place_id")
    .not("demo_expires_at", "is", null)
    .order("demo_expires_at", { ascending: true });

  if (error) {
    console.error("admin demos query failed:", error);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  const now = new Date();
  const demos = (data ?? []).map((d) => ({
    ...d,
    site_url: d.slug ? `https://book.bapita.com/${d.slug}` : null,
    expired: isExpiredDemo(d, now),
    days_left: d.demo_expires_at
      ? Math.ceil((Date.parse(d.demo_expires_at) - now.getTime()) / 86_400_000)
      : null,
  }));

  return NextResponse.json({ demos, count: demos.length });
}

/**
 * Convert a demo into a real customer: clear the clock.
 *
 * One field, and it takes the row out of the nightly sweep, back into analytics, and past the
 * outbound-mail guard in a single write — because all three ask the same question.
 */
export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service
    .from("businesses")
    .update({ demo_expires_at: null })
    .eq("id", body.id);

  if (error) {
    console.error("demo convert failed:", error);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, converted: body.id });
}
