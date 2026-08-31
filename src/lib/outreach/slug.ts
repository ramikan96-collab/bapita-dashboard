import { createServiceClient } from "@/lib/supabase/service";
import { isReservedSlug } from "@/lib/reserved-slugs";

/**
 * A URL slug from a business name.
 *
 * Places returns Hebrew names for most Israeli businesses and a Hebrew slug is
 * not usable in a pitch link, so non-latin characters are dropped rather than
 * transliterated. A name with no latin characters at all falls back to
 * "business" and picks up a numeric suffix from pickFreeSlug — ugly, but the
 * caller can always pass an explicit `slug`.
 */
export function deriveSlug(name: string): string {
  const s = (name || "")
    .toLowerCase()
    .replace(/['’]/g, "")        // Avi's -> avis, not avi-s
    .replace(/[^a-z0-9]+/g, "-") // everything else becomes a separator
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");        // the slice may have left a trailing separator

  return s || "business";
}

/**
 * The first free slug at or after `base`: base, base-2, base-3, ...
 * Reserved slugs are treated as taken.
 */
export async function pickFreeSlug(base: string): Promise<string> {
  const service = createServiceClient();

  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    if (isReservedSlug(candidate)) continue;

    const { data } = await service
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
  }

  throw new Error(`no free slug after 50 tries from "${base}"`);
}
