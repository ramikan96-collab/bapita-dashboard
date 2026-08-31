import type { GoogleReview } from "@/types";

interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  time: number;
}

export interface PlaceData {
  reviews: GoogleReview[];
  /** Aggregate average rating (e.g. 4.9), null if unavailable */
  rating: number | null;
  /** Total number of Google reviews (user_ratings_total), null if unavailable */
  total: number | null;
  /** Precise coordinates for schema.org GeoCoordinates, null if unavailable */
  location: { lat: number; lng: number } | null;
}

const EMPTY_PLACE: PlaceData = { reviews: [], rating: null, total: null, location: null };

export async function fetchPlaceData(placeId: string): Promise<PlaceData> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return EMPTY_PLACE;

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}&fields=reviews,rating,user_ratings_total,geometry/location&key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return EMPTY_PLACE;
    const data = await res.json();
    if (data.status !== "OK") return EMPTY_PLACE;

    const raw: PlaceReview[] = data.result?.reviews ?? [];
    const reviews = raw.slice(0, 5).map((r, i) => ({
      id:     `gplace-${i}-${r.time}`,
      author: r.author_name,
      rating: r.rating,
      text:   r.text,
      date:   r.relative_time_description,
    }));

    const loc = data.result?.geometry?.location;
    return {
      reviews,
      rating: typeof data.result?.rating === "number" ? data.result.rating : null,
      total:  typeof data.result?.user_ratings_total === "number" ? data.result.user_ratings_total : null,
      location:
        typeof loc?.lat === "number" && typeof loc?.lng === "number"
          ? { lat: loc.lat, lng: loc.lng }
          : null,
    };
  } catch {
    return EMPTY_PLACE;
  }
}

/** Back-compat thin wrapper — returns just the review list. */
export async function fetchPlaceReviews(placeId: string): Promise<GoogleReview[]> {
  return (await fetchPlaceData(placeId)).reviews;
}

/**
 * The outbound-prospecting view of a place: the fields a pitch needs, not the
 * fields the public page needs. Separate from PlaceData on purpose — that one
 * is cached for an hour and rendered publicly; this one is fetched once per
 * prospect and written into a sheet.
 */
export interface PlaceProfile {
  place_id: string;
  name: string;
  /** Digits and punctuation as Google returns it, e.g. "+972 54-123-4567". Empty when absent. */
  phone: string;
  address: string;
  /** The business's own website. Empty string when Google has none — that IS the signal. */
  website: string;
  rating: number | null;
  reviews_count: number | null;
  /** weekday_text joined with " | ". Empty when absent. */
  hours: string;
}

/**
 * A Maps URL sometimes carries the place_id outright. When it does, use it:
 * Text Search on a URL string returns garbage. Short links (maps.app.goo.gl)
 * do not carry one and are not followed; the caller falls back to asking for a
 * business name.
 */
export function extractPlaceIdFromUrl(query: string): string | null {
  if (!/^https?:\/\//i.test(query)) return null;
  const m = query.match(/place_id[=:]([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** Text Search. Returns the top hit's place_id, or null. */
export async function searchPlaceByQuery(query: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !query.trim()) return null;

  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]?.place_id) return null;
    return data.results[0].place_id as string;
  } catch {
    return null;
  }
}

/** Place Details, prospecting field set. No caching: Places ToS limits how long
 *  most of these may be stored, and a prospect is enriched once. */
export async function fetchPlaceProfile(placeId: string): Promise<PlaceProfile | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;

  const fields = [
    "place_id", "name", "international_phone_number", "formatted_address",
    "website", "rating", "user_ratings_total", "opening_hours/weekday_text",
  ].join(",");

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.result) return null;
    const r = data.result;

    return {
      place_id:      r.place_id ?? placeId,
      name:          r.name ?? "",
      phone:         r.international_phone_number ?? "",
      address:       r.formatted_address ?? "",
      website:       r.website ?? "",
      rating:        typeof r.rating === "number" ? r.rating : null,
      reviews_count: typeof r.user_ratings_total === "number" ? r.user_ratings_total : null,
      hours:         Array.isArray(r.opening_hours?.weekday_text)
                       ? r.opening_hours.weekday_text.join(" | ")
                       : "",
    };
  } catch {
    return null;
  }
}
