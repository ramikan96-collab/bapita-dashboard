// Groq retires model IDs without notice; a decommissioned ID returns 404
// model_not_found and used to surface as a generic "LLM error" in the admin UI.
// Keep this list ordered by preference and verify against
// GET https://api.groq.com/openai/v1/models before editing.
export const GROQ_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
export const OLLAMA_MODEL = "llama3.2:3b";

export const SYSTEM_INSTRUCTION = `You are a senior brand copywriter and data extractor for Bapita, which builds booking websites for Israeli appointment businesses (barbershops, salons, nail/beauty studios). You receive messy, partial notes about ONE business and return a single strict JSON object. Rules:
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

/** The exact user message shape the admin intake has always sent. */
export function buildIntakeUserMessage(input: { lang: string; vibe: string; raw: string }): string {
  return `Language preference: ${input.lang === "he" ? "Hebrew primary" : "English primary"}
Vibe / notes: ${input.vibe || "(none)"}
Raw business info:
${input.raw}`;
}
