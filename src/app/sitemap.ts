import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: businesses } = await supabase
      .from("businesses")
      .select("slug, updated_at")
      .eq("status", "live");

    slugRoutes = (businesses ?? []).map((b) => ({
      url: `https://book.bapita.com/${b.slug}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — serve homepage-only sitemap
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
