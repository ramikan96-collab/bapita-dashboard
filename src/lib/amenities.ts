/**
 * The fixed amenity vocabulary for stay units (`services.amenities`).
 *
 * A closed list rather than free text: the public page renders a label per key
 * in both languages, and the admin editor offers the same list as checkboxes,
 * so a unit can never carry an amenity that has no Hebrew label. Unknown keys
 * in the database are skipped at render time, never shown raw.
 *
 * Order here is display order — the things guests filter on first.
 */
export const AMENITIES = [
  { key: "wifi",             en: "Wi-Fi", he: "וויפיי" },
  { key: "air-conditioning", en: "Air conditioning", he: "מיזוג אוויר" },
  { key: "free-parking",     en: "Free parking", he: "חניה חינם" },
  { key: "kitchen",          en: "Kitchen", he: "מטבח" },
  { key: "private-garden",   en: "Private garden", he: "גינה פרטית" },
  { key: "terrace",          en: "Terrace", he: "מרפסת" },
  { key: "private-entrance", en: "Private entrance", he: "כניסה נפרדת" },
  { key: "washer",           en: "Washer", he: "מכונת כביסה" },
  { key: "dryer",            en: "Dryer", he: "מייבש כביסה" },
  { key: "workspace",        en: "Workspace", he: "פינת עבודה" },
  { key: "tv",               en: "TV", he: "טלוויזיה" },
  { key: "heating",          en: "Heating", he: "חימום" },
  { key: "cooking-basics",   en: "Cooking basics", he: "כלי בישול בסיסיים" },
  { key: "bed-linens",       en: "Bed linens", he: "מצעים" },
  { key: "hair-dryer",       en: "Hair dryer", he: "מייבש שיער" },
  { key: "self-check-in",    en: "Self check-in", he: "כניסה עצמאית" },
  { key: "pets-allowed",     en: "Pets allowed", he: "אפשר עם חיות מחמד" },
] as const;

export type AmenityKey = (typeof AMENITIES)[number]["key"];

const BY_KEY = new Map<string, (typeof AMENITIES)[number]>(AMENITIES.map((a) => [a.key, a]));

/** Labels for a unit's amenities, in catalogue order, unknown keys dropped. */
export function amenityLabels(keys: string[] | null | undefined, lang: "en" | "he"): string[] {
  if (!keys?.length) return [];
  const set = new Set(keys);
  return AMENITIES.filter((a) => set.has(a.key)).map((a) => (lang === "he" ? a.he : a.en));
}

export function isAmenityKey(key: string): key is AmenityKey {
  return BY_KEY.has(key);
}
