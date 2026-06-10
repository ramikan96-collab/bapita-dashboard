import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import BookingFlow from "./BookingFlow";
import type { Business, Service } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, phone, email, address, instagram_url, google_review_link, business_hours")
    .eq("slug", slug)
    .single();

  if (!business) return notFound();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("display_order");

  return (
    <BookingFlow
      business={business as Business}
      services={(services || []) as Service[]}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from("businesses").select("name").eq("slug", slug).single();
  return {
    title: data?.name ? `Book at ${data.name}` : "Book an appointment",
  };
}
