"use client";

import { useState } from "react";
import {
  BellRing,
  CreditCard,
  Star,
  Search,
  MapPinned,
  CalendarSync,
  Files,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Reveal, RevealStagger, RevealItem } from "@/components/hub/reveal";
import { Band } from "@/components/hub/band";
import { TwoTone, Lede, Eyebrow } from "@/components/hub/ui/type";
import { fullStop, getDict, type Dict, type Locale } from "@/lib/marketing/i18n";
import { cn } from "@/lib/hub/cn";

/**
 * The add-ons section, carried over from the shipped page and rebuilt.
 *
 * Seven add-ons — four recurring, three once — with the same copy. The shipped page
 * rendered each as an always-open card with a bespoke illustration, ~420 lines
 * that pushed pricing two screens further down. The first v3 port went the
 * other way: a single stack of hairline accordion rows, which fixed the length
 * and left the section reading like a settings page.
 *
 * This is the middle. Each add-on is a card with its own accent and icon,
 * matching the switches in the "What we build" add-ons card directly above, so
 * a reader who just flipped WhatsApp on recognises it here. Two columns instead
 * of seven stacked rows halves the section's height. The summary is always
 * visible because that's what a skimmer needs; the detail stays one tap away
 * for the one add-on somebody actually came for.
 *
 * Same grid-rows collapse the Hub's FAQ uses, so a panel animates to whatever
 * height its content needs and never clips.
 *
 * A card's accent belongs to the card you opened, and the section ends on a
 * display band. Both are explained where they happen.
 */

type Addon = {
  /** Key into `addons.items`. Name, summary and detail live in the locale. */
  id: keyof Dict["addons"]["items"];
  accent: string;
  icon: LucideIcon;
};

const MONTHLY: Addon[] = [
  { id: "reminders", accent: "#1fa971", icon: BellRing },
  { id: "payments", accent: "#e8920a", icon: CreditCard },
  { id: "reviews", accent: "#d4a017", icon: Star },
  { id: "seo", accent: "#2d6cf0", icon: Search },
];

const ONE_TIME: Addon[] = [
  { id: "gbp", accent: "#7c5cfc", icon: MapPinned },
  { id: "calsync", accent: "#16A6B3", icon: CalendarSync },
  /* The azure freed up when the restaurants audience left. Three one-time
     cards no longer fill the two columns evenly; the odd one out spans the
     row — see the grid below. */
  { id: "pages", accent: "#4a7fb5", icon: Files },
];

function AddonCard({
  addon,
  id,
  t,
  cadence,
}: {
  addon: Addon;
  id: string;
  t: Dict["addons"];
  cadence: string;
}) {
  const copy = t.items[addon.id];
  const [open, setOpen] = useState(false);

  /**
   * A card is lit when it is OPEN. Nothing else lights it.
   *
   * This was scroll-driven until 2026-08-28: the colour walked down the section
   * as you passed it and stayed, so the section came to rest with every card
   * lit. Read back on a phone that is not a reveal, it is a grid of seven
   * identically loud cards with no focus in it — the accent was spent telling
   * you where the scroll had got to, which is the one thing the reader can
   * already see. Now it does the job an accent is for: this is the one you
   * opened.
   *
   * Desktop keeps its hover preview (the top rule and the lift), which is a
   * pointer affordance and costs a phone nothing.
   */

  return (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl border bg-chip transition-[border-color,box-shadow,transform] duration-500",
        open ? "-translate-y-0.5" : "hover:-translate-y-0.5",
      )}
      style={{
        borderColor: open ? `${addon.accent}4d` : "rgba(42,29,20,0.09)",
        boxShadow: open
          ? `0 1px 0 ${addon.accent}1f inset, 0 22px 50px -30px ${addon.accent}b3`
          : "0 1px 2px rgba(60,34,12,0.04)",
      }}
    >
      {/* Two jobs: which one you are pointing at, and which one you opened. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-[2px] origin-left transition-transform duration-700 ease-out",
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
              {copy.name}
            </span>
            <span className="rounded-pill bg-espresso/[0.06] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-espresso/40">
              {cadence}
            </span>
          </span>
          <span className="mt-1.5 block text-[0.8125rem] leading-snug text-espresso/50">
            {copy.summary}
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
            {copy.body}
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

export function Addons({ locale = "en" }: { locale?: Locale }) {
  const t = getDict(locale).addons;
  return (
    <section id="automations" className="wash-oven py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center" dot="#7c5cfc">
              {t.eyebrow}
            </Eyebrow>
            <TwoTone lead={t.lead} trail={t.trail} className="mt-2 sm:mt-3" />
            <Lede className="mx-auto mt-4">{t.lede}</Lede>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 sm:mt-14">
            <GroupRule>{t.groupMonthly}</GroupRule>
          </div>
        </Reveal>
        <RevealStagger className="mt-4 grid items-start gap-4 sm:grid-cols-2">
          {MONTHLY.map((addon, i) => (
            <RevealItem key={addon.id} className="h-full">
              <AddonCard
                addon={addon}
                id={`addon-m-${i}`}
                t={t}
                cadence={t.cadenceMonthly}
              />
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal>
          <div className="mt-10 sm:mt-12">
            <GroupRule>{t.groupOnce}</GroupRule>
          </div>
        </Reveal>
        <RevealStagger className="mt-4 grid items-start gap-4 sm:grid-cols-2">
          {ONE_TIME.map((addon, i) => (
            /* Three cards in a two-column grid leaves a hole. The last one
               spans both columns instead, so the group ends on a full-width
               row rather than on a card sitting beside a gap. */
            <RevealItem
              key={addon.id}
              className={cn(
                "h-full",
                i === ONE_TIME.length - 1 &&
                  ONE_TIME.length % 2 === 1 &&
                  "sm:col-span-2",
              )}
            >
              <AddonCard
                addon={addon}
                id={`addon-o-${i}`}
                t={t}
                cadence={t.cadenceOnce}
              />
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal>
          <p className="mt-10 text-center text-[0.875rem] text-espresso/45 sm:mt-12">
            {t.note}{" "}
            <a
              href="#connect"
              className="font-semibold text-espresso underline decoration-espresso/25 underline-offset-4 transition-colors hover:decoration-espresso/70"
            >
              {t.noteLink}
            </a>
            {fullStop(locale)}
          </p>
        </Reveal>
      </div>

      {/* The second display band on the page, and deliberately the twin of the
          first: "Work smarter" opens the process, "Go further." closes the
          add-ons. It lands under the last thing you can add, so the phrase
          reads as the sum of the list above it rather than as a slogan dropped
          between two sections. Outside the container — the band brings its own
          full-bleed strip. */}
      <div className="mt-14 sm:mt-20">
        <Band lead={t.band.lead} trail={t.band.trail} />
      </div>
    </section>
  );
}
