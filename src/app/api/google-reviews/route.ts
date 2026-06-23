import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchPlaceReviews } from "@/lib/google-places";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug       = searchParams.get("slug");
  const businessId = searchParams.get("businessId");

  if (!slug && !businessId) {
    return NextResponse.json({ error: "slug or businessId required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  let q = supabase.from("businesses").select("google_place_id");
  if (slug)       q = q.eq("slug", slug);
  else            q = q.eq("id", businessId!);

  const { data } = await q.single();
  if (!data?.google_place_id) {
    return NextResponse.json({ reviews: [] });
  }

  const reviews = await fetchPlaceReviews(data.google_place_id);

  return NextResponse.json(
    { reviews },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60" } },
  );
}
