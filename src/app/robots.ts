import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Point the sitemap line at the requesting host, so a custom domain
  // advertises its own sitemap instead of book.bapita's.
  const host = (await headers()).get("host")?.toLowerCase().replace(/:\d+$/, "") ?? "book.bapita.com";

  return {
    rules: {
      userAgent: "*",
      // Allow crawlers to fetch public brand assets (favicons + OG images) that
      // live under /clients/<slug>/. Without these, "/clients" below blocks the
      // favicon, so Google shows the generic globe in search results.
      allow: ["/", "/clients/*/icon-", "/clients/*/og.png"],
      disallow: [
        "/calendar",
        "/clients",
        "/settings",
        "/admin",
        "/login",
        "/auth",
        "/new-booking",
        "/insights",
        "/financials",
        "/profile",
        "/addons",
      ],
    },
    sitemap: `https://${host}/sitemap.xml`,
  };
}
