import { notFound, permanentRedirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Business, Page, Service } from "@/types";
import { resolveCanonical } from "@/lib/canonical";
import { isStay, unitPhotos } from "@/lib/stay";
import { amenityLabels } from "@/lib/amenities";
import { shouldNoindex, NOINDEX_ROBOTS } from "@/lib/noindex";
import { langPath, photoAlt, type CopyLang } from "@/lib/brand-copy";
import { brandCopy } from "@/lib/brand-copy/registry";
import { PageShell } from "./PageShell";

// An extra page, shared by /<slug>/<page> and (for a business with a brand copy
// pack) /<slug>/he/<page>. Lives outside page.tsx because a page file may only
// export the page itself.

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
  "id, name, name_he, slug, status, business_type, phone, email, address, instagram_url, facebook_url, tiktok_url, whatsapp_number, google_review_link, google_maps_url, waze_url, template_style, hero_image_url, image_focal, accent_color, external_booking_url, cta_label, cta_label_he, default_lang, heading_font, body_font, custom_domain, custom_domain_verified, gallery_images, gallery_hidden, gallery_groups";

interface Loaded {
  business: Business;
  page: Page;
  service: Service | null;
  services: Service[];
  /** The unit's own photo group, for pages that set no images of their own. */
  photos: string[];
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
  const service = all.find((s) => s.id === p.service_id) ?? null;

  // A detail page with no images of its own shows its unit's photo group, so
  // the page is useful the moment it is created. Hidden photos stay out, the
  // same rule the homepage gallery follows.
  const hidden = new Set(b.gallery_hidden ?? []);
  const visible = new Set((b.gallery_images ?? []).filter((u) => !hidden.has(u)));
  const photos = p.kind === "detail" && service ? unitPhotos(b, service.id).filter((u) => visible.has(u)) : [];

  const { data: siblings } = await supabase
    .from("pages")
    .select("id, slug, title, title_he")
    .eq("business_id", b.id)
    .neq("id", p.id)
    .order("display_order");

  return {
    business: b,
    page: p,
    service,
    services: all,
    photos,
    siblings: (siblings || []) as Pick<Page, "id" | "slug" | "title" | "title_he">[],
  };
}

/** The URL of this page in one language — "he" puts /he before the page slug. */
function pageUrlIn(slug: string, b: Business, pageSlug: string, lang: CopyLang) {
  return resolveCanonical(slug, b, lang === "he" ? `he/${pageSlug}` : pageSlug).pageUrl;
}

/**
 * `urlLang` is set only by the /<slug>/he/<page> route. Without a brand copy
 * pack there is no Hebrew URL, so that route 404s exactly as it did before it
 * existed.
 */
export async function renderExtraPage(slug: string, pageSlug: string, urlLang?: "he") {
  const copy = brandCopy(slug);
  if (urlLang && !copy) return notFound();
  const lang: CopyLang = urlLang ?? "en";

  const loaded = await load(slug, pageSlug);
  if (!loaded) return notFound();

  const { business: b, page, service, services, photos, siblings } = loaded;

  // Same brand name in both languages, page language fixed to the URL's.
  if (copy) {
    b.name = copy.name;
    b.name_he = null;
    b.default_lang = lang;
  }
  const unitCopy = copy?.units[page.slug]?.[lang];

  const image = page.content?.hero_image_url || photos[0] || b.hero_image_url;
  const description = unitCopy?.description || page.seo_description || service?.description || null;

  // Same rule the homepage runs: when a verified custom domain exists, the
  // book.bapita copy is a duplicate and sends users (and link equity) to the
  // brand domain. The custom-domain host arrives here via middleware rewrite
  // with its own host header, so this is false there — no redirect loop.
  const { pageUrl: basePageUrl, hasCustomDomain, domain } = resolveCanonical(slug, b, page.slug);
  if (hasCustomDomain) {
    const reqHost = (await headers()).get("host")?.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "") ?? "";
    if (reqHost === "book.bapita.com") {
      permanentRedirect(`https://www.${domain}/${page.slug}`);
    }
  }

  const pageUrl = copy ? pageUrlIn(slug, b, page.slug, lang) : basePageUrl;
  const parentUrl = copy
    ? resolveCanonical(slug, b, lang === "he" ? "he" : undefined).pageUrl
    : resolveCanonical(slug, b).pageUrl;
  const homeHref = hasCustomDomain ? "/" : copy ? langPath(slug, lang) : `/${slug}`;
  const stay = isStay(b);
  const name = lang === "he" && copy ? page.title_he?.trim() || page.title : page.title;

  // A stay unit is lodging, an appointment service is a service, and a free
  // page is neither. Emitting the wrong one is worse than emitting none.
  const schema = page.kind === "detail" && service
    ? stay
      ? {
          "@context": "https://schema.org",
          "@type": "Accommodation",
          name,
          url: pageUrl,
          ...(copy && { inLanguage: lang }),
          ...(description && { description }),
          ...(image ? { image } : {}),
          ...(service.max_guests ? { occupancy: { "@type": "QuantitativeValue", maxValue: service.max_guests } } : {}),
          ...(service.amenities?.length
            ? {
                amenityFeature: amenityLabels(service.amenities, lang).map((name) => ({
                  "@type": "LocationFeatureSpecification",
                  name,
                  value: true,
                })),
              }
            : {}),
          ...(service.price > 0 && {
            potentialAction: {
              "@type": "ReserveAction",
              target: pageUrl,
            },
          }),
          ...(b.address && {
            address: { "@type": "PostalAddress", streetAddress: b.address, addressCountry: "IL" },
          }),
          containedInPlace: { "@type": "LodgingBusiness", name: b.name, url: parentUrl },
        }
      : {
          "@context": "https://schema.org",
          "@type": "Service",
          name: page.title,
          url: pageUrl,
          ...(page.seo_description && { description: page.seo_description }),
          serviceType: service.name,
          provider: { "@type": "LocalBusiness", name: b.name, url: parentUrl },
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
        isPartOf: { "@type": "WebSite", name: b.name, url: parentUrl },
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
        photos={photos}
        siblings={siblings}
        homeHref={homeHref}
        copy={copy}
      />
    </>
  );
}

export async function extraPageMetadata(slug: string, pageSlug: string, urlLang?: "he") {
  const copy = brandCopy(slug);
  if (urlLang && !copy) return { title: "Not found" };
  const lang: CopyLang = urlLang ?? "en";

  const loaded = await load(slug, pageSlug);
  if (!loaded) return { title: "Not found" };

  const { business: b, page, service, photos } = loaded;
  const { canonicalBase, pageUrl: basePageUrl, hasCustomDomain } = resolveCanonical(slug, b, page.slug);
  const unitCopy = copy?.units[page.slug]?.[lang];
  const pageUrl = copy ? pageUrlIn(slug, b, page.slug, lang) : basePageUrl;

  const title = unitCopy?.title || page.seo_title || `${page.title} | ${copy?.name ?? b.name}`;
  const description =
    unitCopy?.description || page.seo_description || page.content?.body?.slice(0, 155) || service?.description?.slice(0, 155) || undefined;
  const image =
    page.og_image_url || page.content?.hero_image_url || photos[0] || b.hero_image_url || `${canonicalBase}/og-image.png`;

  // With a brand copy pack each language has its own URL and they point at
  // each other. Otherwise both languages live on one URL (the toggle is
  // client-side), so hreflang points at the same href — the correct signal for
  // a bilingual page rather than inventing /he URLs that do not exist.
  const languages = copy
    ? {
        en: pageUrlIn(slug, b, page.slug, "en"),
        he: pageUrlIn(slug, b, page.slug, "he"),
        "x-default": pageUrlIn(slug, b, page.slug, "en"),
      }
    : { en: pageUrl, he: pageUrl, "x-default": pageUrl };

  return {
    title,
    ...(description && { description }),
    // Demo/template pages are near-duplicate showcases — keep them out of the
    // index. So is any business that is not live: draft pitch sites must not be
    // crawlable under a real business's name.
    ...(shouldNoindex(slug, b.status) && { robots: NOINDEX_ROBOTS }),
    alternates: { canonical: pageUrl, languages },
    openGraph: {
      title,
      ...(description && { description }),
      url: pageUrl,
      siteName: copy?.name ?? (hasCustomDomain ? b.name : "Bapita"),
      ...(copy && { locale: lang === "he" ? "he_IL" : "en_US", alternateLocale: [lang === "he" ? "en_US" : "he_IL"] }),
      images: [{ url: image, width: 1200, height: 630, alt: photoAlt(copy, image, lang) ?? page.title }],
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
