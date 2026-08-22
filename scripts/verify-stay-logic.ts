/**
 * Assertions for the stay date logic.
 *
 * Run: npx tsx scripts/verify-stay-logic.ts
 *
 * This repo has no test runner, and adding one was out of scope for the stay
 * work. Date-range overlap is the one piece here where a quiet off-by-one costs
 * real money — a wrong comparison either double-books a unit or burns a bookable
 * night on every turnover — so it gets executable checks rather than trust.
 */

import {
  addDaysIso, isIsoDate, nightsBetween, nightsInRange, rangesOverlap,
  unavailableNights, unavailableRanges, validateStayRequest, stayTotal,
  unitPhotos, ungroupedPhotos,
} from "../src/lib/stay";
import type { Business } from "../src/types";

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

console.log("\nnightsBetween");
check("one night", nightsBetween("2026-09-01", "2026-09-02"), 1);
check("six nights", nightsBetween("2026-09-01", "2026-09-07"), 6);
check("across a month boundary", nightsBetween("2026-08-30", "2026-09-02"), 3);
check("across a DST-style boundary", nightsBetween("2026-10-24", "2026-10-27"), 3);
check("across a leap day", nightsBetween("2028-02-28", "2028-03-01"), 2);

console.log("\naddDaysIso");
check("month rollover", addDaysIso("2026-08-31", 1), "2026-09-01");
check("year rollover", addDaysIso("2026-12-31", 1), "2027-01-01");
check("backwards", addDaysIso("2026-09-01", -1), "2026-08-31");

console.log("\nisIsoDate");
check("valid", isIsoDate("2026-09-01"), true);
check("calendar-invalid day is rejected", isIsoDate("2026-02-31"), false);
check("wrong shape is rejected", isIsoDate("01/09/2026"), false);
check("non-string is rejected", isIsoDate(20260901), false);

console.log("\nrangesOverlap (half-open: checkout day is free)");
const sep4to7 = { start: "2026-09-04", end: "2026-09-07" };
check("identical ranges overlap", rangesOverlap(sep4to7, sep4to7), true);
check("contained range overlaps", rangesOverlap({ start: "2026-09-05", end: "2026-09-06" }, sep4to7), true);
check("straddling range overlaps", rangesOverlap({ start: "2026-09-01", end: "2026-09-10" }, sep4to7), true);
check(
  "checking IN on their checkout day is allowed",
  rangesOverlap({ start: "2026-09-07", end: "2026-09-09" }, sep4to7),
  false,
);
check(
  "checking OUT on their check-in day is allowed",
  rangesOverlap({ start: "2026-09-01", end: "2026-09-04" }, sep4to7),
  false,
);
check("fully before does not overlap", rangesOverlap({ start: "2026-08-01", end: "2026-08-03" }, sep4to7), false);

console.log("\nnightsInRange");
check("three nights listed", nightsInRange(sep4to7), ["2026-09-04", "2026-09-05", "2026-09-06"]);
check("one night listed", nightsInRange({ start: "2026-09-04", end: "2026-09-05" }), ["2026-09-04"]);

console.log("\nunavailableRanges / unavailableNights");
const bookings = [
  { appointment_date: "2026-09-04", check_out: "2026-09-07", service_id: "big" },
  { appointment_date: "2026-09-10", check_out: "2026-09-12", service_id: "small" },
  { appointment_date: "2026-09-20", check_out: null, service_id: "big" }, // an appointment; must be ignored
];
check(
  "scoped to one unit",
  unavailableRanges(bookings, null, "big"),
  [{ start: "2026-09-04", end: "2026-09-07" }],
);
check(
  "blocked dates become one-night ranges",
  unavailableRanges([], ["2026-09-15"], "big"),
  [{ start: "2026-09-15", end: "2026-09-16" }],
);
check("garbage blocked dates are dropped", unavailableRanges([], ["not-a-date"], "big"), []);
check(
  "nights are flattened and sorted",
  unavailableNights(unavailableRanges(bookings, ["2026-09-15"], "big")),
  ["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-15"],
);

console.log("\nvalidateStayRequest");
const unit = { min_nights: 2, max_guests: 4 };
const today = "2026-09-01";
const busy = [{ start: "2026-09-04", end: "2026-09-07" }];

check(
  "a clean request passes",
  validateStayRequest({ start: "2026-09-10", end: "2026-09-13", guests: 2, unit, unavailable: busy, today }),
  null,
);
check(
  "below min nights",
  validateStayRequest({ start: "2026-09-10", end: "2026-09-11", guests: 2, unit, unavailable: [], today }),
  "too_short",
);
check(
  "past check-in",
  validateStayRequest({ start: "2026-08-20", end: "2026-08-25", guests: 2, unit, unavailable: [], today }),
  "past_date",
);
check(
  "checkout before check-in",
  validateStayRequest({ start: "2026-09-10", end: "2026-09-08", guests: 2, unit, unavailable: [], today }),
  "invalid_dates",
);
check(
  "same day in and out",
  validateStayRequest({ start: "2026-09-10", end: "2026-09-10", guests: 2, unit, unavailable: [], today }),
  "invalid_dates",
);
check(
  "over the guest cap",
  validateStayRequest({ start: "2026-09-10", end: "2026-09-13", guests: 9, unit, unavailable: [], today }),
  "too_many_guests",
);
check(
  "over the length cap",
  validateStayRequest({ start: "2026-09-10", end: "2027-09-10", guests: 2, unit, unavailable: [], today }),
  "too_long",
);
check(
  "overlapping a booked range",
  validateStayRequest({ start: "2026-09-05", end: "2026-09-09", guests: 2, unit, unavailable: busy, today }),
  "unavailable",
);
check(
  "spanning a booked range end to end",
  validateStayRequest({ start: "2026-09-02", end: "2026-09-12", guests: 2, unit, unavailable: busy, today }),
  "unavailable",
);
check(
  "arriving on their checkout day is fine",
  validateStayRequest({ start: "2026-09-07", end: "2026-09-09", guests: 2, unit, unavailable: busy, today }),
  null,
);
check(
  "no guest cap set means any party size",
  validateStayRequest({
    start: "2026-09-10", end: "2026-09-13", guests: 50,
    unit: { min_nights: 1, max_guests: null }, unavailable: [], today,
  }),
  null,
);

console.log("\nstayTotal");
check("nightly rate times nights", stayTotal(650, 3), 1950);
check("zero nights is zero", stayTotal(650, 0), 0);

console.log("\ngallery grouping");
const biz = {
  gallery_groups: { big: ["a.jpg", "b.jpg"], small: ["c.jpg"] },
  gallery_images: ["a.jpg", "b.jpg", "c.jpg", "d.jpg"],
} as unknown as Business;
check("unit photos keep their order", unitPhotos(biz, "big"), ["a.jpg", "b.jpg"]);
check("a unit with no group has no photos", unitPhotos(biz, "studio"), []);
check("leftovers go to the shared gallery", ungroupedPhotos(biz), ["d.jpg"]);
check(
  "no groups at all leaves the gallery untouched",
  ungroupedPhotos({ gallery_groups: null, gallery_images: ["a.jpg"] } as unknown as Business),
  ["a.jpg"],
);
check(
  "a hidden cover still reaches its unit card",
  unitPhotos({ gallery_groups: { big: ["hidden-cover.jpg"] } } as unknown as Business, "big"),
  ["hidden-cover.jpg"],
);

console.log(failures === 0 ? "\nAll stay logic checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
