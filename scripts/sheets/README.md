# Outreach sheet setup

`Code.gs` runs inside Google Apps Script, bound to the prospects spreadsheet.
It is committed here so it is versioned and reviewable, not because anything in
the Next.js app imports it.

It talks to three endpoints on `https://book.bapita.com`, each authenticated
with a bearer secret that lives in the sheet's Script Properties:

| Menu item | Endpoint | Cost | Fills |
|---|---|---|---|
| Enrich selected | `POST /api/outreach/enrich` | free (Google Places only) | `place_id` to `enriched_at` |
| Create sites for selected | `POST /api/outreach/site` | one LLM call per row | `slug` to `site_at` |
| Write openers for selected | `POST /api/outreach/message` | one LLM call per row | `channel` to `message_at` |

## Install

Assume you have never opened Apps Script before. Every step below is literal.

### 1. Create the spreadsheet

1. Go to <https://sheets.new>. A new empty spreadsheet opens.
2. Name it something like `Bapita outreach` (click `Untitled spreadsheet`, top left).
3. At the bottom of the window, double click the tab named `Sheet1` and rename
   it to exactly `Prospects`. The script looks that name up and throws
   `No tab named Prospects.` if it is spelled differently.

### 2. Put the headers in row 1

Click cell `A1`, then paste the single tab separated line from the "Header row"
section at the bottom of this file. Google splits it across A1 to Z1 by itself.

You can skip this step if you want: `Bapita` → `Set up sheet` (step 6) writes
the same headers, and also adds the `pick` checkboxes and the `status` dropdown.
Doing it by hand first just means row 1 looks right before the code is in.

### 3. Open Apps Script

In the spreadsheet menu bar: `Extensions` → `Apps Script`. A new browser tab
opens with an editor. It already contains a stub:

```javascript
function myFunction() {
}
```

### 4. Paste the code

1. Click inside the editor, select all (`Cmd A` on Mac, `Ctrl A` on Windows),
   delete it. The stub must be gone or you get a duplicate function error.
2. Open `scripts/sheets/Code.gs` from this repo, copy the whole file, paste it in.
3. Save: `Cmd S` / `Ctrl S`, or the floppy disk icon. The tab title stops
   showing an unsaved marker.

### 5. Add the secret

Still in the Apps Script tab:

1. Left sidebar → the gear icon, `Project Settings`.
2. Scroll to `Script Properties` → `Add script property`.
3. Property: `BAPITA_OUTREACH_SECRET`
4. Value: the exact string in the `OUTREACH_SECRET` environment variable on the
   Vercel project `bapita-book`, Production scope. Read it with
   `npx vercel env pull` or from the Vercel dashboard under
   Settings → Environment Variables.
5. `Save script properties`.

If you skip this, the first menu run stops with
`Set the BAPITA_OUTREACH_SECRET script property first (see README).`
If the value is wrong, every row fails with `401 unauthorized` in `last_error`.

### 6. Reload the sheet and authorize

1. Switch back to the spreadsheet tab and reload the page (`Cmd R` / `Ctrl R`).
   Wait a few seconds. A new menu named `Bapita` appears to the right of `Help`.
   The menu is created by `onOpen`, which only runs on a page load, so a reload
   is required, not optional.
2. `Bapita` → `Set up sheet`.
3. Google now asks for authorization, once, on the first run:
   - `Authorization required` → `Continue`
   - Choose your Google account
   - You see `Google hasn't verified this app`. That is expected: the app is
     your own script, not a published add-on. Click `Advanced`, then
     `Go to <project name> (unsafe)`.
   - Review the permissions and click `Allow`. It asks for two things: to see
     and edit this spreadsheet, and to connect to an external service
     (`book.bapita.com`).
4. The menu item runs and you get `Sheet ready.` Row 1 is bold and frozen,
   column A has checkboxes, and `status` has a dropdown.

## Use

1. Fill `query` (business name plus city, or a Maps link), optionally `notes`
   (a vibe note, same idea as the admin intake's vibe field), `lang` (`he` or
   `en`, blank means `he`), and `instagram` if you already know the handle.
2. Tick `pick` on the rows you want.
3. `Bapita` → `Enrich selected`. Free, Places only. Fills columns F to O.
4. Tick the ones worth building. `Bapita` → `Create sites for selected`. Costs
   an LLM call per row. Fills P to S. A row that already has a `business_id` is
   skipped, so re-running a partial batch is safe.
5. `Bapita` → `Write openers for selected`. Costs an LLM call per row. Fills
   T to X and sets `status` to `ready`.
6. Send: for `whatsapp`, click `action_link` and the message is prefilled. For
   `instagram`, copy `message_he` and open `action_link`. Then set `status` to
   `sent` yourself.

The script only ever advances `status` as far as `ready`. Everything past that
(`sent`, `replied`, `won`, `lost`) is yours to set from the dropdown.

## Header row

Paste this into `A1` as one line. It is tab separated, so Google spreads it
across A1 to Z1.

```
pick	query	notes	lang	instagram	place_id	name	phone	address	website	rating	reviews_count	hours	segment	enriched_at	slug	site_url	business_id	site_at	channel	message_he	message_en	action_link	message_at	status	last_error
```

## Notes

- The script sleeps ~2s between rows to stay under Groq's roughly 30 requests
  per minute, and stops before the Apps Script 6 minute execution limit. Run the
  same menu item again to continue: completed rows are skipped.
- One bad row never kills a batch. Failures land in `last_error` with
  `status = error`.
- `message_en` is a `=GOOGLETRANSLATE` formula for your reading only. The script
  never reads it. Machine translation is not send quality: never send it.
- Headers are read by name, so columns can be reordered without editing the
  script. Do not rename them.
- Every site this creates is forced to `status: "draft"` and
  `lead_source: "outreach"` server side. Nothing in this sheet can publish a
  tenant page.

## When something breaks

| Symptom | Cause | Fix |
|---|---|---|
| No `Bapita` menu | The sheet was not reloaded after saving the code | Reload the spreadsheet tab |
| `No tab named Prospects.` | Tab renamed or misspelled | Rename the tab to exactly `Prospects` |
| `Set the BAPITA_OUTREACH_SECRET script property first` | Step 5 skipped | Add the script property |
| Every row `401 unauthorized` | Secret does not match Vercel | Re-copy `OUTREACH_SECRET` from the Vercel Production env |
| A row `404 no Google Places match` | `query` too vague, or a short `maps.app.goo.gl` link | Use the business name plus city |
| A row `409 row already has a business_id` | Site was already built for that row | Expected, leave it |
| `status` goes to `needs_channel` | No phone from Places and no `instagram` handle | Fill `instagram` by hand, then re-run |
