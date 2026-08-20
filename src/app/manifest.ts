import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bapita Dashboard",
    short_name: "Bapita",
    description: "Manage your bookings, clients, and business",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F4EE",
    theme_color: "#E8920A",
    icons: [
      {
        src: "/bapita-apple-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
