"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { TwoTone, Eyebrow } from "@/components/hub/ui/type";
import { cn } from "@/lib/hub/cn";

export type FAQEntry = { q: string; a: string };

const FAQS: FAQEntry[] = [
  {
    q: "Do I need to know anything technical?",
    a: "No. There's zero setup on your side. We handle the configuration and keep it running. What you get is the simple part: a clean dashboard, one tap actions, easy scheduling and stats.",
  },
  {
    q: "How much does it cost?",
    a: "The booking website is ₪1,500 to build, then ₪200 a month. Social, Bots and Reach are ₪300 a month each, and the rate per tool drops as you add more. Fill in the calculator above to see your exact number. No commission on bookings, ever.",
  },
  {
    q: "How is this different from Calendly, Buffer, or Fresha?",
    a: "Those hand you an empty dashboard and expect you to configure it, or they take a cut of every booking and keep the client relationship. We build it around your business, keep it running, and you own your client list.",
  },
  {
    q: "How long does setup take?",
    a: "It depends on which tools you take and how much of your service menu and prices you already have written down. We give you a date on the call and stick to it. Whatever you picked arrives set up and running: nothing is left for you to configure.",
  },
  {
    q: "Can I take just one tool?",
    a: "Yes. Each tool is priced and managed on its own. Start with Book if bookings are the pain, add Social when you're ready. Taking more of the pita just earns a better rate.",
  },
  {
    q: "When do Social, Bots and Reach launch?",
    a: "Book is live today. Social launches next and is in active development; Bots (WhatsApp) and Reach (local growth) roll out after. Book a call and we'll tell you exactly where each one stands and hold your founding rate for when it ships.",
  },
  {
    q: "Will my clients notice it's automated?",
    a: "They notice they got an answer in seconds instead of three hours. The bot answers in your voice, with your prices, and hands anything unusual straight to you.",
  },
  {
    q: "Is my client data safe?",
    a: "Booking data, client details and business information are stored securely, never sold, and never shared with third parties. You can export your client list any time.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel any time, per tool, with no annual lock in unless you've chosen an annual discount. If you cancel Book, your page stays live through the end of the billing period.",
  },
];

function FAQItem({
  q,
  a,
  id,
  defaultOpen = false,
}: {
  q: string;
  a: string;
  id: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-espresso/[0.09]">
      <button
        className="flex w-full items-start justify-between gap-3 py-2 text-start sm:gap-4 sm:py-5"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="text-[0.9375rem] font-bold leading-snug text-espresso sm:text-[1.0625rem]">
          {q}
        </span>
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-espresso/[0.07]">
          {open ? (
            <Minus className="h-3.5 w-3.5 text-espresso/60" />
          ) : (
            <Plus className="h-3.5 w-3.5 text-espresso/60" />
          )}
        </span>
      </button>
      {/* grid-rows collapse: animates to any content height, never clips */}
      <div
        id={id}
        className={cn(
          "grid transition-[grid-template-rows] duration-300",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pe-8 text-[0.9375rem] leading-relaxed text-espresso/60">{a}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Items are injectable so the marketing home and the /hub suite page can share
 * one accordion with different questions; the defaults are the suite page's.
 */
export function FAQ({
  items = FAQS,
  lead = "Questions we get a lot.",
  trail = "Straight answers.",
  /** The page spine band. Each page hands this one the wash that continues
   *  from whatever section sits above it. */
  wash = "wash-flat",
}: {
  items?: FAQEntry[];
  lead?: string;
  trail?: string;
  wash?: string;
} = {}) {
  return (
    <section id="faq" className={`${wash} py-5 sm:py-32`}>
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal>
          <div className="mb-4 text-center sm:mb-12">
            <Eyebrow className="justify-center">FAQ</Eyebrow>
            <TwoTone
              size="sm"
              lead={lead}
              trail={trail}
              className="mt-2 sm:mt-4"
            />
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div>
            {items.map((faq, i) => (
              <FAQItem key={i} id={`faq-panel-${i}`} q={faq.q} a={faq.a} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-3 text-center text-[0.875rem] text-espresso/45 sm:mt-10 sm:text-[0.9375rem]">
            Something else on your mind?{" "}
            {/* min-h-11: was a 22px target. */}
            <a
              href="mailto:info.bapita@gmail.com"
              className="inline-flex min-h-11 items-center font-semibold text-espresso underline decoration-espresso/25 underline-offset-4 hover:decoration-espresso/70"
            >
              Email us
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
