import { NextResponse } from "next/server";
import { guardOutreach } from "@/lib/outreach/auth";
import { callLLM, hasLlmProvider } from "@/lib/intake";
import type { Segment } from "@/lib/outreach/segment";
import {
  buildOpenerPrompt, composeMessage, normalizePhone, routeChannel, waLink,
  type Channel,
} from "@/lib/outreach/message";

const SEGMENTS = new Set<Segment>(["no_web", "ig_only", "has_site"]);

/**
 * Writes one prospect's message. The LLM authors the opener and nothing else;
 * every other line is a fixed template chosen by segment.
 */
export async function POST(req: Request) {
  const guard = guardOutreach(req);
  if (!guard.ok) return guard.response;

  if (!hasLlmProvider()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 500 });
  }

  let body: {
    name?: string; segment?: string; channel?: string; site_url?: string;
    rating?: number | string; reviews_count?: number | string;
    notes?: string; lang?: string; phone?: string; instagram?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const siteUrl = (body.site_url ?? "").trim();
  if (!name)    return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!siteUrl) return NextResponse.json({ error: "site_url is required, build the site first" }, { status: 400 });

  const segment = SEGMENTS.has(body.segment as Segment) ? (body.segment as Segment) : "no_web";
  const lang: "he" | "en" = body.lang === "en" ? "en" : "he";

  const phone972 = normalizePhone(body.phone ?? "");
  const handle = (body.instagram ?? "").trim().replace(/^@/, "");

  // A value typed into the channel cell overrides the routing.
  const forced = body.channel === "whatsapp" || body.channel === "instagram"
    ? (body.channel as Channel)
    : null;
  const channel = forced ?? routeChannel(phone972, handle);

  if (!channel) {
    return NextResponse.json(
      { error: "no phone and no instagram handle, set one or mark the row needs_channel" },
      { status: 422 },
    );
  }
  if (channel === "whatsapp" && !phone972) {
    return NextResponse.json({ error: "channel is whatsapp but the phone did not normalise" }, { status: 422 });
  }
  if (channel === "instagram" && !handle) {
    return NextResponse.json({ error: "channel is instagram but no handle was given" }, { status: 422 });
  }

  const toNum = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  };

  const { system, user } = buildOpenerPrompt({
    name,
    segment,
    rating: toNum(body.rating),
    reviewsCount: toNum(body.reviews_count),
    notes: (body.notes ?? "").trim(),
    lang,
  });

  let opener: string;
  try {
    const text = await callLLM(user, system);
    const parsed = JSON.parse(text) as { opener?: unknown };
    opener = typeof parsed.opener === "string" ? parsed.opener : "";
  } catch (err) {
    console.error("[outreach/message] LLM error:", err);
    return NextResponse.json({ error: "LLM error", detail: String(err) }, { status: 422 });
  }

  if (!opener.trim()) {
    return NextResponse.json({ error: "LLM returned an empty opener" }, { status: 422 });
  }

  const message = composeMessage({ opener, segment, siteUrl });

  const action_link = channel === "whatsapp"
    ? waLink(phone972, message)
    : `https://instagram.com/${handle}`;

  return NextResponse.json({ message, action_link, channel });
}
