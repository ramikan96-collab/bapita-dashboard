# Hebrew translation handover

The `/he` route is built, live and correct. It renders right to left with its
own canonical URL, hreflang pair, sitemap entry and Hebrew structured data. The
only thing left is the words: `src/lib/marketing/i18n/he.ts` currently holds the
English text as a placeholder.

Paste the prompt below into a session with a smaller model.

---

## The prompt

> You are translating the marketing homepage of **Bapita** from English to
> Hebrew. Bapita is an Israeli company that builds and runs booking websites for
> small businesses: hair salons and barbershops, short term rentals, clinics and
> restaurants. The customer is a busy business owner, not a technical person.
>
> **Edit exactly one file: `src/lib/marketing/i18n/he.ts`.** Do not touch any
> other file. Do not rename, add or remove a single key.
>
> For every entry, replace the English value on the right of the colon with
> Hebrew. Leave the key on the left exactly as it is.
>
> Rules:
>
> 1. **Tone: plain, warm, confident. Second person singular, masculine
>    (פנייה בגוף שני יחיד).** This is a small business owner being spoken to
>    directly, not a corporate audience. No exclamation marks. No hype words.
> 2. **Do not translate literally.** Rewrite each line so it sounds like it was
>    written in Hebrew. The English is short on purpose; keep the Hebrew short
>    too — Hebrew that runs 30% longer than the English will break the layouts,
>    which are built to fit one phone screen.
> 3. **Never change:** prices (`₪1,500`, `₪200`, `₪80`), times (`16:00`,
>    `23:14`), dates, percentages (`76%`), source names (`Think with Google`,
>    `BrightLocal`, `GetApp`, `Boulevard`, `OnCallClerk`, `Am. J. of Medicine`),
>    URLs, email addresses, the brand name Bapita, or the placeholders `{count}`
>    and `{base}`. Copy them through untouched.
> 4. **`lead` / `trail` pairs** are the two halves of one headline, printed on
>    two lines in two weights. Split the Hebrew where it reads best, not where
>    the English splits. Each half should stand as a phrase on its own.
> 5. **`ledeBefore` / `ledeKey` / `ledeAfter`** are one sentence in three pieces;
>    the `Key` piece is printed bold in the middle of it. Move words between the
>    three fields so the bold lands on the phrase that deserves emphasis in
>    Hebrew, and so the sentence reads correctly when the three are joined with
>    single spaces in that order.
> 6. **Do not add direction marks** (RLM, LRM) or any punctuation to force
>    order. The page is already `dir="rtl"`; the browser handles it.
> 7. `meta.name`, `meta.switchTo` and `meta.switchLabel` are already correct.
>    Leave them.
> 8. `meta.title` and `meta.description` are search-engine copy. Write them for
>    someone typing a Hebrew search like "אתר לקביעת תורים" — natural Hebrew,
>    under 60 characters for the title and under 155 for the description.
> 9. The name `Bapita` stays in Latin letters everywhere.
>
> When you are done, run `npx tsc --noEmit` and confirm it passes. A missing or
> renamed key is a build failure, which is exactly what should happen — fix the
> key, do not work around it.
>
> Then reply with a list of any lines you were unsure about and why.

---

## For whoever reviews the result

- `npm run build` must pass. Type errors mean a key was renamed or dropped.
- Load `/he` and check that no section runs past one phone screen where its
  English twin fits — pricing especially. If a Hebrew line is too long, shorten
  the Hebrew; do not change the layout.
- Check the two display bands (`how.band`, `addons.band`). They are set at
  display size and a long Hebrew word will be scaled down to fit, which looks
  weak. Two short words each.
- The English page must be untouched. `/` and `/he` share every component, so a
  change that shows up on both is a bug in the wrong file.

## How the machinery works

| Piece | Where |
| --- | --- |
| English copy | `src/lib/marketing/i18n/en.ts` |
| Hebrew copy | `src/lib/marketing/i18n/he.ts` |
| Locale helpers, `Dict` type | `src/lib/marketing/i18n/index.ts` |
| Shared page body | `src/components/marketing/home.tsx` |
| English route | `src/app/(marketing)/page.tsx` |
| Hebrew route | `src/app/(marketing)/he/page.tsx` |
| `lang` / `dir` on `<html>` | `src/middleware.ts` sets `x-booking-locale`, `src/app/layout.tsx` reads it |
| Head tags, hreflang, JSON-LD | `src/lib/marketing/metadata.ts` |
| Both URLs in the sitemap | `src/app/sitemap.ts` |
| Language toggle | `LangToggle` in `src/components/marketing/nav.tsx` |

Adding a new string is a two-step change: add the key to `en.ts`, then run
`node scripts/seed-he.mjs`. That copies the new key into `he.ts` with the
English text as its placeholder and keeps every value that has already been
translated.
