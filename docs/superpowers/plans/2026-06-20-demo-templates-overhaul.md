# Demo Templates Overhaul + Auto-Intake — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor 3 booking themes to shared primitives, add responsive overlay, one-URL theme switcher, Gemini auto-intake, and eject-to-custom flow.

**Architecture:** Shared atoms in `_shared/` consumed by all themes; `BookingShell` owns preview-theme state; Gemini route creates draft row then redirects to existing edit form; eject script is a local CLI tool.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase, Gemini 2.5 Flash (REST, no SDK), tsx script runner.

**Branch:** `feat/demo-overhaul-intake`

**Spec:** `docs/superpowers/specs/2026-06-20-demo-templates-overhaul-design.md`

## Global Constraints

- No DB migration needed — `status`, `template_style`, `google_reviews`, `show_reviews` already exist
- Admin routes: mirror `src/app/api/admin/delete-business/[id]/route.ts` for auth + service-role pattern
- `ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"]`
- Co-author trailer on every commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Build must pass after every task before committing
- Theme visual parity required (no regressions)
- Do NOT implement Section E (wow-polish) — that's a separate chat

---

## Task A — Shared primitives ✅ DONE (commit f384efd)

**Files created:**
- `src/app/[slug]/_shared/icons.tsx` — IgIcon, WaIcon, FbIcon, TkIcon, StarIcon
- `src/app/[slug]/_shared/useFadeInOnEnter.ts` — lifted hook (threshold param)
- `src/app/[slug]/_shared/useCountUp.ts` — lifted from DarkPage
- `src/app/[slug]/_shared/LangToggle.tsx` — fixed top-right EN/עב pill; `variant="bordered"` = Dark style
- `src/app/[slug]/_shared/ThemeFooter.tsx` — unified footer via props (circle/square, topBorder, footerLabelStyle)

**Files modified:**
- `src/app/[slug]/themes/clean/CleanPage.tsx` — imports from _shared, local copies deleted
- `src/app/[slug]/themes/classic/ClassicPage.tsx` — imports from _shared, local copies deleted
- `src/app/[slug]/themes/dark/DarkPage.tsx` — imports from _shared, local copies deleted

**ThemeFooter prop mapping:**
- Clean: `socialShape="circle"`, `socialBg={P.surface}`, `iconColor={P.text}`, `colors={{ text:P.text, muted:P.muted, surface:P.surface, border:P.border }}`, `topBorder`
- Classic: `socialShape="circle"`, `socialBg={C.cream2}`, `iconColor={C.dark}`, `colors={{ text:C.dark, muted:"rgba(34,21,16,0.5)", surface:C.cream2, border:"transparent" }}`, `footerLabelStyle={{ color:"rgba(34,21,16,0.38)" }}`
- Dark: `socialShape="square"`, `socialBg={accent}`, `iconColor={D.bg}`, `colors={D}`, `topBorder`, `footerLabelStyle={{ fontFamily:"'Oswald',...", letterSpacing:"0.08em", textTransform:"uppercase" }}`

---

## Task D — SectionHours mutedColor fix

**Problem:** `SectionHours.tsx` hardcodes closed-day color `rgba(0,0,0,0.35)` — invisible on Dark theme (`#181818` bg).

**Files to modify:**
- `src/app/[slug]/components/SectionHours.tsx`

**Changes:**

- [ ] Add `mutedColor?: string` to Props interface
- [ ] Change closed-day span color from hardcoded `"rgba(0,0,0,0.35)"` to `mutedColor ?? "rgba(0,0,0,0.35)"`
- [ ] In CleanPage: pass `mutedColor={P.muted}` → `"#6B7280"` to SectionHours
- [ ] In ClassicPage: pass `mutedColor="rgba(34,21,16,0.45)"` to SectionHours
- [ ] In DarkPage: pass `mutedColor={D.muted}` → `"#888888"` to SectionHours

**Current SectionHours call sites:**
- CleanPage line ~329: `<SectionHours hours={...} darkColor={P.text} accentColor={accent} dayLabels={t.days} closedLabel={t.hours.closed} />`
- ClassicPage line ~299: `<SectionHours hours={...} darkColor={C.dark} accentColor={accent} dayLabels={t.days} closedLabel={t.hours.closed} />`
- DarkPage line ~444: `<SectionHours hours={...} darkColor={D.text} accentColor={accent} dayLabels={t.days} closedLabel={t.hours.closed} />`

**Acceptance:** Closed days clearly legible on all three themes, especially Dark (`#888888` on `#181818`).

- [ ] Run `npm run build`
- [ ] Commit: `fix(D): SectionHours mutedColor — closed days visible on Dark theme`

---

## Task F — Delete studio-avi

**Files to delete:**
- `src/app/[slug]/customs/studio-avi.tsx`

**Files to modify:**
- `src/app/[slug]/BookingShell.tsx`

**Changes to BookingShell.tsx:**
- Remove: `import { StudioAviPage } from "./customs/studio-avi";`
- Remove: `"studio-avi": StudioAviPage,` from CUSTOM_PAGES
- Keep: the empty `CUSTOM_PAGES` record and its comment

**Result BookingShell CUSTOM_PAGES block:**
```tsx
// ─── Add new barbers here ─────────────────────────────────────────────────
// Each entry: slug (must match businesses.slug in DB) → dedicated page component
const CUSTOM_PAGES: Record<string, PageComponent> = {
  // "rami-barber": RamiBarberPage,
};
// ──────────────────────────────────────────────────────────────────────────
```

**Acceptance:** Build passes, `studio-avi` slug falls through to template_style switch.

- [ ] Run `npm run build`
- [ ] Commit: `feat(F): delete studio-avi — stale custom page removed, registry stays`

---

## Task C — Responsive BookingOverlay

**File to modify:**
- `src/app/[slug]/booking/BookingOverlay.tsx`

**Changes:** Replace fixed bottom-sheet with responsive layout via injected `<style>` block. The `background` stays as inline style (dynamic); positioning/animation moves to CSS class.

**New style block (replace existing `@keyframes slideUpSheet` style):**
```css
@keyframes slideUpSheet {
  from { transform: translateY(100%); }
  to   { transform: translateY(0);    }
}
@keyframes popIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1);    }
}
.bk-sheet {
  position: fixed;
  inset-inline-start: 0;
  inset-inline-end: 0;
  bottom: 0;
  border-radius: 20px 20px 0 0;
  max-height: 92svh;
  animation: slideUpSheet 0.35s ease;
}
@media (min-width: 768px) {
  .bk-sheet {
    inset-inline-start: unset;
    inset-inline-end: unset;
    bottom: unset;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(440px, calc(100vw - 48px));
    max-height: 88svh;
    border-radius: 20px;
    animation: popIn 0.28s ease;
  }
}
```

**Sheet div changes:**
- Add `className="bk-sheet"` 
- Remove: `insetInlineStart:0, insetInlineEnd:0, bottom:0, borderRadius:"20px 20px 0 0", maxHeight:"92svh", animation:"slideUpSheet 0.35s ease"`
- Keep: `position:"fixed"`, `zIndex:101`, `background:bgColor`, `display:"flex"`, `flexDirection:"column"`

**Acceptance:** Mobile → bottom sheet; desktop (≥768px) → centered ~440px card. Both animate. All 4 steps + success render in both.

- [ ] Run `npm run build`
- [ ] Commit: `feat(C): BookingOverlay responsive — centered card on desktop, sheet on mobile`

---

## Task B — previewTheme state + DemoThemeSwitcher

**Files to create:**
- `src/app/[slug]/_shared/DemoThemeSwitcher.tsx`

**Files to modify:**
- `src/app/[slug]/BookingShell.tsx`

### DemoThemeSwitcher.tsx

```tsx
"use client";
interface Props {
  active: "clean" | "classic" | "dark";
  onChange: (t: "clean" | "classic" | "dark") => void;
  lang: string;
}
const THEMES = [
  { key: "clean",   label: "Clean"   },
  { key: "classic", label: "Classic" },
  { key: "dark",    label: "Dark"    },
] as const;

export function DemoThemeSwitcher({ active, onChange, lang }: Props) {
  const caption = lang === "he" ? "בחר סגנון" : "Pick a style";
  return (
    <div style={{ position:"fixed", bottom:96, left:"50%", transform:"translateX(-50%)", zIndex:90, display:"flex", flexDirection:"column", alignItems:"center", gap:6, pointerEvents:"auto" }}>
      <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)", background:"rgba(0,0,0,0.5)", borderRadius:99, padding:"2px 10px", backdropFilter:"blur(6px)", whiteSpace:"nowrap" }}>
        {caption}
      </span>
      <div style={{ display:"flex", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(12px)", borderRadius:9999, padding:3, border:"1px solid rgba(255,255,255,0.12)", gap:2 }}>
        {THEMES.map(t => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding:"6px 14px", borderRadius:9999, border:"none", cursor:"pointer",
              fontSize:12, fontWeight: active === t.key ? 700 : 500,
              background: active === t.key ? "rgba(255,255,255,0.22)" : "transparent",
              color: active === t.key ? "#fff" : "rgba(255,255,255,0.6)",
              fontFamily:"inherit", transition:"background 0.2s, color 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### BookingShell.tsx changes

Convert to `"use client"`. Add `useState`. Add `previewTheme` state. Render switcher only when `business.status === "draft"` and no custom page for this slug.

```tsx
"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import type { Business, Service } from "@/types";
import { ClassicPage } from "./themes/classic/ClassicPage";
import { CleanPage }   from "./themes/clean/CleanPage";
import { DarkPage }    from "./themes/dark/DarkPage";
import { DemoThemeSwitcher } from "./_shared/DemoThemeSwitcher";

type ThemeKey = "clean" | "classic" | "dark";
type PageComponent = ComponentType<{ business: Business; services: Service[] }>;

// ─── Add new barbers here ─────────────────────────────────────────────────
const CUSTOM_PAGES: Record<string, PageComponent> = {
  // "rami-barber": RamiBarberPage,
};
// ──────────────────────────────────────────────────────────────────────────

interface Props {
  business: Business;
  services: Service[];
}

export default function BookingShell({ business, services }: Props) {
  const initialTheme = (business.template_style as ThemeKey) ?? "classic";
  const [previewTheme, setPreviewTheme] = useState<ThemeKey>(initialTheme);

  // 1. Dedicated custom page — switcher never applies
  const CustomPage = CUSTOM_PAGES[business.slug ?? ""];
  if (CustomPage) return <CustomPage business={business} services={services} />;

  // 2. Show switcher only for draft businesses
  const showSwitcher = business.status === "draft";

  // 3. Render active theme
  let ThemePage: ComponentType<{ business: Business; services: Service[] }>;
  switch (previewTheme) {
    case "clean":   ThemePage = CleanPage;   break;
    case "dark":    ThemePage = DarkPage;    break;
    case "classic":
    default:        ThemePage = ClassicPage; break;
  }

  return (
    <>
      <ThemePage business={business} services={services} />
      {showSwitcher && (
        <DemoThemeSwitcher
          active={previewTheme}
          onChange={setPreviewTheme}
          lang={business.default_lang ?? "en"}
        />
      )}
    </>
  );
}
```

**Note:** `BookingShell` was a Server Component (no `"use client"`). Adding `useState` requires adding `"use client"`. The page.tsx that renders it passes server-fetched data as props, which is fine — the shell becomes a client component boundary.

**Acceptance:** Draft business → pill visible bottom-center, switching themes changes page live. Live business → no pill, renders saved `template_style`.

- [ ] Run `npm run build`
- [ ] Commit: `feat(B): previewTheme in BookingShell + DemoThemeSwitcher (draft-only)`

---

## Task H — Gemini auto-intake

### Sub-task H.1 — Pull GEMINI_API_KEY to .env.local

```bash
vercel env pull /tmp/vercel-env-pull.txt --environment development
grep "GEMINI_API_KEY" /tmp/vercel-env-pull.txt >> .env.local
rm /tmp/vercel-env-pull.txt
```
If key was added to Production-only: go to Vercel → Project Settings → Environment Variables → add GEMINI_API_KEY to Development environment too.

### Sub-task H.2 — Auto-create button on businesses page

**File:** `src/app/(dashboard)/admin/businesses/page.tsx`

Add `✨ Auto-create` button between `↓ CSV` and `+ Add Business` in the header button group (line ~193-206):

```tsx
<button
  onClick={() => router.push("/admin/businesses/auto")}
  style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-surface)", color: "var(--color-dark)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
>
  ✨ Auto-create
</button>
```

### Sub-task H.3 — Intake screen

**File to create:** `src/app/(dashboard)/admin/businesses/auto/page.tsx`

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AutoIntakePage() {
  const router = useRouter();
  const [slug,        setSlug]        = useState("");
  const [lang,        setLang]        = useState<"he" | "en">("he");
  const [raw,         setRaw]         = useState("");
  const [vibe,        setVibe]        = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  async function handleGenerate() {
    if (!slug.trim() || !raw.trim()) { setError("Slug and paste box are required."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/admin/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), lang, raw, vibe }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Intake failed");
      router.push(`/admin/businesses/${json.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid var(--color-cream-2)", background: "var(--color-cream)", fontSize: 14, color: "var(--color-dark)", fontFamily: "inherit", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 80px" }}>
      <button onClick={() => router.push("/admin/businesses")} style={{ marginBottom: 24, background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← Back</button>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-dark)", marginBottom: 6 }}>✨ Auto-create business</h1>
      <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 28 }}>Paste messy info — Gemini fills every tab. You review, upload photos, then save.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Slug (URL)</label>
          <input style={inp} placeholder="rami-barber" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
          {slug && <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>book.bapita.com/<strong style={{ color: "var(--color-amber)" }}>{slug}</strong></div>}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Language</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["he", "en"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ height: 34, padding: "0 16px", borderRadius: 8, border: lang === l ? "none" : "1.5px solid var(--color-cream-2)", background: lang === l ? "var(--color-amber)" : "var(--color-surface)", color: lang === l ? "#fff" : "var(--color-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {l === "he" ? "Hebrew" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Paste — IG bio, services, Google Maps text, hours, reviews</label>
          <textarea style={{ ...inp, height: 180, resize: "vertical", lineHeight: 1.5 }} placeholder={"רמי ספר · תל אביב\nתספורת גברים 60₪ · 30 דק\nפנים מלא 80₪ · 45 דק\n⭐ 4.9 (83 reviews)\n\"שירות מעולה ומחירים הוגנים\" — דניאל ל.\nשעות: א-ה 10:00-20:00 · ו 09:00-15:00"} value={raw} onChange={e => setRaw(e.target.value)} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Vibe / notes (optional)</label>
          <input style={inp} placeholder="small neighborhood barber, no socials / fancy women's salon" value={vibe} onChange={e => setVibe(e.target.value)} />
        </div>

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>{error}</div>}

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ height: 44, borderRadius: 10, border: "none", background: loading ? "var(--color-cream-2)" : "var(--color-amber)", color: loading ? "var(--color-muted)" : "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: loading ? "none" : "0 4px 14px rgba(232,146,10,0.28)", transition: "all 0.2s" }}
        >
          {loading ? "Generating…" : "Generate with Gemini"}
        </button>
      </div>
    </div>
  );
}
```

### Sub-task H.4 — Intake API route

**File to create:** `src/app/api/admin/intake/route.ts`

Auth pattern: mirror `delete-business` route exactly.

Gemini REST endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=<KEY>`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

const SYSTEM_PROMPT = `You are a senior brand copywriter and data extractor for Bapita, which builds booking websites for Israeli appointment businesses (barbershops, salons, nail/beauty studios). You receive messy, partial notes about ONE business and return a single strict JSON object matching the provided schema. Rules:
- Extract every fact present (name, services, prices, hours, phone, address, socials, reviews, rating).
- When copy is missing (tagline, about), WRITE it — specific, warm, on-brand, never generic. Never output filler like "Welcome to our shop" or "Quality service you can trust". Reference the vibe note and any real detail (location, specialty, gender focus, fancy vs neighborhood).
- Provide Hebrew AND English for name, tagline, about. If only one language is given, translate naturally (not literally).
- For services with no stated price/duration, estimate realistic Israeli-market values; never invent services that were not implied.
- Parse pasted reviews into the reviews array with author, 1–5 rating, text, and a display date string.
- Pick template_style: "clean" (modern/minimal/women's salons), "classic" (warm/traditional barbers), "dark" (bold/masculine/edgy). Suggest accent_color as a hex that suits the vibe.
- Output ONLY the JSON object. No markdown, no commentary.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    name:               { type: "string" },
    name_he:            { type: "string" },
    tagline:            { type: "string" },
    tagline_he:         { type: "string" },
    about_text:         { type: "string" },
    about_text_he:      { type: "string" },
    phone:              { type: "string" },
    address:            { type: "string" },
    instagram_url:      { type: "string" },
    facebook_url:       { type: "string" },
    tiktok_url:         { type: "string" },
    whatsapp_number:    { type: "string" },
    google_maps_url:    { type: "string" },
    google_review_link: { type: "string" },
    accent_color:       { type: "string" },
    template_style:     { type: "string", enum: ["clean", "classic", "dark"] },
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name:        { type: "string" },
          name_he:     { type: "string" },
          duration:    { type: "number" },
          price:       { type: "number" },
          description: { type: "string" },
        },
        required: ["name", "name_he", "duration", "price"],
      },
    },
    business_hours: {
      type: "object",
      properties: {
        sunday:    { type: "object", properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } }, required: ["open", "start", "end"] },
        monday:    { type: "object", properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } }, required: ["open", "start", "end"] },
        tuesday:   { type: "object", properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } }, required: ["open", "start", "end"] },
        wednesday: { type: "object", properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } }, required: ["open", "start", "end"] },
        thursday:  { type: "object", properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } }, required: ["open", "start", "end"] },
        friday:    { type: "object", properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } }, required: ["open", "start", "end"] },
        saturday:  { type: "object", properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } }, required: ["open", "start", "end"] },
      },
      required: ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"],
    },
    google_reviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          author: { type: "string" },
          rating: { type: "number" },
          text:   { type: "string" },
          date:   { type: "string" },
        },
        required: ["author", "rating", "text", "date"],
      },
    },
    stat_years:   { type: "number" },
    stat_clients: { type: "number" },
    stat_rating:  { type: "string" },
  },
  required: ["name", "name_he", "tagline", "tagline_he", "about_text", "about_text_he", "template_style", "services"],
};

export async function POST(req: Request) {
  // Auth check
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { slug, lang, raw, vibe } = await req.json() as { slug: string; lang: string; raw: string; vibe?: string };
  if (!slug || !raw) {
    return NextResponse.json({ error: "slug and raw are required" }, { status: 400 });
  }

  // Build user message
  const userMessage = `Language: ${lang}\nVibe: ${vibe || "none"}\n\nJSON schema:\n${JSON.stringify(RESPONSE_SCHEMA, null, 2)}\n\nBusiness info to extract:\n${raw}`;

  // Call Gemini
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    const txt = await geminiRes.text();
    return NextResponse.json({ error: `Gemini error: ${geminiRes.status}`, detail: txt }, { status: 502 });
  }

  const geminiJson = await geminiRes.json();
  const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    return NextResponse.json({ error: "Empty response from Gemini", raw: geminiJson }, { status: 422 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Gemini returned non-JSON", raw: rawText }, { status: 422 });
  }

  // Insert via service role
  const service = createServiceClient();
  const businessId = crypto.randomUUID();

  const { error: bizErr } = await service.from("businesses").insert({
    id:                 businessId,
    owner_id:           user.id,
    slug,
    status:             "draft",
    default_lang:       lang,
    name:               parsed.name               ?? "",
    name_he:            parsed.name_he            ?? "",
    tagline:            parsed.tagline            ?? null,
    tagline_he:         parsed.tagline_he         ?? null,
    about_text:         parsed.about_text         ?? null,
    about_text_he:      parsed.about_text_he      ?? null,
    phone:              parsed.phone              ?? null,
    address:            parsed.address            ?? null,
    instagram_url:      parsed.instagram_url      ?? null,
    facebook_url:       parsed.facebook_url       ?? null,
    tiktok_url:         parsed.tiktok_url         ?? null,
    whatsapp_number:    parsed.whatsapp_number    ?? null,
    google_maps_url:    parsed.google_maps_url    ?? null,
    google_review_link: parsed.google_review_link ?? null,
    accent_color:       parsed.accent_color       ?? null,
    template_style:     parsed.template_style     ?? "classic",
    business_hours:     parsed.business_hours     ?? null,
    google_reviews:     Array.isArray(parsed.google_reviews)
      ? (parsed.google_reviews as Array<Record<string, unknown>>).map(r => ({ ...r, id: crypto.randomUUID() }))
      : null,
    show_reviews:       true,
    stat_years:         (parsed.stat_years   != null && !isNaN(Number(parsed.stat_years)))   ? Number(parsed.stat_years)   : null,
    stat_clients:       (parsed.stat_clients != null && !isNaN(Number(parsed.stat_clients))) ? Number(parsed.stat_clients) : null,
    stat_rating:        parsed.stat_rating ?? null,
  });

  if (bizErr) {
    return NextResponse.json({ error: bizErr.message }, { status: 500 });
  }

  // Insert services
  if (Array.isArray(parsed.services) && (parsed.services as unknown[]).length > 0) {
    const serviceRows = (parsed.services as Array<Record<string, unknown>>).map((s, i) => ({
      id:            crypto.randomUUID(),
      business_id:   businessId,
      name:          s.name          ?? "",
      name_he:       s.name_he       ?? null,
      duration:      Number(s.duration) || 30,
      price:         Number(s.price)    || 0,
      description:   s.description    ?? null,
      active:        true,
      display_order: i,
    }));
    await service.from("services").insert(serviceRows);
  }

  return NextResponse.json({ id: businessId });
}
```

**Acceptance:** Paste a Google Maps blob → draft business created with Profile/Services/Hours/Reviews populated, non-generic copy, redirected to edit form.

- [ ] Run `npm run build`
- [ ] Commit: `feat(H): Gemini auto-intake — /admin/businesses/auto + /api/admin/intake`

---

## Task F.2 — Eject script + admin panel

### Sub-task F.2a — Install tsx + add npm script

```bash
npm install -D tsx
```

In `package.json` scripts, add:
```json
"eject": "tsx scripts/eject-page.ts"
```

### Sub-task F.2b — Eject script

**File to create:** `scripts/eject-page.ts`

```typescript
import fs from "fs";
import path from "path";

function slugToPascal(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("") + "Page";
}

function run() {
  const args = process.argv.slice(2);
  const slug = args[0];
  const fromIdx = args.indexOf("--from");
  const theme = fromIdx !== -1 ? args[fromIdx + 1] : null;

  if (!slug || !theme || !["clean", "classic", "dark"].includes(theme)) {
    console.error("Usage: npm run eject <slug> --from <clean|classic|dark>");
    process.exit(1);
  }

  const themeMap: Record<string, string> = { clean: "CleanPage", classic: "ClassicPage", dark: "DarkPage" };
  const themeName   = themeMap[theme];
  const componentName = slugToPascal(slug);
  const root        = path.join(process.cwd(), "src/app/[slug]");
  const srcFile     = path.join(root, "themes", theme, `${themeName}.tsx`);
  const destDir     = path.join(root, "customs");
  const destFile    = path.join(destDir, `${slug}.tsx`);
  const shellFile   = path.join(root, "BookingShell.tsx");

  if (!fs.existsSync(srcFile)) { console.error(`Theme file not found: ${srcFile}`); process.exit(1); }

  fs.mkdirSync(destDir, { recursive: true });

  // Copy + rename exported component
  let src = fs.readFileSync(srcFile, "utf8");
  src = src.replace(`export function ${themeName}(`, `export function ${componentName}(`);
  fs.writeFileSync(destFile, src, "utf8");
  console.log(`✓ Created ${path.relative(process.cwd(), destFile)}`);

  // Idempotently register in BookingShell
  let shell = fs.readFileSync(shellFile, "utf8");
  const importLine = `import { ${componentName} } from "./customs/${slug}";`;
  const mapEntry   = `  "${slug}": ${componentName},`;

  if (!shell.includes(importLine)) {
    shell = shell.replace(
      /^("use client";\n)/,
      `$1${importLine}\n`
    );
  }
  if (!shell.includes(mapEntry)) {
    shell = shell.replace(
      /const CUSTOM_PAGES: Record<string, PageComponent> = \{/,
      `const CUSTOM_PAGES: Record<string, PageComponent> = {\n${mapEntry}`
    );
  }

  fs.writeFileSync(shellFile, shell, "utf8");
  console.log(`✓ Registered "${slug}" in BookingShell.tsx`);
  console.log(`\nNext: git add -A && git commit -m "feat: custom page for ${slug}" && git push`);
}

run();
```

### Sub-task F.2c — "Eject to custom page" panel in BusinessForm

**File to modify:** `src/app/(dashboard)/admin/businesses/_components/BusinessForm.tsx`

Add in edit mode only, near the `template_style` select (around line 591). Add state `const [showEjectPanel, setShowEjectPanel] = useState(false)` near other state declarations.

The panel renders numbered steps with copy buttons + a "Copy Claude Code prompt" button:

```tsx
{mode === "edit" && form.slug && (
  <div style={{ marginTop: 16, padding: "16px 18px", background: "var(--color-cream)", border: "1.5px solid var(--color-cream-2)", borderRadius: 10 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showEjectPanel ? 14 : 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-dark)" }}>Eject to custom page</span>
      <button onClick={() => setShowEjectPanel(v => !v)} style={{ fontSize: 12, color: "var(--color-amber)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
        {showEjectPanel ? "Hide" : "Show steps"}
      </button>
    </div>
    {showEjectPanel && (
      <EjectPanel slug={form.slug} template={form.template_style} businessName={form.name} />
    )}
  </div>
)}
```

`EjectPanel` is a local component in BusinessForm.tsx:

```tsx
function EjectPanel({ slug, template, businessName }: { slug: string; template: string; businessName: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const steps = [
    { key: "cd",     label: "1. Open repo directory", cmd: `cd /Users/admin/Desktop/bapita-dashboard` },
    { key: "eject",  label: "2. Run eject script",    cmd: `npm run eject ${slug} --from ${template}` },
    { key: "push",   label: "3. Commit and push",     cmd: `git add -A && git commit -m "feat: custom page for ${slug}" && git push` },
  ];

  const claudePrompt = `Customize the booking page at \`src/app/[slug]/customs/${slug}.tsx\` for the business "${businessName}". Keep it wired to the platform: do not change the booking flow — keep importing and using \`BookingOverlay\` and the shared section components, keep RTL + EN/HE support and the lang toggle. Make the design bespoke and premium for this business. Start by reading the file and the shared primitives in \`src/app/[slug]/_shared/\`, then propose changes.`;

  const stepStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" };
  const codeStyle: React.CSSProperties = { fontFamily: "monospace", fontSize: 12, background: "var(--color-surface)", border: "1px solid var(--color-cream-2)", borderRadius: 6, padding: "6px 10px", color: "var(--color-dark)", wordBreak: "break-all" };
  const copyBtn: React.CSSProperties = { height: 26, padding: "0 10px", borderRadius: 6, border: "1.5px solid var(--color-cream-2)", background: "transparent", color: "var(--color-amber)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>
        Run these 3 steps in your terminal, then paste the prompt into Claude Code.
      </p>
      {steps.map(s => (
        <div key={s.key} style={stepStyle}>
          <span style={labelStyle}>{s.label}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <code style={codeStyle}>{s.cmd}</code>
            <button style={copyBtn} onClick={() => copy(s.cmd, s.key)}>
              {copied === s.key ? "✓" : "Copy"}
            </button>
          </div>
        </div>
      ))}
      <div style={{ borderTop: "1px solid var(--color-cream-2)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>4. Customize with Claude Code</span>
        <button style={{ ...copyBtn, height: 34, padding: "0 14px", fontSize: 12, border: "none", background: "var(--color-amber)", color: "#fff" }} onClick={() => copy(claudePrompt, "claude")}>
          {copied === "claude" ? "✓ Copied!" : "Copy Claude Code prompt"}
        </button>
      </div>
    </div>
  );
}
```

**Acceptance:** Edit-mode BusinessForm shows "Eject to custom page" section; each step has a copy button; Claude Code prompt copies correctly.

- [ ] Run `npm run build`
- [ ] Commit: `feat(F.2): eject-page script + admin panel with copy steps`

---

## Final steps

- [ ] Push branch: `git push -u origin feat/demo-overhaul-intake`
- [ ] Verify `GEMINI_API_KEY` in `.env.local`
- [ ] Smoke test: open a draft business slug, confirm theme switcher visible, switching themes works, booking overlay responsive
- [ ] Open PR: `gh pr create --title "Demo templates overhaul + Gemini auto-intake" --body "..."`

---

## Status summary

| Task | Status | Commit |
|------|--------|--------|
| A — Shared primitives | ✅ Done | f384efd |
| D — SectionHours mutedColor | ⬜ Next | — |
| F — Delete studio-avi | ⬜ | — |
| C — Responsive BookingOverlay | ⬜ | — |
| B — previewTheme + DemoThemeSwitcher | ⬜ | — |
| H — Gemini auto-intake | ⬜ | — |
| F.2 — Eject script + admin panel | ⬜ | — |
