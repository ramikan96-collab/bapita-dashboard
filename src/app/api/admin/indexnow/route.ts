import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// IndexNow: notify Bing/Yandex the moment a customer page goes live, so it gets
// crawled in minutes instead of waiting for a sitemap re-read. Key is hosted at
// https://book.bapita.com/<key>.txt (public by design).
const INDEXNOW_KEY = "49c8f48f61ff43b4a2dae2a0ab416e80";
const HOST = "book.bapita.com";
const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

export async function POST(req: Request) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let slug = "";
  try {
    ({ slug } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const url = `https://${HOST}/${slug.trim()}`;
  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: [url],
      }),
    });
    // 200/202 = accepted. Non-blocking either way — never fail the publish over this.
    return NextResponse.json({ ok: res.ok, status: res.status, url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message, url }, { status: 200 });
  }
}
