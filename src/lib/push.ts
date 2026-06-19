import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

webpush.setVapidDetails(
  "mailto:ramikan96@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPush(
  businessId: string,
  payload: { title: string; body: string; url?: string }
) {
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
    if (
      result.status === "rejected" &&
      (result.reason as { statusCode?: number })?.statusCode === 410
    ) {
      staleIds.push(subs[i].id);
    }
  });

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }
}
