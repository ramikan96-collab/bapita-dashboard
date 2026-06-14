import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import BookingShell from "./BookingShell";
import type { Business, Service } from "@/types";

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
    .select("id, name, slug, phone, email, address, instagram_url, facebook_url, whatsapp_number, google_review_link, google_maps_url, waze_url, business_hours, template_style, tagline, hero_image_url, gallery_images, about_text, accent_color, show_gallery, show_about, show_hours, show_location")
    .eq("slug", slug)
    .single();

  if (error || !business) return notFound();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", (business as unknown as Business).id)
    .eq("active", true)
    .order("display_order");

  return (
    <BookingShell
      business={business as unknown as Business}
      services={(services || []) as Service[]}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = getPublicClient();
  const { data } = await supabase.from("businesses").select("name").eq("slug", slug).single();
  return {
    title: data?.name ? `Book at ${data.name}` : "Book an appointment",
  };
}
