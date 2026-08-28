import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { BOOKING_HOST, bookingUrl, SITE_HOST, siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const host = (await headers()).get("host")?.toLowerCase().replace(/:\d+$/, "") ?? "";
  const bareHost = host.replace(/^www\./, "");

  // The apex is the marketing site and has no tenant pages of its own: its
  // sitemap is the marketing routes only. Tenant pages are listed under the
  // booking host below, which is where they live and what `[slug]/page.tsx`
  // declares as their canonical URL.
  if (bareHost === SITE_HOST) {
    const now = new Date();
    // Both languages, each pointing at the other. `alternates.languages` is
    // what tells Google these are one page in two languages rather than two
    // competing pages, and it has to be in the sitemap as well as the head.
    const languages = { en: siteUrl("/"), he: siteUrl("/he") };
    return [
      {
        url: siteUrl("/"),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 1,
        alternates: { languages },
      },
      {
        url: siteUrl("/he"),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 1,
        alternates: { languages },
      },
      { url: siteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
      { url: siteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ];
  }

  // On a verified custom domain, the sitemap is that domain's own pages: its
  // homepage plus any published extra pages, which the middleware serves at
  // brand.com/<page>. Never the full platform list — that would be wrong and
  // would leak the client roster.
  if (bareHost && bareHost !== BOOKING_HOST) {
    const { data: match } = await supabase
      .from("businesses")
      .select("id, custom_domain")
      .eq("custom_domain", bareHost)
      .eq("custom_domain_verified", true)
      .eq("status", "live")
      .maybeSingle();

    if (match) {
      const { data: pages } = await supabase
        .from("pages")
        .select("slug, updated_at")
        .eq("business_id", match.id)
        .eq("published", true)
        .order("display_order");

      return [
        {
          url: `https://www.${bareHost}/`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 1,
        },
        ...(pages ?? []).map((p) => ({
          url: `https://www.${bareHost}/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
      ];
    }
  }

  let slugRoutes: MetadataRoute.Sitemap = [];

  try {
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("id, slug, created_at, custom_domain, custom_domain_verified")
      .eq("status", "live");

    if (error) {
      console.error("sitemap: businesses query failed", error);
    }

    const listed = (businesses ?? [])
      // Exclude demo/template pages: thin, near-duplicate content that would
      // dilute the sitemap and risk duplicate-content signals. Real customers only.
      .filter((b) => !/^demo(-|$)/.test(b.slug))
      // Exclude businesses with a verified custom domain: their book.bapita URL
      // 308-redirects to the brand domain (which is self-canonical and ships its
      // own single-URL sitemap), so listing the redirecting copy here is wrong.
      .filter((b) => !(b.custom_domain && b.custom_domain_verified === true));

    slugRoutes = listed.map((b) => ({
      url: bookingUrl(`/${b.slug}`),
      lastModified: b.created_at ? new Date(b.created_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // Extra pages of the businesses listed above, at book.bapita.com/<slug>/<page>.
    // Scoped to `listed` so the demo and custom-domain exclusions apply to a
    // business's sub-pages exactly as they do to its homepage.
    if (listed.length) {
      const { data: pages } = await supabase
        .from("pages")
        .select("business_id, slug, updated_at")
        .in("business_id", listed.map((b) => b.id))
        .eq("published", true)
        .order("display_order");

      const bySlug = new Map(listed.map((b) => [b.id, b.slug]));
      slugRoutes = slugRoutes.concat(
        (pages ?? []).flatMap((p) => {
          const businessSlug = bySlug.get(p.business_id);
          if (!businessSlug) return [];
          return [{
            url: bookingUrl(`/${businessSlug}/${p.slug}`),
            lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
          }];
        })
      );
    }
  } catch (err) {
    // DB unavailable — serve homepage-only sitemap
    console.error("sitemap: unexpected failure", err);
  }

  // This host's sitemap is the tenant pages it actually serves; the apex
  // returned its own, marketing-only list above.
  return slugRoutes;
}
