import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Script from "next/script";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${heebo.className} h-full`}>
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
