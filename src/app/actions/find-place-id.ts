"use server";

import { logPlacesFailure } from "@/lib/google-places";

export interface PlaceLookupResult {
  placeId: string;
  name:    string;
  address: string;
}

/**
 * Why a lookup found nothing. A category, never Google's message: this action
 * is callable from the browser, and the admin only needs to know whether to
 * retry, fix the server's Places key, or paste the id by hand.
 */
export type PlaceLookupFailure = "not-configured" | "google-refused" | "no-match";

export type PlaceLookup =
  | ({ ok: true } & PlaceLookupResult)
  | { ok: false; reason: PlaceLookupFailure };

/**
 * Text Search for the admin's "Find on Google Maps" button. Places API (New)
 * first — the legacy endpoint answers REQUEST_DENIED for any key or project
 * without the legacy API, which used to surface as "No match found" — then the
 * legacy endpoint for a key that only has that one.
 */
export async function findPlaceId(
  businessName: string,
  businessAddress: string,
): Promise<PlaceLookup> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    logPlacesFailure("text search", "GOOGLE_PLACES_API_KEY is not set");
    return { ok: false, reason: "not-configured" };
  }

  const query = `${businessName} ${businessAddress}`.trim();

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
      },
      body: JSON.stringify({ textQuery: query }),
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) {
      const top = data.places?.[0];
      if (!top?.id) return { ok: false, reason: "no-match" };
      return { ok: true, placeId: top.id, name: top.displayName?.text ?? "", address: top.formattedAddress ?? "" };
    }
    logPlacesFailure(`text search (new) HTTP ${res.status}`, data?.error ?? data, apiKey);
  } catch (err) {
    logPlacesFailure("text search (new) threw", String(err), apiKey);
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const res  = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data.status === "ZERO_RESULTS") return { ok: false, reason: "no-match" };
    if (data.status !== "OK" || !data.results?.[0]) {
      logPlacesFailure(`text search (legacy) ${data.status}`, data.error_message ?? "", apiKey);
      return { ok: false, reason: "google-refused" };
    }

    const top = data.results[0];
    return {
      ok:      true,
      placeId: top.place_id,
      name:    top.name,
      address: top.formatted_address ?? "",
    };
  } catch (err) {
    logPlacesFailure("text search (legacy) threw", String(err), apiKey);
    return { ok: false, reason: "google-refused" };
  }
}
