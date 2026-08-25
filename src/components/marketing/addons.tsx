"use client";

import { useState } from "react";
import {
  BellRing,
  CreditCard,
  Star,
  Search,
  MapPinned,
  CalendarSync,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Reveal, RevealStagger, RevealItem } from "@/components/hub/reveal";
import { TwoTone, Lede, Eyebrow } from "@/components/hub/ui/type";
import { cn } from "@/lib/hub/cn";

/**
 * The add-ons section, carried over from the shipped page and rebuilt.
 *
 * Six add-ons — four recurring, two once — with the same copy. The shipped page
 * rendered each as an always-open card with a bespoke illustration, ~420 lines
 * that pushed pricing two screens further down. The first v3 port went the
 * other way: a single stack of hairline accordion rows, which fixed the length
 * and left the section reading like a settings page.
 *
 * This is the middle. Each add-on is a card with its own accent and icon,
 * matching the switches in the "What we build" add-ons card directly above, so
 * a reader who just flipped WhatsApp on recognises it here. Two columns instead
 * of six stacked rows halves the section's height. The summary is always
 * visible because that's what a skimmer needs; the detail stays one tap away
 * for the one add-on somebody actually came for.
 *
 * Same grid-rows collapse the Hub's FAQ uses, so a panel animates to whatever
 * height its content needs and never clips.
 */

type Addon = {
  name: string;
  cadence: string;
  summary: string;
  body: string;
  accent: string;
  icon: LucideIcon;
};

const MONTHLY: Addon[] = [
  {
    name: "Appointment Reminders",
    cadence: "Monthly",
    summary:
      "Automated reminders via WhatsApp, SMS, or Email to reduce no shows",
    body: "Clients get a confirmation the moment they book, and a reminder before they show up. No shows drop. You do nothing. Works around the clock, including at 11PM when you are asleep. On WhatsApp, by SMS for clients who don't use it, or by email. Booking confirmation emails are already included free in your plan; this add on sends reminders on top.",
    accent: "#1fa971",
    icon: BellRing,
  },
  {
    name: "Online Payments",
    cadence: "Monthly",
    summary: "Collect deposits or full payment at the time of booking",
    body: "Clients pay when they book, deposit or full amount, your choice. No shows drop overnight because money on the table means people show up. Payment lands in your account before they walk through the door.",
    accent: "#e8920a",
    icon: CreditCard,
  },
  {
    name: "Google Reviews",
    cadence: "Monthly",
    summary:
      "Automatic review requests sent to happy clients at the right moment",
    body: "After every visit, we ask happy clients for a Google review at exactly the right moment. Your rating climbs, you do nothing. More reviews means more people finding you when they search.",
    accent: "#d4881c",
    icon: Star,
  },
  {
    name: "SEO Optimization",
    cadence: "Monthly",
    summary:
      "We tune your page every month so people nearby find you before they find anyone else",
    body: "Every month we work on your page so search engines put you in front of the people already looking for what you do. You climb, they find you, they book. Keywords, page speed, local signals, and fresh content, all handled for you.",
    accent: "#2d6cf0",
    icon: Search,
  },
];

const ONE_TIME: Addon[] = [
  {
    name: "Google Business Setup",
    cadence: "One time",
    summary:
      "Full profile setup so you appear when someone nearby searches for what you do",
    body: "We claim and fully set up your Google Business Profile so you appear in Google Maps and local search when someone nearby searches for what you do. Done once, works forever. Verified profile, photos, hours, and description.",
    accent: "#7c5cfc",
    icon: MapPinned,
  },
  {
    name: "Google Calendar Sync",
    cadence: "One time",
    summary:
      "Busy times block automatically, new bookings show up on your Google Calendar",
    body: "We connect your Google Calendar for you, a one time concierge setup, not another monthly bill. No more double bookings. Block time on Google and it blocks on Bapita, and vice versa.",
    accent: "#16A6B3",
    icon: CalendarSync,
  },
];

function AddonCard({ addon, id }: { addon: Addon; id: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl border bg-chip transition-[border-color,box-shadow,transform] duration-300",
        open ? "-translate-y-0.5" : "hover:-translate-y-0.5",
      )}
      style={{
        borderColor: open ? `${addon.accent}4d` : "rgba(42,29,20,0.09)",
        boxShadow: open
          ? `0 1px 0 ${addon.accent}1f inset, 0 22px 50px -30px ${addon.accent}b3`
          : "0 1px 2px rgba(60,34,12,0.04)",
      }}
    >
      {/* The accent draws itself across the top on hover and stays drawn while
          the card is open. One line doing two jobs: which add-on you're on, and
          which one you've opened. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-[2px] origin-left transition-transform duration-500 ease-out",
          open ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
        style={{ background: addon.accent }}
      />

      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-start gap-3.5 p-5 text-start"
      >
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-hub-lg transition-colors duration-300"
          style={{
            background: `${addon.accent}${open ? "24" : "14"}`,
            color: addon.accent,
          }}
        >
          <addon.icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.2} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[0.9375rem] font-bold tracking-[-0.02em] text-espresso sm:text-base">
              {addon.name}
            </span>
            <span className="rounded-pill bg-espresso/[0.06] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-espresso/40">
              {addon.cadence}
            </span>
          </span>
          <span className="mt-1.5 block text-[0.8125rem] leading-snug text-espresso/50">
            {addon.summary}
          </span>
        </span>

        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-espresso/[0.06] transition-colors"
          aria-hidden="true"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-espresso/55 transition-transform duration-300",
              open && "rotate-180",
            )}
            strokeWidth={2.4}
          />
        </span>
      </button>

      <div
        id={id}
        className={cn(
          "grid transition-[grid-template-rows] duration-[400ms] ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 ps-[4.25rem] text-[0.875rem] leading-relaxed text-espresso/60">
            {addon.body}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Group heading: a label, then a hairline that runs to the end of the grid. */
function GroupRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <p className="shrink-0 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-espresso/35">
        {children}
      </p>
      <span aria-hidden="true" className="h-px flex-1 bg-espresso/[0.09]" />
    </div>
  );
}

export function Addons() {
  return (
    <section id="automations" className="wash-oven py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center" dot="#7c5cfc">
              Add ons
            </Eyebrow>
            <TwoTone
              lead="Layer in"
              trail="what you need."
              className="mt-2 sm:mt-3"
            />
            <Lede className="mx-auto mt-4">
              Everything below clicks straight into your Bapita. Pick what fits,
              we switch it on and run it for you.
            </Lede>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 sm:mt-14">
            <GroupRule>Runs every month</GroupRule>
          </div>
        </Reveal>
        <RevealStagger className="mt-4 grid items-start gap-4 sm:grid-cols-2">
          {MONTHLY.map((addon, i) => (
            <RevealItem key={addon.name} className="h-full">
              <AddonCard addon={addon} id={`addon-m-${i}`} />
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal>
          <div className="mt-10 sm:mt-12">
            <GroupRule>Done once, works forever</GroupRule>
          </div>
        </Reveal>
        <RevealStagger className="mt-4 grid items-start gap-4 sm:grid-cols-2">
          {ONE_TIME.map((addon, i) => (
            <RevealItem key={addon.name} className="h-full">
              <AddonCard addon={addon} id={`addon-o-${i}`} />
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal>
          <p className="mt-10 text-center text-[0.875rem] text-espresso/45 sm:mt-12">
            Add on pricing depends on how much you send and how often.{" "}
            <a
              href="#connect"
              className="font-semibold text-espresso underline decoration-espresso/25 underline-offset-4 transition-colors hover:decoration-espresso/70"
            >
              You get real numbers on the call
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
