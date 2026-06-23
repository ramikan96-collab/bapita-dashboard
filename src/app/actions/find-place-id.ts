"use server";

export interface PlaceLookupResult {
  placeId: string;
  name:    string;
  address: string;
}

export async function findPlaceId(
  businessName: string,
  businessAddress: string,
): Promise<PlaceLookupResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const query = `${businessName} ${businessAddress}`.trim();
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const res  = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;

    const top = data.results[0];
    return {
      placeId: top.place_id,
      name:    top.name,
      address: top.formatted_address ?? "",
    };
  } catch {
    return null;
  }
}
