import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

let vapidConfigured = false;

// Configure VAPID lazily, at call time rather than module load. Doing it at
// the top level crashes the build when the keys aren't present in the
// environment (e.g. Preview deployments), since Next evaluates the module
// while collecting page data.
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails("mailto:ramikan96@gmail.com", publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendPush(
  businessId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!ensureVapid()) {
    console.warn("sendPush: VAPID keys not configured, skipping push");
    return;
  }

  const supabase = createServiceClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, subscription_json")
    .eq("business_id", businessId);

  if (!subs?.length) return;

  const results = await Promise.allSettled(
    subs.map((row) =>
      webpush.sendNotification(
        row.subscription_json as webpush.PushSubscription,
        JSON.stringify(payload)
      )
    )
  );

  // Remove stale subscriptions (410 Gone = unsubscribed)
  const staleIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const code = (result.reason as { statusCode?: number })?.statusCode;
      if (code === 410) {
        staleIds.push(subs[i].id);
      } else {
        console.error(`sendPush: failed sub ${subs[i].id} status=${code}:`, result.reason);
      }
    }
  });

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }
}
