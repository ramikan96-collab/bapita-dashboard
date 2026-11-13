import Script from "next/script";
import { UMAMI_SITES } from "@/lib/analytics/umami";
import { UmamiEvents } from "./UmamiEvents";

/** Adds the brand's Umami tag to its pages when it has a website ID in UMAMI_SITES; otherwise passes children through. */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const websiteId = UMAMI_SITES[slug];
  return (
    <>
      {children}
      {websiteId && (
        <>
          <Script defer src="https://cloud.umami.is/script.js" data-website-id={websiteId} strategy="afterInteractive" />
          <UmamiEvents />
        </>
      )}
    </>
  );
}
