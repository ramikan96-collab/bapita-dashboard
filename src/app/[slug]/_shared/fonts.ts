// Curated, Hebrew-capable font catalog for booking-page typography.
// Every entry renders Hebrew natively; 'Heebo' is appended only as a last-resort fallback.
// `query` is the Google Fonts css2 `family` param — weights listed only where they exist,
// so the request never 404s (single-weight display fonts omit the wght axis).

export interface FontDef {
  name: string;
  query: string;
}

export const FONT_CATALOG: FontDef[] = [
  { name: "Heebo",            query: "Heebo:wght@300;400;500;600;700;800" },
  { name: "Assistant",        query: "Assistant:wght@300;400;500;600;700;800" },
  { name: "Rubik",            query: "Rubik:wght@400;500;600;700" },
  { name: "Frank Ruhl Libre", query: "Frank+Ruhl+Libre:wght@400;500;700;900" },
  { name: "Secular One",      query: "Secular+One" },
  { name: "Suez One",         query: "Suez+One" },
  { name: "Varela Round",     query: "Varela+Round" },
  { name: "Alef",             query: "Alef:wght@400;700" },
  { name: "David Libre",      query: "David+Libre:wght@400;500;700" },
  { name: "Karantina",        query: "Karantina:wght@300;400;700" },
  // Latin-only geometric (Futura-style). Hebrew text falls back to Heebo via the
  // resolveFont stack, so the Latin wordmark gets the brand look without breaking RTL.
  { name: "Jost",             query: "Jost:wght@300;400;500;600;700" },
];

export const HEBREW_FALLBACK = "'Heebo', sans-serif";

const QUERY_BY_NAME = new Map(FONT_CATALOG.map((f) => [f.name, f.query]));

/** CSS font-family string for a chosen font (or the theme default when none chosen). */
export function resolveFont(chosen: string | null | undefined, themeDefault: string): string {
  if (!chosen) return themeDefault;
  return `'${chosen}', ${HEBREW_FALLBACK}`;
}

/** Google Fonts css2 href for the given chosen font names (nulls/unknowns ignored). */
export function fontsHref(names: (string | null | undefined)[]): string | null {
  const queries = Array.from(
    new Set(
      names
        .map((n) => (n ? QUERY_BY_NAME.get(n) : undefined))
        .filter((q): q is string => Boolean(q))
    )
  );
  if (queries.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${queries.map((q) => `family=${q}`).join("&")}&display=swap`;
}
