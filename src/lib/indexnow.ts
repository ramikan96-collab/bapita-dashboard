import { BOOKING_HOST } from "@/lib/site-url";

// IndexNow: notify Bing/Yandex the moment a page goes live, so it gets crawled
// in minutes instead of waiting for a sitemap re-read. Key is hosted at
// https://book.bapita.com/<key>.txt (public by design).
const INDEXNOW_KEY = "49c8f48f61ff43b4a2dae2a0ab416e80";

export interface IndexNowResult {
  ok: boolean;
  status?: number;
  error?: string;
  urls: string[];
}

/**
 * Submit paths on the booking host ("shimi", "kasa/deluxe-suite"). Never throws
 * and never blocks a publish — a failed ping only costs us a faster crawl.
 */
export async function pingIndexNow(paths: string[]): Promise<IndexNowResult> {
  const urls = paths
    .map((p) => p.trim().replace(/^\/+/, ""))
    .filter(Boolean)
    .map((p) => `https://${BOOKING_HOST}/${p}`);

  if (!urls.length) return { ok: true, urls };

  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: BOOKING_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${BOOKING_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    // 200/202 = accepted.
    return { ok: res.ok, status: res.status, urls };
  } catch (e) {
    return { ok: false, error: (e as Error).message, urls };
  }
}
