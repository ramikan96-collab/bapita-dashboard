"use client";

import { useState } from "react";
import {
  Globe,
  BellRing,
  CreditCard,
  Star,
  Search,
  MapPinned,
  CalendarSync,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { Button } from "@/components/hub/ui/button";
import { TwoTone, Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { Falafel, PitaBowl } from "@/components/hub/ui/pita";
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
 */

type Addon = {
  id: string;
  label: string;
  icon: LucideIcon;
  cadence: "monthly" | "once";
  /** Resting position inside the pita, as % of the bowl box. */
  x: number;
  y: number;
};

/** The base. Always in the pita — there is no version of this without it. */
const BASE = { id: "site", label: "Booking website", icon: Globe, x: 50, y: 3 };

const ADDONS: Addon[] = [
  { id: "reminders", label: "Reminders", icon: BellRing, cadence: "monthly", x: 26, y: 11 },
  { id: "payments", label: "Payments", icon: CreditCard, cadence: "monthly", x: 74, y: 11 },
  { id: "reviews", label: "Reviews", icon: Star, cadence: "monthly", x: 36, y: 20 },
  { id: "seo", label: "SEO", icon: Search, cadence: "monthly", x: 64, y: 20 },
  { id: "gbp", label: "Google profile", icon: MapPinned, cadence: "once", x: 44, y: 29 },
  { id: "calsync", label: "Calendar sync", icon: CalendarSync, cadence: "once", x: 58, y: 29 },
];

const SETUP = 1500;
const MONTHLY = 200;
/** Flat, whichever add-on it is. The monthly four recur; the two setups are once. */
const ADDON_PRICE = 200;

const shekel = (n: number) => `₪${n.toLocaleString("en-US")}`;

export function Pricing() {
  const [picked, setPicked] = useState<string[]>([]);
  /**
   * Which add-ons have ever been in the pita. One that is off because it was
   * taken out plays the exit animation; one that is off because the page has
   * only just loaded must not, or the section opens on six falafels
   * evaporating.
   */
  const [touched, setTouched] = useState<string[]>([]);

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

  return (
    <section id="pricing" className="wash-cool py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <Eyebrow className="justify-center" dot="#e8920a">
              Pricing
            </Eyebrow>
            <TwoTone
              size="sm"
              lead="Fill your pita."
              trail="Never pay a percentage."
              className="mt-2"
            />
            <Lede className="mx-auto mt-2.5 text-[0.9375rem] leading-snug sm:text-base">
              The booking website is the pita. <Key>Every add on is ₪200</Key>, and
              no one takes a cut of a booking, ever.
            </Lede>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-7 rounded-3xl border border-espresso/[0.09] bg-paper-warm p-4 sm:mt-9 sm:p-7">
            <p className="text-center text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-espresso/35">
              Add ons · tap to drop one in
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
                    {a.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid items-center gap-6 lg:grid-cols-[0.85fr_1fr] lg:gap-10">
              {/* ── The pita ── */}
              <div
                /* The falafel rides the bowl: one token, so shrinking the bowl
                   on a phone can't leave seven oversized balls sitting in it. */
                className="relative mx-auto w-[min(220px,56vw)] [--falafel:min(42px,10.5vw)] phone-short:w-[min(160px,42vw)] phone-short:[--falafel:min(32px,8vw)] sm:w-[min(250px,52vw)] sm:[--falafel:min(46px,10.5vw)]"
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
                    label="To build, once"
                    detail={
                      onceAddons.length > 0
                        ? `${shekel(SETUP)} + ${onceAddons.length} setup${onceAddons.length > 1 ? "s" : ""}`
                        : "Built, launched, in your name"
                    }
                  />
                  <Total
                    value={monthlyTotal}
                    label="Every month"
                    detail={
                      monthlyAddons.length > 0
                        ? `${shekel(MONTHLY)} + ${monthlyAddons.length} add on${monthlyAddons.length > 1 ? "s" : ""}`
                        : "Hosting, updates, 3 edits"
                    }
                  />
                </div>

                <ul className="mt-4 flex flex-col gap-1.5 border-t border-espresso/[0.09] pt-4">
                  <LineItem
                    label="Booking website + dashboard"
                    price={`${shekel(SETUP)} · ${shekel(MONTHLY)}/mo`}
                    base
                  />
                  {chosen.map((a) => (
                    <LineItem
                      key={a.id}
                      label={a.label}
                      price={
                        a.cadence === "monthly"
                          ? `${shekel(ADDON_PRICE)}/mo`
                          : `${shekel(ADDON_PRICE)} once`
                      }
                    />
                  ))}
                  {chosen.length === 0 && (
                    <li className="text-[0.8125rem] text-espresso/40">
                      Tap an add on above to drop one in.
                    </li>
                  )}
                </ul>

                <div className="mt-5">
                  <Button
                    href="#connect"
                    size="lg"
                    className="w-full"
                    data-cta="pricing_primary"
                  >
                    Build My Website
                  </Button>
                  <p className="mt-2.5 text-center text-[0.8125rem] text-espresso/40">
                    Free call, no commitment. Bigger build?{" "}
                    <a
                      href="#connect"
                      data-cta="pricing_custom_cta"
                      className="font-semibold text-espresso/70 underline decoration-espresso/20 underline-offset-4 transition-colors hover:text-espresso"
                    >
                      We quote it
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
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
