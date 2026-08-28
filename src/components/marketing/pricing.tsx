"use client";

import { useRef, useState } from "react";
import {
  Globe,
  BellRing,
  CreditCard,
  Star,
  Search,
  MapPinned,
  CalendarSync,
  Files,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { Button } from "@/components/hub/ui/button";
import { TwoTone, Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { Falafel, PitaBowl } from "@/components/hub/ui/pita";
import { usePinned, useSectionProgress } from "@/lib/marketing/motion-hooks";
import { getDict, fill, type Dict, type Locale } from "@/lib/marketing/i18n";
import { cn } from "@/lib/hub/cn";

/**
 * Pricing is the pita, filled by hand — and now it adds up.
 *
 * The Hub's version let you assemble a suite of four products. bapita.com sells
 * one thing, so the mechanic is the same and the contents are different: the
 * booking website is already in the pita and cannot be taken out, and what you
 * add on top are the add-ons. Toggle one and a falafel falls in.
 *
 * ── The numbers ──
 *
 * ₪1,500 to build, ₪200 a month, no commission. Every add-on is ₪200 — per
 * month for the four that run every month, once for the two that are a setup —
 * so the picker is a real quote builder and the two totals move as the pita
 * fills. They were deliberately blank in the first port, on the grounds that
 * add-ons are volume priced; a flat ₪200 is both simpler to explain and the
 * actual price, so the honest thing is now also the thing that reacts.
 *
 * ── One screen ──
 *
 * Chips across the top, pita on one side, the bill on the other. The previous
 * layout put the bill under the pita and two more cards under that, which ran
 * to a screen and a half before a visitor saw a total. Everything that answers
 * "can I afford this" is now in one view, and the line items are there so
 * neither figure is a number the reader has to take on trust.
 *
 * On a phone the section is held to one screen the hard way: the lede and the
 * itemised list are dropped below `sm`. Both are redundant there — the two
 * totals already carry their own detail line, and the chips show what is in.
 * The alternative was a pricing section a phone reader had to scroll through
 * to see the second figure, which is the one thing this layout exists to stop.
 *
 * ── The scroll fills it ──
 *
 * The section pins and vertical scroll drops the add-ons in one at a time, both
 * totals climbing behind them. Scroll back and it empties. It is the same
 * mechanic the sections above use, and the same handoff: a tap sets the pita
 * however you like and holds until scroll crosses the next threshold, so taking
 * over never fights the page.
 *
 * Pinned on a phone as well as a laptop — `usePinned(0)`. The unpinned
 * calculator is still what the server renders and what a reader with no JS
 * keeps; it is a fallback, not an opt-out. Reduce Motion changes the falling
 * itself rather than the layout: `falafel-drop` and `falafel-out` both have
 * calm variants in globals.css, so on that tier an add-on is set into the pita
 * rather than dropped into it.
 */

type Addon = {
  /** Key into `pricing.labels`. */
  id: keyof Dict["pricing"]["labels"];
  icon: LucideIcon;
  cadence: "monthly" | "once";
  /** Resting position inside the pita, as % of the bowl box. */
  x: number;
  y: number;
};

/** The base. Always in the pita — there is no version of this without it. */
const BASE = { id: "site", icon: Globe, x: 50, y: 3 };

const ADDONS: Addon[] = [
  { id: "reminders", icon: BellRing, cadence: "monthly", x: 26, y: 11 },
  { id: "payments", icon: CreditCard, cadence: "monthly", x: 74, y: 11 },
  { id: "reviews", icon: Star, cadence: "monthly", x: 36, y: 20 },
  { id: "seo", icon: Search, cadence: "monthly", x: 64, y: 20 },
  { id: "gbp", icon: MapPinned, cadence: "once", x: 44, y: 29 },
  { id: "calsync", icon: CalendarSync, cadence: "once", x: 58, y: 29 },
  { id: "pages", icon: Files, cadence: "once", x: 50, y: 37 },
];

/**
 * How much vertical scroll each add-on costs, and where in the scrub it lands.
 * Seven thresholds inside the first 72%, so the pita is full with a quarter of
 * the pin left to read the total before the section lets go.
 *
 * The per-add-on cost came down from 26vh when the seventh arrived: the pin is
 * as long as the whole page can afford, and 7 x 26 would have made this one
 * section three screens of scroll on a phone.
 */
const SCROLL_PER_ADDON = 22; // vh
const FILL_AT = [0.1, 0.2, 0.3, 0.4, 0.5, 0.61, 0.72];

const SETUP = 1500;
const MONTHLY = 200;
/** Flat, whichever add-on it is. The monthly four recur; the two setups are once. */
const ADDON_PRICE = 200;

const shekel = (n: number) => `₪${n.toLocaleString("en-US")}`;

export function Pricing({ locale = "en" }: { locale?: Locale }) {
  const t = getDict(locale).pricing;
  const section = useRef<HTMLElement>(null);
  /**
   * Zero, not the 1024 the other sections use: the phone gets the fill too.
   */
  const pinned = usePinned(0);
  const [picked, setPicked] = useState<string[]>([]);
  /**
   * Which add-ons have ever been in the pita. One that is off because it was
   * taken out plays the exit animation; one that is off because the page has
   * only just loaded must not, or the section opens on six falafels
   * evaporating.
   */
  const [touched, setTouched] = useState<string[]>([]);

  /**
   * The last count the scroll asked for. Guarded, because this callback runs
   * every frame and setting state sixty times a second to re-render the same
   * pita is how a scroll sequence starts dropping them.
   */
  const scrollCount = useRef(-1);

  useSectionProgress(section, pinned, (p) => {
    const n = FILL_AT.filter((at) => p >= at).length;
    if (n === scrollCount.current) return;
    scrollCount.current = n;
    const ids = ADDONS.slice(0, n).map((a) => a.id);
    setPicked(ids);
    // Anything the scroll has ever dropped in is now allowed to animate back
    // out, which is what makes scrolling upwards empty the pita properly.
    setTouched((cur) => [...new Set([...cur, ...ids])]);
  });

  const toggle = (id: string) => {
    setTouched((cur) => (cur.includes(id) ? cur : [...cur, id]));
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id],
    );
  };

  const chosen = ADDONS.filter((a) => picked.includes(a.id));
  const monthlyAddons = chosen.filter((a) => a.cadence === "monthly");
  const onceAddons = chosen.filter((a) => a.cadence === "once");

  const buildTotal = SETUP + onceAddons.length * ADDON_PRICE;
  const monthlyTotal = MONTHLY + monthlyAddons.length * ADDON_PRICE;

  const header = (
    <Reveal>
      <div className="mx-auto max-w-xl text-center">
        <Eyebrow className="justify-center" dot="#e8920a">
          {t.eyebrow}
        </Eyebrow>
        <TwoTone size="sm" lead={t.lead} trail={t.trail} className="mt-2" />
        {/* Dropped on a phone. Three lines of restatement is the
            difference between this section fitting a phone screen and not,
            and the headline above already says both halves of it. */}
        <Lede className="mx-auto mt-2.5 hidden text-[0.9375rem] leading-snug sm:block sm:text-base">
          {t.ledeBefore} <Key>{t.ledeKey}</Key>, {t.ledeAfter}
        </Lede>
      </div>
    </Reveal>
  );

  const panel = (
    <Reveal delay={80}>
      <div className="mt-5 rounded-3xl border border-espresso/[0.09] bg-paper-warm p-4 phone-short:mt-4 phone-short:p-3 sm:mt-9 sm:p-7">
        <p className="text-center text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-espresso/35">
          {t.chipsLabel}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {ADDONS.map((a) => {
            const on = picked.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3 py-2 text-[0.8125rem] font-semibold transition-colors duration-150 sm:px-4",
                  on
                    ? "border-cinnamon/40 bg-cinnamon/10 text-cinnamon"
                    : "border-espresso/15 text-espresso/55 hover:border-espresso/30 hover:text-espresso",
                )}
              >
                <a.icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                {t.labels[a.id]}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid items-center gap-6 lg:grid-cols-[0.85fr_1fr] lg:gap-10">
          {/* ── The pita ── */}
          <div
            /* The falafel rides the bowl: one token, so shrinking the bowl
               on a phone can't leave seven oversized balls sitting in it. */
            className="relative mx-auto w-[min(196px,50vw)] [--falafel:min(38px,9.5vw)] phone-short:w-[min(160px,42vw)] phone-short:[--falafel:min(32px,8vw)] sm:w-[min(250px,52vw)] sm:[--falafel:min(46px,10.5vw)]"
            style={{ aspectRatio: "760 / 560" }}
          >
            <PitaBowl className="size-full" />

            {[{ ...BASE, on: true }, ...ADDONS.map((a) => ({ ...a, on: picked.includes(a.id) }))].map(
              (item) => (
                <div
                  key={item.id}
                  aria-hidden="true"
                  className="absolute z-10"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* The inner key flips with the switch, so React swaps the
                      node and the animation on it plays from the top every
                      time: an item you drop in falls, an item you take out
                      lifts away. Two states of one position, which is why
                      they share a slot rather than cross-fading. */}
                  <div
                    key={item.on ? "in" : "out"}
                    className={
                      item.on
                        ? "falafel-drop"
                        : touched.includes(item.id)
                          ? "falafel-out"
                          : undefined
                    }
                    style={
                      !item.on && !touched.includes(item.id)
                        ? { opacity: 0 }
                        : undefined
                    }
                  >
                    <Falafel id={item.id} size="var(--falafel)" icon={item.icon} />
                  </div>
                </div>
              ),
            )}
          </div>

          {/* ── The bill ── */}
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-4">
              <Total
                value={buildTotal}
                label={t.buildTotal}
                detail={
                  onceAddons.length > 0
                    ? fill(
                        onceAddons.length > 1
                          ? t.buildDetailWithAddonsPlural
                          : t.buildDetailWithAddons,
                        { base: shekel(SETUP), count: onceAddons.length },
                      )
                    : t.buildDetail
                }
              />
              <Total
                value={monthlyTotal}
                label={t.monthlyTotal}
                detail={
                  monthlyAddons.length > 0
                    ? fill(
                        monthlyAddons.length > 1
                          ? t.monthlyDetailWithAddonsPlural
                          : t.monthlyDetailWithAddons,
                        { base: shekel(MONTHLY), count: monthlyAddons.length },
                      )
                    : t.monthlyDetail
                }
              />
            </div>

            <ul className="mt-4 hidden flex-col gap-1.5 border-t border-espresso/[0.09] pt-4 sm:flex">
              <LineItem
                label={t.lineBase}
                price={`${shekel(SETUP)} · ${shekel(MONTHLY)}${t.perMonth}`}
                base
              />
              {chosen.map((a) => (
                <LineItem
                  key={a.id}
                  label={t.labels[a.id]}
                  price={
                    a.cadence === "monthly"
                      ? `${shekel(ADDON_PRICE)}${t.perMonth}`
                      : `${shekel(ADDON_PRICE)} ${t.once}`
                  }
                />
              ))}
              {chosen.length === 0 && (
                <li className="text-[0.8125rem] text-espresso/40">{t.empty}</li>
              )}
            </ul>

            <div className="mt-5">
              <Button
                href="#connect"
                size="lg"
                className="w-full"
                data-cta="pricing_primary"
              >
                {t.cta}
              </Button>
              {/* The founding-customer lock, directly under the CTA — it is
                  the answer to "why now", and it is the one line on this page
                  that is a commitment rather than a claim. Kept to two lines
                  so it does not cost the pinned phone layout a screen. */}
              <p className="mt-3 rounded-hub-lg border border-cinnamon/20 bg-cinnamon/[0.06] px-3 py-2 text-center text-[0.75rem] leading-snug text-espresso/60 sm:text-[0.8125rem]">
                <span className="font-bold text-espresso">{t.foundingLead}</span>{" "}
                {t.foundingBody}
              </p>
              <p className="mt-2.5 text-center text-[0.8125rem] text-espresso/40">
                {t.noteBefore}{" "}
                <a
                  href="#connect"
                  data-cta="pricing_custom_cta"
                  className="font-semibold text-espresso/70 underline decoration-espresso/20 underline-offset-4 transition-colors hover:text-espresso"
                >
                  {t.noteLink}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );

  return (
    <section
      id="pricing"
      ref={section}
      className="wash-cool relative"
      style={
        pinned
          ? { height: `${100 + SCROLL_PER_ADDON * ADDONS.length}vh` }
          : undefined
      }
    >
      {pinned ? (
        /* justify-center, and the box is exactly one screen minus the nav: the
           whole point is that a visitor never scrolls to find the second
           figure. Nothing here may overflow it, which is why the lede and the
           itemised list are gone below `sm`. */
        <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden px-5 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-5xl">
            {header}
            {panel}
          </div>
        </div>
      ) : (
        <div className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            {header}
            {panel}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * One of the two figures that move. The pop is keyed on the value, so it fires
 * on a change and never on first paint — a page that opens with its numbers
 * already bouncing reads as a glitch, not as feedback.
 */
function Total({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail: string;
}) {
  return (
    <div>
      <p className="text-[1.75rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-espresso phone-short:text-[1.5rem] sm:text-[2.25rem]">
        <span key={value} className="count-pop inline-block">
          {shekel(value)}
        </span>
      </p>
      <p className="mt-1.5 text-[0.875rem] font-semibold text-espresso/70">{label}</p>
      <p className="mt-0.5 text-[0.75rem] leading-snug text-espresso/40">{detail}</p>
    </div>
  );
}

function LineItem({
  label,
  price,
  base = false,
}: {
  label: string;
  price: string;
  base?: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
      <span className={base ? "font-semibold text-espresso" : "text-espresso/60"}>
        {base ? label : `+ ${label}`}
      </span>
      <span className="shrink-0 tabular-nums text-espresso/45">{price}</span>
    </li>
  );
}
