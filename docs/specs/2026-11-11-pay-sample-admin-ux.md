# Sample pay page + friendlier Payment links admin (2026-11-11)

**What.** `/pay/sample/<slug>`: the real pay-link view with made-up dates (today+14, 3 nights, first unit's rates), terms checkbox, Pay button disabled, no token, no form action. Admin → Payment links: requests first, newest received on top, status pill (New request / Link sent / Link expired / Confirmed, unpaid / Paid), received time; "Create a link from scratch" behind a button; Green Invoice box full only until connected, then one line at the bottom; "Preview guest pay page" button.

**Why.** Grow's re-review must see the checkbox but real links need a Green Invoice connection Rami doesn't have yet. Rami found the admin hard to scan.

**Acceptance.** Sample page renders in HE (RTL) and EN with checkbox + terms link, disabled button, no token input. Non-stay slug → "Link not found". Real `/pay/l/<token>` unchanged in behaviour (shared `PayLinkView`). Lint + build pass.
