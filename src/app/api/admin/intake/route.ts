import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isReservedSlug } from "@/lib/reserved-slugs";
import {
  buildBusinessPayload,
  buildIntakeUserMessage,
  generateBusinessDraft,
  hasLlmProvider,
  insertBusinessWithServices,
  LlmJsonError,
} from "@/lib/intake";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

export async function POST(req: Request) {
  if (!hasLlmProvider()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 500 });
  }

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await req.json() as { slug?: string; lang?: string; raw?: string; vibe?: string };
  const { slug, lang = "he", raw = "", vibe = "" } = body;

  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (isReservedSlug(slug)) return NextResponse.json({ error: "slug is reserved" }, { status: 400 });
  if (!raw.trim()) return NextResponse.json({ error: "raw paste is required" }, { status: 400 });

  let parsed: Record<string, unknown>;
  try {
    parsed = await generateBusinessDraft(buildIntakeUserMessage({ lang, vibe, raw }));
  } catch (err) {
    if (err instanceof LlmJsonError) {
      return NextResponse.json({ error: err.message, detail: err.detail }, { status: 422 });
    }
    console.error("[intake] LLM error:", err);
    return NextResponse.json({ error: "LLM error", detail: String(err) }, { status: 422 });
  }

  const payload = buildBusinessPayload({ slug, ownerId: user.id, lang, parsed });
  const { id, error } = await insertBusinessWithServices(payload, parsed.services);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ id });
}
