import { notFound, permanentRedirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Business, Page, Service } from "@/types";
import { resolveCanonical } from "@/lib/canonical";
import { isStay } from "@/lib/stay";
import { PageShell } from "./PageShell";

export const dynamic = "force-dynamic";

// The same anon-key client the business homepage uses. Column-level grants on
// public.businesses apply here too: adding a column to BUSINESS_COLUMNS without
// granting it to anon turns every one of these pages into a 404 at once.
function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const BUSINESS_COLUMNS =
  "id, name, name_he, slug, status, business_type, phone, email, address, instagram_url, facebook_url, tiktok_url, whatsapp_number, google_review_link, google_maps_url, waze_url, template_style, hero_image_url, image_focal, accent_color, external_booking_url, cta_label, cta_label_he, default_lang, heading_font, body_font, custom_domain, custom_domain_verified";

interface Props {
  params: Promise<{ slug: string; page: string }>;
}

interface Loaded {
  business: Business;
  page: Page;
  service: Service | null;
  services: Service[];
  siblings: Pick<Page, "id" | "slug" | "title" | "title_he">[];
}

async function load(slug: string, pageSlug: string): Promise<Loaded | null> {
  const supabase = getPublicClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("slug", slug)
    .single();

  if (error || !business) return null;
  const b = business as unknown as Business;

  // RLS hides unpublished pages from anon, so "not found" and "not published"
  // are the same 404 here — no way to probe for a draft page's existence.
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("business_id", b.id)
    .eq("slug", pageSlug)
    .maybeSingle();

  if (!page) return null;
  const p = page as unknown as Page;

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", b.id)
    .eq("active", true)
    .order("display_order");

  const all = (services || []) as Service[];

  const { data: siblings } = await supabase
    .from("pages")
    .select("id, slug, title, title_he")
    .eq("business_id", b.id)
    .neq("id", p.id)
    .order("display_order");

  return {
    business: b,
    page: p,
    service: all.find((s) => s.id === p.service_id) ?? null,
    services: all,
    siblings: (siblings || []) as Pick<Page, "id" | "slug" | "title" | "title_he">[],
  };
}

export default async function ExtraPage({ params }: Props) {
  const { slug, page: pageSlug } = await params;
  const loaded = await load(slug, pageSlug);
  if (!loaded) return notFound();

  const { business: b, page, service, services, siblings } = loaded;

  // Same rule the homepage runs: when a verified custom domain exists, the
  // book.bapita copy is a duplicate and sends users (and link equity) to the
  // brand domain. The custom-domain host arrives here via middleware rewrite
  // with its own host header, so this is false there — no redirect loop.
  const { pageUrl, hasCustomDomain, domain } = resolveCanonical(slug, b, page.slug);
  if (hasCustomDomain) {
    const reqHost = (await headers()).get("host")?.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "") ?? "";
    if (reqHost === "book.bapita.com") {
      permanentRedirect(`https://www.${domain}/${page.slug}`);
    }
  }

  const homeHref = hasCustomDomain ? "/" : `/${slug}`;
  const stay = isStay(b);

  // A stay unit is lodging, an appointment service is a service, and a free
  // page is neither. Emitting the wrong one is worse than emitting none.
  const schema = page.kind === "detail" && service
    ? stay
      ? {
          "@context": "https://schema.org",
          "@type": "Accommodation",
          name: page.title,
          url: pageUrl,
          ...(page.seo_description && { description: page.seo_description }),
          ...(page.content?.hero_image_url || b.hero_image_url
            ? { image: page.content?.hero_image_url || b.hero_image_url }
            : {}),
          ...(service.max_guests ? { occupancy: { "@type": "QuantitativeValue", maxValue: service.max_guests } } : {}),
          ...(service.price > 0 && {
            potentialAction: {
              "@type": "ReserveAction",
              target: pageUrl,
            },
          }),
          ...(b.address && {
            address: { "@type": "PostalAddress", streetAddress: b.address, addressCountry: "IL" },
          }),
          containedInPlace: { "@type": "LodgingBusiness", name: b.name, url: resolveCanonical(slug, b).pageUrl },
        }
      : {
          "@context": "https://schema.org",
          "@type": "Service",
          name: page.title,
          url: pageUrl,
          ...(page.seo_description && { description: page.seo_description }),
          serviceType: service.name,
          provider: { "@type": "LocalBusiness", name: b.name, url: resolveCanonical(slug, b).pageUrl },
          ...(service.price > 0 && {
            offers: { "@type": "Offer", price: service.price, priceCurrency: "ILS", url: pageUrl },
          }),
        }
    : {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: page.title,
        url: pageUrl,
        ...(page.seo_description && { description: page.seo_description }),
        isPartOf: { "@type": "WebSite", name: b.name, url: resolveCanonical(slug, b).pageUrl },
      };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <PageShell
        business={b}
        page={page}
        service={service}
        services={services}
        siblings={siblings}
        homeHref={homeHref}
      />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug, page: pageSlug } = await params;
  const loaded = await load(slug, pageSlug);
  if (!loaded) return { title: "Not found" };

  const { business: b, page } = loaded;
  const { canonicalBase, pageUrl, hasCustomDomain } = resolveCanonical(slug, b, page.slug);

  const title = page.seo_title || `${page.title} | ${b.name}`;
  const description = page.seo_description || page.content?.body?.slice(0, 155) || undefined;
  const image = page.og_image_url || page.content?.hero_image_url || b.hero_image_url || `${canonicalBase}/og-image.png`;

  // Both languages live on one URL (the toggle is client-side), so hreflang
  // points at the same href — the correct signal for a bilingual page rather
  // than inventing /he URLs that do not exist.
  const languages = { en: pageUrl, he: pageUrl, "x-default": pageUrl };

  return {
    title,
    ...(description && { description }),
    // Demo/template pages are near-duplicate showcases — keep them out of the index.
    ...(/^demo(-|$)/.test(slug) && { robots: { index: false, follow: true } }),
    alternates: { canonical: pageUrl, languages },
    openGraph: {
      title,
      ...(description && { description }),
      url: pageUrl,
      siteName: hasCustomDomain ? b.name : "Bapita",
      images: [{ url: image, width: 1200, height: 630, alt: page.title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(description && { description }),
      images: [image],
    },
  };
}
