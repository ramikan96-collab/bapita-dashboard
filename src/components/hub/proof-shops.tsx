import { MapPin, Check } from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { TwoTone, Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { BrowserFrame } from "@/components/hub/ui/frame";

/**
 * Credibility band.
 *
 * The homepage had no social proof at all — the founder section was carrying the
 * entire trust load. This band states only what's true today: Book is live, one
 * shop is on it, founding pricing is open.
 *
 * NOTE (Rami): there is intentionally no customer quote here. Nothing on this
 * page invents one. When Shimi's video testimonial lands, drop it in the empty
 * <blockquote> slot below and delete this note.
 */

const FACTS = [
  "Bapita Book is live and running",
  "Founding-client pricing still open",
  "Setup done by the founder, not an agency",
];

export function ProofShops() {
  return (
    <section className="wash-flat border-y border-espresso/[0.07] py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
          <Reveal>
            <div>
              <Eyebrow dot="#e8920a">First shops</Eyebrow>
              <TwoTone
                size="sm"
                lead="Early, on purpose."
                trail="Three spots left."
                className="mt-4"
              />
              <Lede className="mt-5">
                Bapita is new and we&apos;re taking on a handful of shops at{" "}
                <Key>founding-client pricing</Key>: lower rate, direct line to me,
                and your feedback shapes what gets built next.
              </Lede>

              <ul className="mt-7 space-y-3">
                {FACTS.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-[0.9375rem] font-medium text-espresso/70"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-hub-success" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* The one shop that's live, shown plainly. */}
          <Reveal delay={100}>
            <div className="relative">
              <BrowserFrame url="shimi.bapita.com" accent="#e8920a">
                <div className="bg-white px-6 py-7">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-book text-base font-extrabold text-white">
                      S
                    </span>
                    <div>
                      <p className="text-[0.9375rem] font-bold text-espresso">
                        Shimi Barbershop
                      </p>
                      <p className="flex items-center gap-1 text-[0.75rem] text-espresso/45">
                        <MapPin className="h-3 w-3" />
                        Herzliya, Israel
                      </p>
                    </div>
                  </div>

                  {/* Quote slot — stays empty until there's a real one. */}
                  <blockquote className="mt-6 border-s-2 border-book/30 ps-4 text-[0.9375rem] italic leading-relaxed text-espresso/40">
                    First shop on Bapita Book.
                  </blockquote>

                  <div className="mt-6 flex items-center gap-2 rounded-pill bg-hub-success/10 px-3.5 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-hub-success" />
                    <span className="text-[0.75rem] font-bold text-hub-success">
                      Booking page live
                    </span>
                  </div>
                </div>
              </BrowserFrame>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
