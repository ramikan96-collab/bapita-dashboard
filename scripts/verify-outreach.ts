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

console.log(failures === 0 ? "\nAll outreach checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
