/**
 * Assertions for the outreach engine's pure logic.
 *
 * Run: npm run verify:outreach
 *
 * This repo has no test runner (see scripts/verify-stay-logic.ts for the same
 * reasoning). The functions checked here decide what Google indexes and what
 * text reaches a real business owner under Rami's name, so they get executable
 * checks rather than trust.
 */

import { shouldNoindex } from "../src/lib/noindex";
import { extractPlaceIdFromUrl } from "../src/lib/google-places";
import { segmentFor } from "../src/lib/outreach/segment";
import { deriveSlug } from "../src/lib/outreach/slug";
import {
  capOpener, composeMessage, normalizePhone, routeChannel, stripDashes, waLink,
} from "../src/lib/outreach/message";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`);
  }
}

console.log("\nshouldNoindex");
check("a live business is indexable", shouldNoindex("studio-avi", "live"), false);
check("a draft business is not", shouldNoindex("studio-avi", "draft"), true);
check("a missing status is not", shouldNoindex("studio-avi", null), true);
check("an unknown status is not", shouldNoindex("studio-avi", "archived"), true);
check("a live demo slug is still excluded", shouldNoindex("demo", "live"), true);
check("a live demo-prefixed slug is excluded", shouldNoindex("demo-barber", "live"), true);
check("a slug merely starting with the letters demo is fine", shouldNoindex("demolition-co", "live"), false);

console.log("\nextractPlaceIdFromUrl");
check(
  "a maps url carrying place_id",
  extractPlaceIdFromUrl("https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4"),
  "ChIJN1t_tDeuEmsRUsoyG83frY4",
);
check(
  "a query-string place_id",
  extractPlaceIdFromUrl("https://maps.google.com/?cid=1&place_id=ChIJrTLr-GyuEmsRBfy61i59si0"),
  "ChIJrTLr-GyuEmsRBfy61i59si0",
);
check("a plain business name is not a url", extractPlaceIdFromUrl("Studio Avi Tel Aviv"), null);
check("a maps url without a place_id", extractPlaceIdFromUrl("https://maps.app.goo.gl/abc123"), null);

console.log("\nsegmentFor");
check("no website at all", segmentFor(""), "no_web");
check("null website", segmentFor(null), "no_web");
check("undefined website", segmentFor(undefined), "no_web");
check("instagram profile", segmentFor("https://www.instagram.com/studio.avi/"), "ig_only");
check("instagram without www", segmentFor("https://instagram.com/studio.avi"), "ig_only");
check("linktree", segmentFor("https://linktr.ee/studioavi"), "ig_only");
check("a real site", segmentFor("https://studio-avi.co.il"), "has_site");
check("a facebook page counts as a real site", segmentFor("https://facebook.com/studioavi"), "has_site");

console.log("\nderiveSlug");
check("plain english", deriveSlug("Studio Avi"), "studio-avi");
check("punctuation dropped", deriveSlug("Avi's Barber Shop!"), "avis-barber-shop");
check("collapses runs of separators", deriveSlug("Studio   Avi -- Tel  Aviv"), "studio-avi-tel-aviv");
check("trims leading and trailing separators", deriveSlug("  -Studio Avi-  "), "studio-avi");
check("hebrew only falls back", deriveSlug("מספרת אבי"), "business");
check("mixed keeps the latin part", deriveSlug("מספרת Avi"), "avi");
check("empty falls back", deriveSlug(""), "business");
check("caps a very long name", deriveSlug("a".repeat(80)).length <= 40, true);

console.log("\nstripDashes");
check("ascii hyphen", stripDashes("ראיתי אתכם בגוגל - מרשים"), "ראיתי אתכם בגוגל מרשים");
check("en dash", stripDashes("4.9 \u2013 127 ביקורות"), "4.9 127 ביקורות");
check("em dash", stripDashes("great \u2014 really"), "great really");
check("minus sign", stripDashes("a \u2212 b"), "a b");
check("non breaking hyphen", stripDashes("a\u2011b"), "a b");
check("collapses the double space a strip leaves", stripDashes("a - b"), "a b");
check("nothing to strip is untouched", stripDashes("ראיתי אתכם בגוגל"), "ראיתי אתכם בגוגל");

console.log("\nnormalizePhone");
check("international with spaces and dashes", normalizePhone("+972 54-123-4567"), "972541234567");
check("local leading zero", normalizePhone("054-123-4567"), "972541234567");
check("already normalized", normalizePhone("972541234567"), "972541234567");
check("parenthesised", normalizePhone("(054) 123 4567"), "972541234567");
check("empty", normalizePhone(""), "");
check("junk", normalizePhone("no phone"), "");

console.log("\nwaLink");
check(
  "encodes the message",
  waLink("972541234567", "היי, יום טוב."),
  "https://wa.me/972541234567?text=" + encodeURIComponent("היי, יום טוב."),
);

console.log("\ncapOpener");
check("short openers pass through", capOpener("ראיתי את הסטודיו בגוגל."), "ראיתי את הסטודיו בגוגל.");
check("a long opener is capped", capOpener("א".repeat(300)).length <= 180, true);

console.log("\nrouteChannel");
check("phone wins", routeChannel("972541234567", "studio.avi"), "whatsapp");
check("handle when no phone", routeChannel("", "studio.avi"), "instagram");
check("neither", routeChannel("", ""), null);

console.log("\ncomposeMessage");
const composed = composeMessage({
  opener: "ראיתי את הסטודיו בגוגל, 4.9 עם 127 ביקורות ועדיין בלי אתר.",
  segment: "no_web",
  siteUrl: "https://book.bapita.com/studio-avi",
});
check("opens with the fixed greeting", composed.startsWith("היי, יום טוב."), true);
check("carries the site url intact", composed.includes("https://book.bapita.com/studio-avi"), true);
check("ends with the signature", composed.trim().endsWith("רמי, Bapita"), true);
check("carries the soft CTA", composed.includes("אם זה מעניין אתכם, אשמח לדבר ולספר עוד."), true);
check(
  "no dash survives outside the url",
  /[-\u2013\u2014\u2011\u2012\u2212]/.test(composed.replace("https://book.bapita.com/studio-avi", "")),
  false,
);
check(
  "the ig_only pitch never implies they have nothing",
  composeMessage({ opener: "x", segment: "ig_only", siteUrl: "https://book.bapita.com/x" })
    .includes("אינסטגרם"),
  true,
);

console.log(failures === 0 ? "\nAll outreach checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
