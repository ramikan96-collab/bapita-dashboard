import { Reveal } from "@/components/hub/reveal";
import { Button } from "@/components/hub/ui/button";
import { TwoTone, Lede, Key, Eyebrow } from "@/components/hub/ui/type";

/**
 * Founder-led trust block. The portrait is a designed monogram placeholder —
 * swap in <Image src="/rami.jpg" ... /> when there's a real photo.
 */
export function Founder() {
  return (
    <section id="founder" className="wash-cool py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="grid items-center gap-12 sm:gap-16 lg:grid-cols-[280px_1fr]">
          <Reveal>
            <div className="mx-auto w-full max-w-[280px]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-espresso/10 shadow-[0_28px_70px_-30px_rgba(60,34,12,0.5)]">
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(160deg, #F3D8BC 0%, #c8893f 100%)" }}
                  aria-hidden="true"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-clay/85 text-5xl font-extrabold text-espresso shadow-hub-md backdrop-blur-sm">
                    R
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-espresso/85 px-5 py-3.5 backdrop-blur-sm">
                  <span className="text-sm font-bold text-clay">Rami</span>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-clay/70">
                    Founder
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="max-w-xl">
              <Eyebrow>Who you&apos;re working with</Eyebrow>
              <TwoTone
                size="sm"
                lead="You talk to me."
                trail="Not a support queue."
                className="mt-4"
              />
              <Lede className="mt-6">
                I&apos;m Rami. I set up every Bapita account myself: your booking page,
                your social, your bot. And{" "}
                <Key>I&apos;m the person you message when something needs changing</Key>.
                No ticket numbers, no outsourced support.
              </Lede>

              <div className="mt-8">
                <Button href="#connect" size="lg">
                  Book a free call with me
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
