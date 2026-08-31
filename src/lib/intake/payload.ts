// Fixed brand accent applied to every auto-generated business (RGB 184,134,42).
// The LLM's per-vibe accent_color suggestion is intentionally ignored.
export const BRAND_ACCENT = "#B8862A";

const DEFAULT_HOURS = {
  sunday:    { open: true,  start: "09:00", end: "19:00" },
  monday:    { open: true,  start: "09:00", end: "19:00" },
  tuesday:   { open: true,  start: "09:00", end: "19:00" },
  wednesday: { open: true,  start: "09:00", end: "19:00" },
  thursday:  { open: true,  start: "09:00", end: "19:00" },
  friday:    { open: true,  start: "09:00", end: "16:00" },
  saturday:  { open: false, start: "10:00", end: "14:00" },
};

export interface BusinessPayloadInput {
  slug: string;
  ownerId: string;
  lang: string;
  parsed: Record<string, unknown>;
  /** "outreach" for pitch sites. Omitted entirely when absent, so the admin
   *  intake writes exactly the row it wrote before this extraction. */
  leadSource?: string;
}

export function buildBusinessPayload(input: BusinessPayloadInput): Record<string, unknown> {
  const { slug, ownerId, lang, parsed, leadSource } = input;

  // Merge per-day so a day the LLM omitted falls back to a default instead of
  // leaving a hole that breaks the public page.
  const parsedHours = (parsed.business_hours ?? {}) as Record<string, unknown>;
  const mergedHours = Object.fromEntries(
    Object.entries(DEFAULT_HOURS).map(([day, def]) => [day, parsedHours[day] ?? def])
  );

  return {
    slug,
    owner_id:           ownerId,
    status:             "draft",
    show_about:         true,
    show_gallery:       true,
    show_hours:         true,
    show_location:      true,
    show_stats:         true,
    show_open_status:   true,
    show_services:      true,
    show_reviews:       true,
    profile_image_url:  null,
    name:               parsed.name        || slug,
    name_he:            parsed.name_he     || "",
    tagline:            parsed.tagline     || "",
    tagline_he:         parsed.tagline_he  || "",
    about_text:         parsed.about_text  || "",
    about_text_he:      parsed.about_text_he || "",
    phone:              parsed.phone       || "",
    address:            parsed.address     || "",
    instagram_url:      parsed.instagram_url      || null,
    facebook_url:       parsed.facebook_url       || null,
    tiktok_url:         parsed.tiktok_url         || null,
    whatsapp_number:    parsed.whatsapp_number    || null,
    google_maps_url:    parsed.google_maps_url    || null,
    google_review_link: parsed.google_review_link || null,
    accent_color:       BRAND_ACCENT,
    template_style:     (parsed.template_style as string) || "classic",
    default_lang:       lang,
    dashboard_lang:     lang,
    google_reviews:     Array.isArray(parsed.google_reviews) ? parsed.google_reviews.map((r: Record<string,unknown>) => ({
      id:     crypto.randomUUID(),
      author: r.author,
      rating: r.rating,
      text:   r.text,
      date:   r.date,
    })) : null,
    business_hours: mergedHours,
    stat_years:   parsed.stat_years   || null,
    stat_clients: parsed.stat_clients || null,
    stat_rating:  parsed.stat_rating  || null,
    ...(leadSource ? { lead_source: leadSource } : {}),
  };
}
