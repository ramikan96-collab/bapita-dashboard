import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_HOST, SITE_URL } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Point the sitemap line at the requesting host, so a custom domain
  // advertises its own sitemap instead of bapita.com's. Our own host always
  // advertises the canonical apex, never the www alias it may have been
  // reached on — otherwise Google is handed two sitemaps for one site.
  const host = (await headers()).get("host")?.toLowerCase().replace(/:\d+$/, "") ?? SITE_HOST;
  const bareHost = host.replace(/^www\./, "");
  const sitemapUrl =
    bareHost === SITE_HOST ? `${SITE_URL}/sitemap.xml` : `https://${host}/sitemap.xml`;

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
        // Marketing pages that exist but must not be indexed: the demoted v3
        // suite page and the archived pre-relaunch homepage. Both are also
        // noindex in their own metadata — this keeps them out of the crawl.
        "/hub",
        "/legacy",
      ],
    },
    sitemap: sitemapUrl,
  };
}
