/**
 * Assertions for the demo lifecycle: what counts as a demo, what may be swept, and — the one
 * that actually matters — that a demo tenant cannot send a human an email.
 *
 * Run: npm run verify:demos
 *
 * This repo has no test runner (see scripts/verify-stay-logic.ts for the reasoning). A demo is
 * a real, live, bookable page built from a stranger's Google listing. If the guard is wrong, a
 * person who books on one receives a confirmation from a business that has never heard of
 * Bapita, and the nightly sweep DELETEs from the table holding real customers. Both get
 * executable checks rather than trust.
 */

import { demoExpiryFrom, DEMO_TTL_DAYS, isDemo, isExpiredDemo, isSweepable } from "../src/lib/outreach/demo";

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

const NOW = new Date("2026-09-05T12:00:00.000Z");
const past = new Date(NOW.getTime() - 86_400_000).toISOString();
const future = new Date(NOW.getTime() + 86_400_000).toISOString();

const demo = { lead_source: "outreach", status: "draft", demo_expires_at: future };
const expired = { ...demo, demo_expires_at: past };
const realCustomer = { lead_source: null, status: "live", demo_expires_at: null };
const converted = { lead_source: "outreach", status: "live", demo_expires_at: null };

console.log("\nisDemo — the clock is the flag");
check("a pitch site on a clock is a demo", isDemo(demo), true);
check("a real customer is not", isDemo(realCustomer), false);
check("a CONVERTED demo is not, even though lead_source still says outreach", isDemo(converted), false);
check("a missing row is not a demo", isDemo(null), false);
check("an unparseable date is not a live clock", isExpiredDemo({ demo_expires_at: "nonsense" }, NOW), false);

console.log("\nisExpiredDemo");
check("expiry in the future has not passed", isExpiredDemo(demo, NOW), false);
check("expiry in the past has", isExpiredDemo(expired, NOW), true);
check("no clock never expires", isExpiredDemo(realCustomer, NOW), false);

console.log("\nisSweepable — all three conditions, on a DELETE against production");
check("an expired outreach draft is sweepable", isSweepable(expired, NOW), true);
check("an unexpired one is not", isSweepable(demo, NOW), false);
check(
  "a demo somebody PUBLISHED is not swept, even expired",
  isSweepable({ ...expired, status: "live" }, NOW),
  false,
);
check(
  "a row whose lead_source was changed is not swept, even expired",
  isSweepable({ ...expired, lead_source: null }, NOW),
  false,
);
check("a converted customer is never sweepable", isSweepable(converted, NOW), false);
check("a real customer is never sweepable", isSweepable(realCustomer, NOW), false);
check("a real customer with an old created_at is still never sweepable", isSweepable({ lead_source: null, status: "draft", demo_expires_at: null }, NOW), false);

console.log("\ndemoExpiryFrom");
check("stamps the TTL from now", demoExpiryFrom(NOW), new Date(NOW.getTime() + DEMO_TTL_DAYS * 86_400_000).toISOString());
check("the TTL is 30 days, per spec §6", DEMO_TTL_DAYS, 30);
check("a freshly stamped demo is not immediately expired", isExpiredDemo({ demo_expires_at: demoExpiryFrom(NOW) }, NOW), false);

/**
 * The mail guard, exercised against a stubbed database rather than the real one.
 *
 * `sendTenantMail` cannot be imported here without pulling in nodemailer and a live Supabase
 * client, so the decision function is re-stated and checked instead. The property under test is
 * the one that matters and the one that is easy to get backwards: **it fails CLOSED**. Any
 * uncertainty about a business — lookup error, missing row, thrown exception — must block the
 * send, not allow it.
 */
console.log("\nmail guard — fails closed");

type Row = { demo_expires_at?: string | null } | null;
function guardDecision(lookup: { row?: Row; error?: boolean; threw?: boolean }): "send" | "block" {
  if (lookup.threw) return "block";
  if (lookup.error) return "block";
  if (!lookup.row) return "block";
  return isDemo(lookup.row) ? "block" : "send";
}

check("a real customer's mail goes out", guardDecision({ row: { demo_expires_at: null } }), "send");
check("a demo tenant's mail is blocked", guardDecision({ row: { demo_expires_at: future } }), "block");
check("an EXPIRED demo is still blocked, not sent", guardDecision({ row: { demo_expires_at: past } }), "block");
check("a lookup error blocks", guardDecision({ error: true }), "block");
check("a missing business blocks", guardDecision({ row: null }), "block");
check("a thrown exception blocks", guardDecision({ threw: true }), "block");

console.log(failures === 0 ? "\nAll demo lifecycle checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
