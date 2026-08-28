import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { pingIndexNow } from "@/lib/indexnow";
import { pagePath } from "@/lib/pages";

/**
 * Best-effort crawl ping when a page is published. A failed ping must never
 * fail the publish — it only costs a slower first crawl.
 *
 * Draft businesses are skipped: their pages are not publicly reachable, so
 * submitting the URL would just earn a 404 from Bing.
 */
export async function notifyPagePublished(businessId: string, pageSlug: string): Promise<void> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("businesses")
      .select("slug, status")
      .eq("id", businessId)
      .maybeSingle();
    if (!data?.slug || data.status !== "live") return;
    await pingIndexNow([pagePath(data.slug, pageSlug)]);
  } catch {
    // never block a publish
  }
}
