import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const host = (await headers()).get("host")?.toLowerCase().replace(/:\d+$/, "") ?? "";
  const bareHost = host.replace(/^www\./, "");

  // The apex is the marketing site and has no tenant pages of its own: its
  // sitemap is the marketing routes only. Tenant pages stay listed under
  // book.bapita.com, which is still where they live.
  if (bareHost === "bapita.com") {
    const now = new Date();
    return [
      { url: "https://bapita.com/", lastModified: now, changeFrequency: "monthly", priority: 1 },
      { url: "https://bapita.com/privacy", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
      { url: "https://bapita.com/terms", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ];
  }

  // On a verified custom domain, this domain has exactly one public page.
  // Return a single-URL sitemap for itself only — never the full platform
  // list (that would be wrong and would leak the client roster).
  if (bareHost && bareHost !== "book.bapita.com" && bareHost !== "bapita.com") {
    const { data: match } = await supabase
      .from("businesses")
      .select("custom_domain")
      .eq("custom_domain", bareHost)
      .eq("custom_domain_verified", true)
      .eq("status", "live")
      .maybeSingle();

    if (match) {
      return [
        {
          url: `https://www.${bareHost}/`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 1,
        },
      ];
    }
  }

  let slugRoutes: MetadataRoute.Sitemap = [];

  try {
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("slug, created_at, custom_domain, custom_domain_verified")
      .eq("status", "live");

    if (error) {
      console.error("sitemap: businesses query failed", error);
    }

    slugRoutes = (businesses ?? [])
      // Exclude demo/template pages: thin, near-duplicate content that would
      // dilute the sitemap and risk duplicate-content signals. Real customers only.
      .filter((b) => !/^demo(-|$)/.test(b.slug))
      // Exclude businesses with a verified custom domain: their book.bapita URL
      // 308-redirects to the brand domain (which is self-canonical and ships its
      // own single-URL sitemap), so listing the redirecting copy here is wrong.
      .filter((b) => !(b.custom_domain && b.custom_domain_verified === true))
      .map((b) => ({
        url: `https://book.bapita.com/${b.slug}`,
        lastModified: b.created_at ? new Date(b.created_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch (err) {
    // DB unavailable — serve homepage-only sitemap
    console.error("sitemap: unexpected failure", err);
  }

  // book.bapita.com/ now 301s to the apex, so it is no longer a URL to submit;
  // this host's sitemap is the tenant pages it actually serves.
  return slugRoutes;
}
