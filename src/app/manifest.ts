import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bapita Dashboard",
    short_name: "Bapita",
    description: "Manage your bookings, clients, and business",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF5EC",
    theme_color: "#E8920A",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
