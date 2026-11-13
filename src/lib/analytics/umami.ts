// Umami Cloud (cookieless) for individual tenant pages. The website ID is public (it sits in the page).
// An empty ID = no tag, no events. Umami's free plan is one website per account, so each brand has its own;
// add a tenant by adding its slug here. Cloud posts events to gateway.umami.is (no CSP on this app).
export const UMAMI_SITES: Record<string, string> = {
  "good-living-herzeliya": "a0410ea8-451b-47e5-b2ba-fd60b0522d1d",
};

type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

/** Fire an Umami event. Silent when the tag is absent (other tenants, no ID, blocked). */
export function umamiTrack(event: string, data?: Record<string, string | number>) {
  try {
    (window as unknown as { umami?: Umami }).umami?.track(event, data);
  } catch {
    // analytics must never break a booking page
  }
}

/** "he" when the path has an /he segment (book.bapita.com/<slug>/he or <custom-domain>/he), else "en". */
export function pageLang(): string {
  return location.pathname.split("/").includes("he") ? "he" : "en";
}
