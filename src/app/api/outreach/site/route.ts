import { NextResponse } from "next/server";
import { guardOutreach } from "@/lib/outreach/auth";
import { deriveSlug, pickFreeSlug } from "@/lib/outreach/slug";
import { isReservedSlug } from "@/lib/reserved-slugs";
import {
  buildBusinessPayload,
  buildIntakeUserMessage,
  generateBusinessDraft,
  hasLlmProvider,
  insertBusinessWithServices,
  LlmJsonError,
} from "@/lib/intake";
import { fetchPlaceProfile } from "@/lib/google-places";

const BOOKING_ORIGIN = "https://book.bapita.com";

/**
 * Creates ONE draft pitch site for a prospect.
 *
 * Forces status "draft" and lead_source "outreach". It never accepts a status
 * from the caller and can never publish — that is the whole reason a leaked
 * bearer secret is survivable.
 *
 * owner_id is the admin's, exactly as the admin intake does; lead_source is
 * what distinguishes a pitch draft from a real client in the admin board.
 */
export async function POST(req: Request) {
  const guard = guardOutreach(req);
  if (!guard.ok) return guard.response;

  if (!hasLlmProvider()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 500 });
  }

  const ownerId = process.env.OUTREACH_OWNER_ID;
  if (!ownerId) {
    return NextResponse.json({ error: "OUTREACH_OWNER_ID is not set" }, { status: 500 });
  }

  let body: {
    place_id?: string; query?: string; notes?: string;
    lang?: string; slug?: string; force?: boolean; business_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // Idempotency. Without this, one accidental re-run of a 40 row batch creates
  // 40 duplicate drafts and burns 40 slugs.
  if (body.business_id && !body.force) {
    return NextResponse.json(
      { error: "row already has a business_id, pass force:true to build another" },
      { status: 409 },
    );
  }

  const placeId = (body.place_id ?? "").trim();
  if (!placeId) {
    return NextResponse.json({ error: "place_id is required, enrich the row first" }, { status: 400 });
  }

  const profile = await fetchPlaceProfile(placeId);
  if (!profile) {
    return NextResponse.json({ error: `Places details failed for ${placeId}` }, { status: 404 });
  }

  const lang = body.lang === "en" ? "en" : "he";

  // The same raw paste shape the admin intake feeds the LLM, assembled from
  // Places instead of a human copy paste.
  const raw = [
    `Name: ${profile.name}`,
    profile.address       ? `Address: ${profile.address}` : "",
    profile.phone         ? `Phone: ${profile.phone}` : "",
    profile.website       ? `Website: ${profile.website}` : "",
    profile.rating        ? `Google rating: ${profile.rating}` : "",
    profile.reviews_count ? `Google reviews: ${profile.reviews_count}` : "",
    profile.hours         ? `Hours: ${profile.hours}` : "",
    body.query            ? `Search query used: ${body.query}` : "",
  ].filter(Boolean).join("\n");

  let parsed: Record<string, unknown>;
  try {
    parsed = await generateBusinessDraft(
      buildIntakeUserMessage({ lang, vibe: body.notes ?? "", raw }),
    );
  } catch (err) {
    if (err instanceof LlmJsonError) {
      return NextResponse.json({ error: err.message, detail: err.detail }, { status: 422 });
    }
    console.error("[outreach/site] LLM error:", err);
    return NextResponse.json({ error: "LLM error", detail: String(err) }, { status: 422 });
  }

  const requested = (body.slug ?? "").trim();
  if (requested && isReservedSlug(requested)) {
    return NextResponse.json({ error: "slug is reserved" }, { status: 400 });
  }

  let slug: string;
  try {
    slug = requested
      ? await pickFreeSlug(deriveSlug(requested))
      : await pickFreeSlug(deriveSlug((parsed.name as string) || profile.name));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const payload = buildBusinessPayload({
    slug,
    ownerId,
    lang,
    parsed,
    leadSource: "outreach",
  });
  // Belt and braces: buildBusinessPayload already sets draft, and nothing in
  // `parsed` can reach `status`, but this endpoint must never publish.
  payload.status = "draft";
  payload.google_place_id = placeId;

  const { id, error } = await insertBusinessWithServices(payload, parsed.services);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({
    business_id: id,
    slug,
    site_url: `${BOOKING_ORIGIN}/${slug}`,
  });
}
