import type { FAQEntry } from "@/components/hub/faq";

/**
 * The homepage FAQ — the six questions from the shipped book.bapita.com page,
 * copy unchanged, plus one added for the audience the relaunch brings in:
 * hosts renting out a property, for whom "appointment" is the wrong word and
 * who otherwise have no way to tell from this page that stays are supported.
 *
 * Mirrored into the FAQPage JSON-LD on the homepage; keep the two in step, and
 * keep every answer self-contained so an AI answer engine can quote one alone.
 */
export const HOME_FAQS: FAQEntry[] = [
  {
    q: "How much does it cost?",
    a: "It depends on your business: your services, your size, what you actually need. We do not do one size pricing. Tell us about your setup and we will give you a straight number on the call. No pressure, no pitch.",
  },
  {
    q: "How long until I am live?",
    a: "Fast, right after our call. If you have custom requests it can take a little longer, and we will tell you that upfront.",
  },
  {
    q: "I already run bookings on WhatsApp. Why change?",
    a: "You keep WhatsApp. We add a booking page so clients pick their own slot instead of messaging you for one. The back and forth stops. The bookings do not.",
  },
  {
    q: "Will my clients actually book online?",
    a: "They already book haircuts, tables, and doctors online. Yours will be the easy option: open at any hour, no waiting for you to reply at night.",
  },
  {
    q: "I rent out a property, not appointments. Does this work?",
    a: "Yes. A property site works on nights instead of times: a nightly rate per unit, a real availability calendar, a minimum stay, and photo galleries per unit. Guests send a booking request and you confirm it. Kasa Herzeliya runs on it today with three units.",
  },
  {
    q: "What do I actually need to do?",
    a: "One 30 minute call. Tell us your services, prices, and schedule. We build and run everything from there. No homework, no back and forth.",
  },
  {
    q: "Do I need to know anything about tech?",
    a: "Zero. That is the whole point. We build it, we maintain it. New service, new price, something to change? You message us and it is done.",
  },
];
