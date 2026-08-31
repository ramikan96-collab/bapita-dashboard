import { NextResponse } from "next/server";
import { guardOutreach } from "@/lib/outreach/auth";
import { segmentFor } from "@/lib/outreach/segment";
import {
  extractPlaceIdFromUrl,
  fetchPlaceProfile,
  searchPlaceByQuery,
} from "@/lib/google-places";

/**
 * Row-at-a-time enrichment for the outreach sheet. Free (Places only, no LLM),
 * so it runs on every prospect; the two paid endpoints are chosen per row.
 *
 * Returns real HTTP status codes: the Apps Script fetches with
 * muteHttpExceptions, writes a failure into last_error, sets status "error",
 * and moves to the next row. One bad row never kills a batch.
 */
export async function POST(req: Request) {
  const guard = guardOutreach(req);
  if (!guard.ok) return guard.response;

  let body: { query?: string; place_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  let placeId = (body.place_id ?? "").trim();

  if (!placeId && !query) {
    return NextResponse.json({ error: "query or place_id is required" }, { status: 400 });
  }

  if (!placeId) {
    // A pasted Maps URL sometimes carries the id outright; Text Search on a URL
    // string returns garbage, so try the id first.
    placeId = extractPlaceIdFromUrl(query) ?? "";
  }

  if (!placeId) {
    if (/^https?:\/\//i.test(query)) {
      return NextResponse.json(
        { error: "that Maps link carries no place_id, put the business name and city in query instead" },
        { status: 400 },
      );
    }
    placeId = (await searchPlaceByQuery(query)) ?? "";
  }

  if (!placeId) {
    return NextResponse.json({ error: `no Google Places match for "${query}"` }, { status: 404 });
  }

  const profile = await fetchPlaceProfile(placeId);
  if (!profile) {
    return NextResponse.json({ error: `Places details failed for ${placeId}` }, { status: 404 });
  }

  return NextResponse.json({ ...profile, segment: segmentFor(profile.website) });
}
