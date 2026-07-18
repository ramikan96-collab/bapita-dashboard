import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import BookingShell from "./BookingShell";
import type { Business, Service } from "@/types";
import { fetchPlaceData } from "@/lib/google-places";

export const dynamic = "force-dynamic";

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Per-business brand assets (favicon + share image) under public/clients/<slug>/.
const BRAND_ASSET_SLUGS = new Set(["shimi-azut-hairstudio"]);

/**
 * Resolve the canonical/OG host from the incoming request.
 *
 * When a business is served on its verified custom domain, every SEO signal
 * points at that domain (self-canonical at "/"). Otherwise it keeps the
 * book.bapita platform slug URL. Driven entirely by verified DB fields, so
 * book.bapita slug clients are never affected. Metadata + JSON-LD both call
 * this so they can never disagree.
 */
async function resolveCanonical(
  slug: string,
  business: { custom_domain?: string | null; custom_domain_verified?: boolean | null }
) {
  const host =
    (await headers()).get("host")?.toLowerCase().replace(/:\d+$/, "") ?? "";
  const bareHost = host.replace(/^www\./, "");
  const domain = business.custom_domain?.replace(/^www\./, "") ?? "";
  const onCustomDomain =
    !!domain && business.custom_domain_verified === true && bareHost === domain;
  const canonicalBase = onCustomDomain
    ? `https://www.${domain}`
    : "https://book.bapita.com";
  const pageUrl = onCustomDomain ? `${canonicalBase}/` : `${canonicalBase}/${slug}`;
  return { onCustomDomain, canonicalBase, pageUrl };
}

/**
 * Known cities for DB-driven SEO copy + structured address. Parsed from the
 * free-text address string (HE or EN) so title/description/schema stay keyed
 * off DB data, never a client name. Extend as new cities are onboarded.
 */
const SEO_CITIES = [
  { match: /הרצליה|herzl/i, en: "Herzliya", he: "הרצליה", region: "Tel Aviv District" },
] as const;

type SeoCity = (typeof SEO_CITIES)[number];

function parseCity(address?: string | null): SeoCity | null {
  if (!address) return null;
  return SEO_CITIES.find((c) => c.match.test(address)) ?? null;
}

/**
 * Human, keyword + location aware title/description. No hyphens or dashes.
 * HE copy when default_lang === "he", else EN. General helper (name + city
 * interpolated), shipped with smart defaults; a real meta_title/meta_description
 * field can override this later.
 */
function buildSeoCopy(opts: {
  name: string;
  nameHe?: string | null;
  city: SeoCity | null;
  lang: "he" | "en";
}): { title: string; description: string } {
  const { name, nameHe, city, lang } = opts;
  if (lang === "he") {
    const displayName = nameHe || name;
    const inCity = city ? ` ב${city.he}` : "";
    return {
      title: `${displayName} | מספרה וברבר${inCity}`,
      description: `מספרה של ${displayName}${inCity}. תספורות גבר, עיצוב זקן וטיפוח מקצועי. קבעו תור אונליין בקלות ובכמה קליקים.`,
    };
  }
  const inCity = city ? ` in ${city.en}` : "";
  return {
    title: `${name} | Barber and Hair Studio${inCity}`,
    description: `${name} hair studio${inCity}. Men's cuts, beard styling and grooming. Book your appointment online in seconds.`,
  };
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const supabase = getPublicClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, slug, status, phone, email, address, instagram_url, facebook_url, tiktok_url, whatsapp_number, google_review_link, google_maps_url, waze_url, business_hours, template_style, tagline, hero_image_url, hero_position, image_focal, gallery_images, gallery_hidden, about_text, accent_color, external_booking_url, show_gallery, show_about, show_hours, show_location, default_lang, stat_years, stat_clients, stat_rating, google_reviews, google_place_id, show_reviews, section_order, name_he, tagline_he, about_text_he, show_services, show_stats, show_open_status, profile_image_url, show_staff, staff_members, heading_font, body_font, gallery_source, instagram_embed, custom_domain, custom_domain_verified")
    .eq("slug", slug)
    .single();

  if (error || !business) return notFound();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", (business as unknown as Business).id)
    .eq("active", true)
    .order("display_order");

  const b = business as unknown as Business;

  // Hide images flagged as "not in gallery" (e.g. backgrounds/covers) from the
  // public gallery grid. They stay available as hero/cover via hero_image_url.
  if (Array.isArray(b.gallery_hidden) && b.gallery_hidden.length > 0 && Array.isArray(b.gallery_images)) {
    const hidden = new Set(b.gallery_hidden);
    b.gallery_images = b.gallery_images.filter((url) => !hidden.has(url));
  }

  // Merge Google Places reviews (server-side, 1h cache) with manual testimonials,
  // and auto-populate the hero rating + review count straight from Google.
  let placeLocation: { lat: number; lng: number } | null = null;
  if (b.google_place_id) {
    const place = await fetchPlaceData(b.google_place_id);
    if (place.reviews.length > 0) {
      const manual = Array.isArray(b.google_reviews) ? b.google_reviews : [];
      b.google_reviews = [...place.reviews, ...manual];
    }
    // Google's live numbers override the manual stat fields when present.
    if (place.rating != null) b.stat_rating = place.rating.toFixed(1);
    if (place.total  != null) b.google_review_count = place.total;
    placeLocation = place.location;
  }

  const city = parseCity(b.address);

  const { canonicalBase, pageUrl } = await resolveCanonical(slug, b);

  // Brand share image, served from the same host as the canonical URL so it
  // never points off-domain. Falls back to the hero image for non-brand slugs.
  const schemaImage = BRAND_ASSET_SLUGS.has(slug)
    ? `${canonicalBase}/clients/${slug}/og.png`
    : b.hero_image_url;

  // Days with valid open hours, mapped to schema.org OpeningHoursSpecification.
  const dayNames: Record<keyof NonNullable<Business["business_hours"]>, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };
  const openingHoursSpecification = b.business_hours
    ? (Object.keys(dayNames) as (keyof typeof dayNames)[])
        .filter((day) => b.business_hours?.[day]?.open)
        .map((day) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: `https://schema.org/${dayNames[day]}`,
          opens: b.business_hours![day].start,
          closes: b.business_hours![day].end,
        }))
    : [];

  const sameAs = [b.instagram_url, b.facebook_url, b.google_review_link].filter(
    (url): url is string => Boolean(url)
  );

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": ["HairSalon", "BarberShop"],
    name: b.name,
    ...(b.name_he && { alternateName: b.name_he }),
    url: pageUrl,
    ...((b.tagline || b.tagline_he) && { description: b.tagline || b.tagline_he }),
    ...(b.phone && { telephone: b.phone }),
    ...(b.email && { email: b.email }),
    ...(b.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: b.address,
        ...(city && { addressLocality: city.en, addressRegion: city.region }),
        addressCountry: "IL",
      },
    }),
    ...(placeLocation && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: placeLocation.lat,
        longitude: placeLocation.lng,
      },
    }),
    priceRange: "₪₪",
    ...(city && { areaServed: city.en }),
    ...(schemaImage && { image: schemaImage }),
    ...(b.google_maps_url && { hasMap: b.google_maps_url }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(openingHoursSpecification.length > 0 && { openingHoursSpecification }),
    ...(b.google_place_id && {
      identifier: { "@type": "PropertyValue", propertyID: "GooglePlaceId", value: b.google_place_id },
    }),
    ...(b.stat_rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: b.stat_rating,
        ...(b.google_review_count && { reviewCount: b.google_review_count }),
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema).replace(/</g, "\\u003c"),
        }}
      />
      <BookingShell
        business={b}
        services={(services || []) as Service[]}
      />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("businesses")
    .select("name, name_he, tagline, hero_image_url, address, default_lang, custom_domain, custom_domain_verified")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Book an appointment" };

  const { canonicalBase, pageUrl } = await resolveCanonical(slug, data);

  // Keyword + location aware copy, HE or EN by default_lang. No dashes.
  const { title, description } = buildSeoCopy({
    name: data.name,
    nameHe: data.name_he,
    city: parseCity(data.address),
    lang: data.default_lang === "he" ? "he" : "en",
  });

  // Per-business brand assets (favicon + share image). Lives under
  // public/clients/<slug>/. Same per-slug override pattern as customs/.
  const brand = BRAND_ASSET_SLUGS.has(slug) ? `/clients/${slug}` : null;

  const image = brand
    ? `${canonicalBase}${brand}/og.png`
    : data.hero_image_url || `${canonicalBase}/og-image.png`;

  return {
    title,
    description,
    // Demo/template pages are near-duplicate showcases — keep them out of the index.
    ...(/^demo(-|$)/.test(slug) && { robots: { index: false, follow: true } }),
    alternates: { canonical: pageUrl },
    ...(brand && {
      icons: {
        icon: [{ url: `${brand}/icon-32.png`, type: "image/png", sizes: "32x32" }],
        apple: [{ url: `${brand}/icon-180.png`, sizes: "180x180" }],
      },
    }),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Bapita",
      images: [{ url: image, width: 1200, height: 630, alt: data.name }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
