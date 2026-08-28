import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import { PushInit } from "@/components/PushInit";

// `variable` as well as `className`: the dashboard keeps getting the family
// applied directly on <html> (unchanged), while the ported marketing/hub
// components compose `--font-heebo` through `--font-sans` in globals.css.
// `hebrew` as well as `latin`, since 2026-08-28: the /he route and every
// Hebrew booking page were rendering their type in the fallback stack, because
// Heebo's latin subset does not carry Hebrew glyphs. A Hebrew-language product
// whose Hebrew is set in a system font is not a small thing.
//
// 300 dropped in the same change to pay for part of it — nothing in `src/`
// used `font-light`. The remaining six are all in use: 400 and 900 by the
// dashboard, 500/600/700/800 across the marketing page.
const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bapita Dashboard",
  description: "Manage your bookings, clients, and business.",
  // Default Bapita icons via metadata (NOT the app/icon.svg file convention):
  // file-convention icons are injected on every route including custom booking
  // domains, so a brand's own SERP favicon competed with Bapita's. As metadata
  // they are cleanly overridden by a booking page's per-slug icons.
  icons: {
    icon: [{ url: "/bapita-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/bapita-apple-icon.png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Custom-domain booking pages set this via middleware; own hosts (dashboard,
  // marketing) never do, so they stay lang="en"/dir="ltr" exactly as before.
  const locale = (await headers()).get("x-booking-locale") ?? "en";
  const dir = locale === "he" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${heebo.className} ${heebo.variable} h-full`}>
      <body className="h-full">
        {children}
        <PushInit />
      </body>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-XESDNYB9T6"
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XESDNYB9T6');
        `}
      </Script>
    </html>
  );
}
