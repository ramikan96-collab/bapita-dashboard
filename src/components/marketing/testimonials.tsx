import Image from "next/image";
import { Reveal } from "@/components/hub/reveal";
import { TwoTone, Eyebrow } from "@/components/hub/ui/type";
import { getDict, type Locale } from "@/lib/marketing/i18n";

/**
 * "Real businesses. Real results." — carried over whole from the shipped page.
 *
 * One client, quoted by name and photographed, plus the two artefacts that back
 * the claim: a 4.8 across 474 Google reviews, and Shimi coming back first when
 * ChatGPT is asked for the best hair salon in Herzliya. With one client, a logo
 * wall or a "trusted by 200+" would be a lie the audience can smell — so the
 * section stays exactly this size and grows only when the client list does.
 *
 * Images were already in /public/img from the old page; next/image is new here
 * (the old page used bare <img> inside a scoped-CSS block), so the ChatGPT
 * screenshot is now responsive and lazy rather than a 795px fixed asset.
 *
 * ── One screen on a phone ──
 *
 * Three surfaces stacked at desktop sizes ran to about two and a half screens,
 * which for a section whose whole job is "one real client, and here is the
 * proof" is longer than the claim. Nothing is dropped — a phone reader gets the
 * same quote, the same rating and the same screenshot — but the rating stops
 * being a card of its own and moves into the quote's own footer beside the
 * photo, and the screenshot is capped in svh so it scales with the device
 * rather than with its own aspect ratio.
 */

function Stars({ className, label }: { className?: string; label: string }) {
  return (
    <span className={className} aria-label={label}>
      <span aria-hidden="true">★★★★★</span>
    </span>
  );
}

export function Testimonials({ locale = "en" }: { locale?: Locale }) {
  const t = getDict(locale).testimonials;
  return (
    <section className="wash-flat py-10 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center" dot="#2bc487">
              {t.eyebrow}
            </Eyebrow>
            <TwoTone
              lead={t.lead}
              trail={t.trail}
              className="mt-2 sm:mt-3"
            />
          </div>
        </Reveal>

        {/* `minmax(0,1fr)`, not the implicit `minmax(auto,1fr)`.
            A grid track's `auto` minimum is its item's MIN-CONTENT width, so a
            single child that cannot compress sets the floor for the whole
            column — and the column then overruns its own container instead of
            the child wrapping. That is exactly what happened here: the rating
            block added to the caption below made the track resolve to 354px
            inside a 320px container, and the page picked up 14px of horizontal
            scroll at 360px. Naming the floor 0 is what lets the children
            shrink. */}
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:mt-14 sm:gap-5 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <figure className="flex h-full flex-col rounded-3xl border border-hairline bg-chip p-5 sm:p-8">
              <Stars className="text-lg tracking-[0.1em] text-book" label={t.stars} />
              <blockquote className="mt-3 text-[0.9375rem] font-medium leading-[1.55] text-espresso sm:mt-4 sm:text-xl">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-4 sm:gap-3.5 sm:pt-7">
                <Image
                  src="/img/shimi.png"
                  alt=""
                  width={56}
                  height={56}
                  className="h-11 w-11 shrink-0 rounded-full object-cover sm:h-14 sm:w-14"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[0.875rem] font-bold text-espresso sm:text-[0.9375rem]">
                    {t.name}
                  </span>
                  <span className="block truncate text-[0.75rem] text-espresso/45 sm:text-[0.8125rem]">
                    {t.meta}
                  </span>
                </span>
                {/* The rating, on a phone only. It is its own card from `sm`
                    up; down here it rides the footer it belongs to, which is
                    the cheapest screen-height there is to buy. */}
                <span className="ms-auto flex shrink-0 items-center gap-1.5 sm:hidden">
                  <span className="text-2xl font-extrabold leading-none tracking-[-0.04em] text-espresso">
                    {t.rating}
                  </span>
                  {/* Capped so it wraps to two short lines instead of holding
                      the caption row open at its full single-line width — the
                      row it shares with the name is only ~280px on a phone. */}
                  <span className="max-w-[5.5rem] text-[0.6875rem] leading-tight text-espresso/45">
                    {t.reviews}
                  </span>
                </span>
              </figcaption>
            </figure>
          </Reveal>

          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            {/* Hidden on the wrapper, not just the card: an empty Reveal is
                still a flex child, and the column's gap would keep its space. */}
            <Reveal delay={80} className="hidden sm:block">
              <div className="flex items-center gap-5 rounded-3xl border border-hairline bg-chip p-6 sm:p-7">
                <span className="text-4xl font-extrabold tracking-[-0.04em] text-espresso sm:text-5xl">
                  {t.rating}
                </span>
                <span>
                  <Stars
                    className="block text-sm tracking-[0.1em] text-book"
                    label={t.stars}
                  />
                  <span className="mt-1 block text-[0.8125rem] text-espresso/50">
                    {t.reviews}
                  </span>
                </span>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <figure className="overflow-hidden rounded-3xl border border-hairline bg-chip">
                <Image
                  src="/img/shimi-chatgpt.png"
                  alt={t.chatgptAlt}
                  width={795}
                  height={542}
                  sizes="(max-width: 1024px) 100vw, 560px"
                  /* Capped in svh, not px: the point is that it takes a fixed
                     share of the reader's screen, so the section still lands
                     in one on a 667px phone and does not look starved on a
                     tall one. `object-top` keeps the answer visible — the
                     bottom of the screenshot is the part nobody reads. */
                  className="h-auto max-h-[26svh] w-full object-cover object-top sm:max-h-none sm:object-contain"
                />
                <figcaption className="border-t border-hairline px-4 py-2.5 text-[0.75rem] font-medium text-espresso/55 sm:px-5 sm:py-4 sm:text-[0.8125rem]">
                  {t.chatgptCaption}
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
