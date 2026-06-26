import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import BookingShell from "./BookingShell";
import type { Business, Service } from "@/types";
import { fetchPlaceReviews } from "@/lib/google-places";

export const dynamic = "force-dynamic";

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const supabase = getPublicClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, slug, status, phone, email, address, instagram_url, facebook_url, tiktok_url, whatsapp_number, google_review_link, google_maps_url, waze_url, business_hours, template_style, tagline, hero_image_url, hero_position, image_focal, gallery_images, gallery_hidden, about_text, accent_color, external_booking_url, show_gallery, show_about, show_hours, show_location, default_lang, stat_years, stat_clients, stat_rating, google_reviews, google_place_id, show_reviews, section_order, name_he, tagline_he, about_text_he, show_services, show_stats, show_open_status, profile_image_url, show_staff, staff_members, heading_font, body_font, gallery_source, instagram_embed")
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

  // Merge Google Places reviews (server-side, 1h cache) with manual testimonials
  if (b.google_place_id) {
    const placeReviews = await fetchPlaceReviews(b.google_place_id);
    if (placeReviews.length > 0) {
      const manual = Array.isArray(b.google_reviews) ? b.google_reviews : [];
      b.google_reviews = [...placeReviews, ...manual];
    }
  }

  const pageUrl = `https://bapita.com/${slug}`;

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: b.name,
    url: pageUrl,
    ...(b.phone && { telephone: b.phone }),
    ...(b.address && { address: { "@type": "PostalAddress", streetAddress: b.address } }),
    ...(b.hero_image_url && { image: b.hero_image_url }),
    ...(b.google_maps_url && { hasMap: b.google_maps_url }),
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
    .select("name, tagline, hero_image_url, address")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Book an appointment" };

  const title = `${data.name} — Online Booking`;
  const description =
    data.tagline ||
    `Book an appointment at ${data.name}${data.address ? `, ${data.address}` : ""}. Fast online booking.`;
  const pageUrl = `https://bapita.com/${slug}`;

  // Per-business brand assets (favicon + share image). Lives under
  // public/clients/<slug>/. Same per-slug override pattern as customs/.
  const brandAssetSlugs = new Set(["shimi-azut-hairstudio"]);
  const brand = brandAssetSlugs.has(slug) ? `/clients/${slug}` : null;

  const image = brand
    ? `https://bapita.com${brand}/og.png`
    : data.hero_image_url || "https://bapita.com/og-image.png";

  return {
    title,
    description,
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
