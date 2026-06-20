import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    name:               { type: SchemaType.STRING },
    name_he:            { type: SchemaType.STRING },
    tagline:            { type: SchemaType.STRING },
    tagline_he:         { type: SchemaType.STRING },
    about_text:         { type: SchemaType.STRING },
    about_text_he:      { type: SchemaType.STRING },
    phone:              { type: SchemaType.STRING },
    address:            { type: SchemaType.STRING },
    instagram_url:      { type: SchemaType.STRING },
    facebook_url:       { type: SchemaType.STRING },
    tiktok_url:         { type: SchemaType.STRING },
    whatsapp_number:    { type: SchemaType.STRING },
    google_maps_url:    { type: SchemaType.STRING },
    google_review_link: { type: SchemaType.STRING },
    accent_color:       { type: SchemaType.STRING },
    template_style:     { type: SchemaType.STRING },
    stat_years:         { type: SchemaType.NUMBER },
    stat_clients:       { type: SchemaType.NUMBER },
    stat_rating:        { type: SchemaType.STRING },
    services: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:        { type: SchemaType.STRING },
          name_he:     { type: SchemaType.STRING },
          duration:    { type: SchemaType.NUMBER },
          price:       { type: SchemaType.NUMBER },
          description: { type: SchemaType.STRING },
        },
        required: ["name", "name_he", "duration", "price"],
      },
    },
    business_hours: {
      type: SchemaType.OBJECT,
      properties: {
        sunday:    { type: SchemaType.OBJECT, properties: { open: { type: SchemaType.BOOLEAN }, start: { type: SchemaType.STRING }, end: { type: SchemaType.STRING } }, required: ["open","start","end"] },
        monday:    { type: SchemaType.OBJECT, properties: { open: { type: SchemaType.BOOLEAN }, start: { type: SchemaType.STRING }, end: { type: SchemaType.STRING } }, required: ["open","start","end"] },
        tuesday:   { type: SchemaType.OBJECT, properties: { open: { type: SchemaType.BOOLEAN }, start: { type: SchemaType.STRING }, end: { type: SchemaType.STRING } }, required: ["open","start","end"] },
        wednesday: { type: SchemaType.OBJECT, properties: { open: { type: SchemaType.BOOLEAN }, start: { type: SchemaType.STRING }, end: { type: SchemaType.STRING } }, required: ["open","start","end"] },
        thursday:  { type: SchemaType.OBJECT, properties: { open: { type: SchemaType.BOOLEAN }, start: { type: SchemaType.STRING }, end: { type: SchemaType.STRING } }, required: ["open","start","end"] },
        friday:    { type: SchemaType.OBJECT, properties: { open: { type: SchemaType.BOOLEAN }, start: { type: SchemaType.STRING }, end: { type: SchemaType.STRING } }, required: ["open","start","end"] },
        saturday:  { type: SchemaType.OBJECT, properties: { open: { type: SchemaType.BOOLEAN }, start: { type: SchemaType.STRING }, end: { type: SchemaType.STRING } }, required: ["open","start","end"] },
      },
    },
    google_reviews: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          author: { type: SchemaType.STRING },
          rating: { type: SchemaType.NUMBER },
          text:   { type: SchemaType.STRING },
          date:   { type: SchemaType.STRING },
        },
        required: ["author","rating","text","date"],
      },
    },
  },
  required: ["name","name_he","tagline","tagline_he","about_text","about_text_he","template_style","accent_color","services"],
};

const SYSTEM_INSTRUCTION = `You are a senior brand copywriter and data extractor for Bapita, which builds booking websites for Israeli appointment businesses (barbershops, salons, nail/beauty studios). You receive messy, partial notes about ONE business and return a single strict JSON object matching the provided schema. Rules:
- Extract every fact present (name, services, prices, hours, phone, address, socials, reviews, rating).
- When copy is missing (tagline, about), WRITE it — specific, warm, on-brand, never generic. Never output filler like "Welcome to our shop" or "Quality service you can trust". Reference the vibe note and any real detail (location, specialty, gender focus, fancy vs neighborhood).
- Provide Hebrew AND English for name, tagline, about. If only one language is given, translate naturally (not literally).
- For services with no stated price/duration, estimate realistic Israeli-market values; never invent services that were not implied.
- Parse pasted reviews into the reviews array with author, 1–5 rating, text, and a display date string.
- Pick template_style: "clean" (modern/minimal/women's salons), "classic" (warm/traditional barbers), "dark" (bold/masculine/edgy). Suggest accent_color as a hex that suits the vibe.
- Output ONLY the JSON object. No markdown, no commentary.`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured on this environment." }, { status: 500 });
  }

  // Auth check
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await req.json() as { slug?: string; lang?: string; raw?: string; vibe?: string };
  const { slug, lang = "he", raw = "", vibe = "" } = body;

  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (!raw.trim()) return NextResponse.json({ error: "raw paste is required" }, { status: 400 });

  // Call Gemini
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA as never,
    },
  });

  const userMessage = `Language preference: ${lang === "he" ? "Hebrew primary" : "English primary"}
Vibe / notes: ${vibe || "(none)"}
Raw business info:
${raw}`;

  let parsed: Record<string, unknown>;
  try {
    const result = await model.generateContent(userMessage);
    const text = result.response.text();
    parsed = JSON.parse(text);
  } catch (err) {
    return NextResponse.json({ error: "Gemini parse failed", detail: String(err) }, { status: 422 });
  }

  // Insert via service role
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

  const { data: biz, error: bizErr } = await service.from("businesses").insert({
    slug,
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
    accent_color:       parsed.accent_color       || "#B8862A",
    template_style:     (parsed.template_style as string) || "classic",
    default_lang:       lang,
    status:             "draft",
    show_reviews:       true,
    google_reviews:     Array.isArray(parsed.google_reviews) ? parsed.google_reviews.map((r: Record<string,unknown>) => ({
      id:     crypto.randomUUID(),
      author: r.author,
      rating: r.rating,
      text:   r.text,
      date:   r.date,
    })) : null,
    business_hours: parsed.business_hours || DEFAULT_HOURS,
    stat_years:   parsed.stat_years   || null,
    stat_clients: parsed.stat_clients || null,
    stat_rating:  parsed.stat_rating  || null,
  }).select("id").single();

  if (bizErr) {
    return NextResponse.json({ error: bizErr.message }, { status: 500 });
  }

  // Insert services
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
