import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("slug, created_at")
      .eq("status", "live");

    if (error) {
      console.error("sitemap: businesses query failed", error);
    }

    slugRoutes = (businesses ?? []).map((b) => ({
      url: `https://book.bapita.com/${b.slug}`,
      lastModified: b.created_at ? new Date(b.created_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (err) {
    // DB unavailable — serve homepage-only sitemap
    console.error("sitemap: unexpected failure", err);
  }

  return [
    {
      url: "https://book.bapita.com",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...slugRoutes,
  ];
}
