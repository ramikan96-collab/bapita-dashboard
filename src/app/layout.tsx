import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import { PushInit } from "@/components/PushInit";

const heebo = Heebo({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bapita Dashboard",
  description: "Manage your bookings, clients, and business.",
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
    <html lang={locale} dir={dir} className={`${heebo.className} h-full`}>
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
