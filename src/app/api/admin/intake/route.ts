import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isReservedSlug } from "@/lib/reserved-slugs";
import OpenAI from "openai";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

const GROQ_MODEL  = "llama-3.3-70b-versatile";
const OLLAMA_MODEL = "llama3.2:3b";

// Fixed brand accent applied to every auto-generated business (RGB 184,134,42).
// The LLM's per-vibe accent_color suggestion is intentionally ignored.
const BRAND_ACCENT = "#B8862A";

const SYSTEM_INSTRUCTION = `You are a senior brand copywriter and data extractor for Bapita, which builds booking websites for Israeli appointment businesses (barbershops, salons, nail/beauty studios). You receive messy, partial notes about ONE business and return a single strict JSON object. Rules:
- Extract every fact present (name, services, prices, hours, phone, address, socials, reviews, rating).
- When copy is missing (tagline, about), WRITE it — specific, warm, on-brand, never generic. Never output filler like "Welcome to our shop" or "Quality service you can trust". Reference the vibe note and any real detail (location, specialty, gender focus, fancy vs neighborhood).
- Provide Hebrew AND English for name, tagline, about. If only one language is given, translate naturally (not literally).
- For services with no stated price/duration, estimate realistic Israeli-market values; never invent services that were not implied.
- Parse pasted reviews into the reviews array with author, 1–5 rating, text, and a display date string.
- If a Google review count is mentioned (e.g. "125 reviews", "200 ביקורות", "(125)"), put that number in stat_clients when no explicit client count is given. If both are present, prefer the explicit client count.
- Business hours parsing — Hebrew day abbreviations: א=Sunday, ב=Monday, ג=Tuesday, ד=Wednesday, ה=Thursday, ו=Friday, ש=Saturday. Common ranges: "א-ה"=Sunday–Thursday, "ב-ו"=Monday–Friday, "א-ש"=full week, "ו׳" or "ו"=Friday, "שבת" or "ש"=Saturday. Map all 7 days in the business_hours object; mark closed days as open:false.
- Pick template_style: "clean" (modern/minimal/women's salons), "classic" (warm/traditional barbers), "dark" (bold/masculine/edgy). Suggest accent_color as a hex that suits the vibe.
- Output ONLY a valid JSON object with these exact keys (omit optional keys if no data):
{
  "name": string,
  "name_he": string,
  "tagline": string,
  "tagline_he": string,
  "about_text": string,
  "about_text_he": string,
  "phone": string (optional),
  "address": string (optional),
  "instagram_url": string (optional),
  "facebook_url": string (optional),
  "tiktok_url": string (optional),
  "whatsapp_number": string (optional),
  "google_maps_url": string (optional),
  "google_review_link": string (optional),
  "accent_color": string (hex),
  "template_style": "clean" | "classic" | "dark",
  "stat_years": number (optional),
  "stat_clients": number (optional),
  "stat_rating": string (optional, e.g. "4.9"),
  "services": [{ "name": string, "name_he": string, "duration": number (minutes), "price": number (ILS), "description": string (optional) }],
  "business_hours": { "sunday": { "open": bool, "start": "HH:MM", "end": "HH:MM" }, "monday": ..., "tuesday": ..., "wednesday": ..., "thursday": ..., "friday": ..., "saturday": ... },
  "google_reviews": [{ "author": string, "rating": number, "text": string, "date": string }] (optional)
}`;

async function callLLM(userMessage: string): Promise<string> {
  const groqKey  = process.env.GROQ_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL;

  if (groqKey) {
    try {
      const client = new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
      const res = await client.chat.completions.create({
        model: GROQ_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user",   content: userMessage },
        ],
        temperature: 0.3,
      });
      const text = res.choices[0]?.message?.content ?? "";
      if (text) return text;
    } catch (err) {
      const is429 = String(err).includes("429") || String(err).includes("quota") || String(err).includes("rate");
      if (!is429 || !ollamaUrl) throw err;
      console.warn("[intake] Groq quota hit — falling back to Ollama");
    }
  }

  if (ollamaUrl) {
    const client = new OpenAI({ apiKey: "ollama", baseURL: `${ollamaUrl}/v1` });
    const res = await client.chat.completions.create({
      model: OLLAMA_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user",   content: userMessage },
      ],
      temperature: 0.3,
    });
    return res.choices[0]?.message?.content ?? "";
  }

  throw new Error("No LLM provider configured (GROQ_API_KEY or OLLAMA_BASE_URL required)");
}

export async function POST(req: Request) {
  const groqKey  = process.env.GROQ_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL;
  if (!groqKey && !ollamaUrl) {
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

  const userMessage = `Language preference: ${lang === "he" ? "Hebrew primary" : "English primary"}
Vibe / notes: ${vibe || "(none)"}
Raw business info:
${raw}`;

  let parsed: Record<string, unknown>;
  try {
    const text = await callLLM(userMessage);
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[intake] JSON parse failed, raw:", text);
      return NextResponse.json({ error: "LLM returned invalid JSON", detail: text.slice(0, 500) }, { status: 422 });
    }
  } catch (err) {
    console.error("[intake] LLM error:", err);
    return NextResponse.json({ error: "LLM error", detail: String(err) }, { status: 422 });
  }

  const service = createServiceClient();

  const DEFAULT_HOURS = {
    sunday:    { open: true,  start: "09:00", end: "19:00" },
    monday:    { open: true,  start: "09:00", end: "19:00" },
    tuesday:   { open: true,  start: "09:00", end: "19:00" },
    wednesday: { open: true,  start: "09:00", end: "19:00" },
    thursday:  { open: true,  start: "09:00", end: "19:00" },
    friday:    { open: true,  start: "09:00", end: "16:00" },
    saturday:  { open: false, start: "10:00", end: "14:00" },
  };

  // Merge per-day so a day the LLM omitted falls back to a default instead of
  // leaving a hole that breaks the public page.
  const parsedHours = (parsed.business_hours ?? {}) as Record<string, unknown>;
  const mergedHours = Object.fromEntries(
    Object.entries(DEFAULT_HOURS).map(([day, def]) => [day, parsedHours[day] ?? def])
  );

  const { data: biz, error: bizErr } = await service.from("businesses").insert({
    slug,
    owner_id:           user.id,
    status:             "draft",
    show_about:         true,
    show_gallery:       true,
    show_hours:         true,
    show_location:      true,
    show_stats:         true,
    show_open_status:   true,
    show_services:      true,
    show_reviews:       true,
    profile_image_url:  null,
    name:               parsed.name        || slug,
    name_he:            parsed.name_he     || "",
    tagline:            parsed.tagline     || "",
    tagline_he:         parsed.tagline_he  || "",
    about_text:         parsed.about_text  || "",
    about_text_he:      parsed.about_text_he || "",
    phone:              parsed.phone       || "",
    address:            parsed.address     || "",
    instagram_url:      parsed.instagram_url      || null,
    facebook_url:       parsed.facebook_url       || null,
    tiktok_url:         parsed.tiktok_url         || null,
    whatsapp_number:    parsed.whatsapp_number    || null,
    google_maps_url:    parsed.google_maps_url    || null,
    google_review_link: parsed.google_review_link || null,
    accent_color:       BRAND_ACCENT,
    template_style:     (parsed.template_style as string) || "classic",
    default_lang:       lang,
    dashboard_lang:     lang,
    google_reviews:     Array.isArray(parsed.google_reviews) ? parsed.google_reviews.map((r: Record<string,unknown>) => ({
      id:     crypto.randomUUID(),
      author: r.author,
      rating: r.rating,
      text:   r.text,
      date:   r.date,
    })) : null,
    business_hours: mergedHours,
    stat_years:   parsed.stat_years   || null,
    stat_clients: parsed.stat_clients || null,
    stat_rating:  parsed.stat_rating  || null,
  }).select("id").single();

  if (bizErr) {
    return NextResponse.json({ error: bizErr.message }, { status: 500 });
  }

  const services = Array.isArray(parsed.services) ? parsed.services : [];
  if (services.length > 0) {
    const rows = (services as Record<string,unknown>[]).map((s, i) => ({
      business_id:   biz.id,
      name:          s.name        || "",
      name_he:       s.name_he     || "",
      duration:      Number(s.duration) || 30,
      price:         Number(s.price)    || 0,
      description:   (s.description as string) || null,
      display_order: i,
      active:        true,
    }));
    await service.from("services").insert(rows);
  }

  return NextResponse.json({ id: biz.id });
}
