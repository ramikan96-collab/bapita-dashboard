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
    <section className="wash-flat py-16 sm:py-24">
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

        <div className="mt-10 grid gap-5 sm:mt-14 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <figure className="flex h-full flex-col rounded-3xl border border-hairline bg-chip p-6 sm:p-8">
              <Stars className="text-lg tracking-[0.1em] text-book" label={t.stars} />
              <blockquote className="mt-4 text-[1.0625rem] font-medium leading-[1.6] text-espresso sm:text-xl sm:leading-[1.55]">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3.5 pt-7">
                <Image
                  src="/img/shimi.png"
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
                <span>
                  <span className="block text-[0.9375rem] font-bold text-espresso">
                    {t.name}
                  </span>
                  <span className="block text-[0.8125rem] text-espresso/45">
                    {t.meta}
                  </span>
                </span>
              </figcaption>
            </figure>
          </Reveal>

          <div className="flex flex-col gap-5">
            <Reveal delay={80}>
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
                  className="h-auto w-full"
                />
                <figcaption className="border-t border-hairline px-5 py-4 text-[0.8125rem] font-medium text-espresso/55">
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
