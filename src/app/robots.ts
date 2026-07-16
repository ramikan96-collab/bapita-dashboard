import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
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
    sitemap: "https://book.bapita.com/sitemap.xml",
  };
}
