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
