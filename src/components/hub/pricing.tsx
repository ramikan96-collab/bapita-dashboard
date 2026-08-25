"use client";

import { useState } from "react";
import { Reveal } from "@/components/hub/reveal";
import { Button } from "@/components/hub/ui/button";
import { TwoTone, Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { Falafel, PitaBowl } from "@/components/hub/ui/pita";
import { PRODUCT_ICONS } from "@/lib/hub/icon-map";
import type { ProductId } from "@/lib/hub/products";

/**
 * Pricing is the pita, filled by hand.
 *
 * The old section showed two invented tiers and no arithmetic. This one lets
 * the reader assemble their own bill: toggle a tool, a falafel drops into the
 * pita, and the per-tool rate drops with it. The metaphor from the hero pays
 * off here as the pricing mechanic itself: the fuller the pita, the cheaper
 * each tool.
 *
 * Prices are real (Rami, July 2026): Book is ₪1,500 setup + ₪200/mo, the other
 * three are ₪300/mo each. The bundle ladder below is the only invented part;
 * change BUNDLE_DISCOUNT if the real discount differs.
 */

type Tool = {
  id: ProductId;
  label: string;
  monthly: number;
  /** One-time build fee, charged once regardless of what else is picked. */
  setup?: number;
  /** Resting position inside the pita, as % of the bowl box. */
  x: number;
  y: number;
};

// Same order as the tab row and the footer: each main followed by its add-on.
const TOOLS: Tool[] = [
  { id: "book", label: "Book", monthly: 200, setup: 1500, x: 33, y: 9 },
  { id: "bots", label: "Bots", monthly: 300, x: 68, y: 10 },
  { id: "social", label: "Social", monthly: 300, x: 52, y: 2 },
  { id: "reach", label: "Reach", monthly: 300, x: 45, y: 16 },
];

/** Per-tool discount by how many tools are in the pita. */
const BUNDLE_DISCOUNT: Record<number, number> = { 0: 0, 1: 0, 2: 0.05, 3: 0.1, 4: 0.15 };

const shekel = (n: number) => `₪${n.toLocaleString("en-US")}`;

export function Pricing() {
  const [picked, setPicked] = useState<ProductId[]>(["book"]);

  const toggle = (id: ProductId) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id],
    );

  const chosen = TOOLS.filter((t) => picked.includes(t.id));
  const count = chosen.length;
  const list = shekel(chosen.reduce((sum, t) => sum + t.monthly, 0));
  const discount = BUNDLE_DISCOUNT[count] ?? 0;
  const listTotal = chosen.reduce((sum, t) => sum + t.monthly, 0);
  const total = Math.round(listTotal * (1 - discount));
  const saving = listTotal - total;
  const perTool = count ? Math.round(total / count) : 0;
  const setup = chosen.reduce((sum, t) => sum + (t.setup ?? 0), 0);

  return (
    <section id="pricing" className="wash-clay py-5 phone-short:py-4 sm:py-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <Eyebrow className="justify-center">Pricing</Eyebrow>
            <TwoTone
              lead="Fill more of your pita."
              trail="Pay less per tool."
              className="mt-2 sm:mt-3"
            />
            <Lede className="mx-auto mt-2 text-[0.875rem] leading-snug phone-short:text-[0.8125rem] sm:mt-4 sm:text-base sm:leading-relaxed">
              Pick what you need. <Key>The rate per tool drops as the pita
              fills.</Key>
            </Lede>
          </div>
        </Reveal>

        {/* ── The calculator ──
            Held to one phone screen. The four pills used to wrap to two rows,
            the bowl was 230px, and the "Book a free call" button ended up below
            the fold on a 15/16 — the one thing in the section that had to be
            reachable. */}
        <Reveal delay={80}>
          <div className="mt-4 rounded-3xl border border-espresso/[0.09] bg-paper-warm p-4 text-center sm:mt-8 sm:p-7">
            {/* Four pills, one row, down to 360px wide. At px-3/gap-1.5 they
                measured 333px against a 321px column and Reach dropped to a
                second row on its own, which read as an afterthought rather
                than as the fourth of four. */}
            <div className="flex flex-wrap justify-center gap-1 sm:gap-2.5">
              {TOOLS.map((t) => {
                const on = picked.includes(t.id);
                const Icon = PRODUCT_ICONS[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(t.id)}
                    className={`inline-flex min-h-11 items-center gap-1 rounded-pill border px-2 py-2 text-[0.8125rem] font-semibold transition-colors duration-150 sm:gap-2 sm:px-4 ${
                      on
                        ? "border-cinnamon/40 bg-cinnamon/10 text-cinnamon"
                        : "border-espresso/15 text-espresso/55 hover:border-espresso/30 hover:text-espresso"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* The pita, open side up. Falafels fade into the pocket as tools
                are picked; nothing moves position, so toggling reads as
                filling rather than re-laying-out. */}
            <div
              /* The falafel rides the bowl: one token, so shrinking the bowl on
                 a phone can't leave four oversized balls sitting in it. */
              className="relative mx-auto mt-3 w-[min(212px,54vw)] [--falafel:min(48px,12vw)] phone-short:mt-2 phone-short:w-[min(150px,40vw)] phone-short:[--falafel:min(34px,9vw)] sm:mt-6 sm:w-[min(230px,56vw)] sm:[--falafel:min(52px,12vw)]"
              style={{ aspectRatio: "760 / 560" }}
            >
              <PitaBowl className="size-full" />
              {TOOLS.map((t) => {
                const on = picked.includes(t.id);
                return (
                  <div
                    key={t.id}
                    aria-hidden="true"
                    className="absolute z-10 transition-all duration-500 ease-out"
                    style={{
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      transform: `translate(-50%, -50%) scale(${on ? 1 : 0.5})`,
                      opacity: on ? 1 : 0,
                    }}
                  >
                    <Falafel
                      id={t.id}
                      size="var(--falafel)"
                      icon={PRODUCT_ICONS[t.id]}
                    />
                  </div>
                );
              })}
            </div>

            {/* ── The bill ── */}
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-espresso/[0.09] pt-3 sm:mt-6 sm:gap-4 sm:pt-5">
              <div>
                <p className="text-[1.625rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-espresso phone-short:text-[1.25rem] sm:text-[1.75rem]">
                  {count ? shekel(total) : shekel(0)}
                </p>
                <p className="mt-1.5 text-[0.8125rem] text-espresso/45 sm:mt-2">
                  Per month
                </p>
              </div>
              <div>
                <p className="text-[1.625rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-espresso phone-short:text-[1.25rem] sm:text-[1.75rem]">
                  {count ? shekel(perTool) : shekel(0)}
                </p>
                <p className="mt-1.5 text-[0.8125rem] text-espresso/45 sm:mt-2">
                  Per tool
                </p>
              </div>
              <div>
                <p className="text-[1.625rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-espresso phone-short:text-[1.25rem] sm:text-[1.75rem]">
                  {count} of 4
                </p>
                <p className="mt-1.5 text-[0.8125rem] text-espresso/45 sm:mt-2">
                  Tools picked
                </p>
              </div>
            </div>

            <p className="mt-3 min-h-[1.25rem] text-[0.8125rem] leading-snug text-espresso/55 sm:mt-5">
              {count === 0 ? (
                "Pick a tool to see the price."
              ) : (
                <>
                  {setup > 0 && (
                    <>
                      <span className="font-semibold text-espresso">
                        {shekel(setup)} one-time setup
                      </span>{" "}
                      for the booking website
                      {saving > 0 ? " · " : ""}
                    </>
                  )}
                  {saving > 0 && (
                    <>
                      bundle saves you{" "}
                      <span className="font-semibold text-espresso">
                        {shekel(saving)} a month
                      </span>{" "}
                      off {list}
                    </>
                  )}
                </>
              )}
            </p>

            <div className="mt-4 sm:mt-5">
              <Button href="#connect">
                Book a free call
              </Button>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
