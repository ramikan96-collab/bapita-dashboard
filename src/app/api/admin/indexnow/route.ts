import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { pingIndexNow } from "@/lib/indexnow";

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let slug = "";
  try {
    ({ slug } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const result = await pingIndexNow([slug]);
  // Never fail the publish over this.
  return NextResponse.json({ ok: result.ok, status: result.status, url: result.urls[0] });
}
