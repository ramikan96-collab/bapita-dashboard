import type { GoogleReview } from "@/types";

interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  time: number;
}

export async function fetchPlaceReviews(placeId: string): Promise<GoogleReview[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return [];

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}&fields=reviews&key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "OK") return [];

    const raw: PlaceReview[] = data.result?.reviews ?? [];
    return raw.slice(0, 5).map((r, i) => ({
      id:     `gplace-${i}-${r.time}`,
      author: r.author_name,
      rating: r.rating,
      text:   r.text,
      date:   r.relative_time_description,
    }));
  } catch {
    return [];
  }
}
