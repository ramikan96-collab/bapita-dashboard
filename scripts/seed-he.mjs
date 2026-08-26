/**
 * Regenerates src/lib/marketing/i18n/he.ts from en.ts, keeping every Hebrew
 * value that has already been translated and adding any new key with its
 * English text as the placeholder.
 *
 * Run it after adding a key to en.ts:  node scripts/seed-he.mjs
 *
 * It is a text transform, not a parser: en.ts is a plain object literal and
 * this copies it verbatim under the `he` name, then re-applies whatever lines
 * the existing he.ts had already translated (matched by their key path).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const EN = "src/lib/marketing/i18n/en.ts";
const HE = "src/lib/marketing/i18n/he.ts";

const HEADER = `import type { Dict } from "./index";

/**
 * Every word on bapita.com, in Hebrew.
 *
 * Any key that has not been translated yet still holds its English text, so the
 * /he route is always complete and correct — it just is not Hebrew yet.
 * Translating is a pure content job: replace the value on the right of each
 * colon, leave every key on the left alone.
 *
 * Notes for whoever translates this:
 *  - Keep {count} and {base} exactly as they are. They are replaced with a
 *    number and a price at render time.
 *  - \`lead\` / \`trail\` pairs are the two halves of one headline, printed on two
 *    lines in two weights. Split the Hebrew sentence where it reads best, not
 *    where the English splits.
 *  - \`before\` / \`key\` / \`after\` are one sentence in three pieces; \`key\` is the
 *    bolded fragment. Move WORDS between the fields so the emphasis lands on
 *    the right phrase in Hebrew.
 *  - Prices, times and the shekel sign do not change.
 *  - The page renders right to left automatically. Do not add direction marks.
 *
 * Regenerate after a key is added to en.ts:  node scripts/seed-he.mjs
 */
export const he: Dict = {`;

/** "  key: value," lines, keyed by their dotted path, from a dict source. */
function harvest(src) {
  const out = new Map();
  const stack = [];
  for (const line of src.split("\n")) {
    const trimmed = line.trim();
    const open = trimmed.match(/^([A-Za-z_$][\w$]*):\s*\{$/);
    if (open) {
      stack.push(open[1]);
      continue;
    }
    if (trimmed === "}," || trimmed === "}" || trimmed === "};") {
      stack.pop();
      continue;
    }
    const pair = trimmed.match(/^([A-Za-z_$][\w$]*):\s*(.+?),?$/);
    if (pair && !pair[2].startsWith("{")) {
      out.set([...stack, pair[1]].join("."), pair[2].replace(/,$/, ""));
    }
  }
  return out;
}

const en = readFileSync(EN, "utf8");
const body = en.split("export const en = {")[1];
let next = HEADER + body;

if (existsSync(HE)) {
  const existing = harvest(readFileSync(HE, "utf8"));
  const english = harvest(en);
  const stack = [];
  let translated = 0;
  next = next
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const open = trimmed.match(/^([A-Za-z_$][\w$]*):\s*\{$/);
      if (open) {
        stack.push(open[1]);
        return line;
      }
      if (trimmed === "}," || trimmed === "}" || trimmed === "};") {
        stack.pop();
        return line;
      }
      const pair = trimmed.match(/^([A-Za-z_$][\w$]*):\s*(.+?),?$/);
      if (!pair || pair[2].startsWith("{")) return line;
      const path = [...stack, pair[1]].join(".");
      const was = existing.get(path);
      // Keep it only if a human actually changed it away from the English.
      if (was === undefined || was === english.get(path)) return line;
      translated += 1;
      const indent = line.match(/^\s*/)[0];
      return `${indent}${pair[1]}: ${was},`;
    })
    .join("\n");
  console.log(`kept ${translated} translated value(s)`);
}

writeFileSync(HE, next);
console.log("wrote", HE);
