# Stay pay link — host sends a private payment link

**What.** For a stay request, the host sets the agreed total in the booking drawer, gets a private
link (`book.bapita.com/pay/l/<token>`), and sends it to the guest himself (WhatsApp/copy). The guest
opens it, sees unit + dates + total, pays the full amount on Green Invoice's hosted page. On verified
payment the booking becomes `confirmed` / `deposit_paid` and the dashboard shows "Paid online".

**Why.** Rami's flow (2026-11-10): guests send requests, he prices them by hand (e.g. 11–18 Nov ₪4,700)
and sends a link privately. The public page stays request-only. No saved cards.

**Decisions.**
- New table `payment_links` (additive). Amount lives on the row, never in the URL. Token = 32 random bytes.
- One active link per booking; making a new link cancels the old one. Default expiry 48h.
- The link does NOT use `payment_status='pending_payment'` — that state is deleted after 15 min by the
  hold sweeper. The booking stays `pending` / `none` until paid.
- Settle checks the paid amount against the link amount (not the service deposit rules).
- Checkout re-checks: link active, unexpired, booking unpaid, dates not taken by a confirmed booking or
  blocked date. A paid document for the booking is looked up first so a second click cannot double-charge.

**Acceptance.** Lint + build pass. Drawer creates/cancels a link for a stay request. Link page renders
EN + HE (RTL). Expired/cancelled/paid links refuse to charge. Paid → booking confirmed, link `paid`,
transaction row, guest email. Live ₪1 test on Big Kasa passes before a real guest gets a link.
