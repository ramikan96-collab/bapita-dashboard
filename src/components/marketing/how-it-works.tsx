import Image from "next/image";
import {
  Check,
  Phone,
  FileText,
  PlayCircle,
  Palette,
  CalendarX,
  BadgePercent,
  Clock,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { Band } from "@/components/hub/band";
import { PauseOffscreen } from "@/components/hub/pause-offscreen";
import { Button } from "@/components/hub/ui/button";
import { Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { falafelPalette } from "@/components/hub/ui/pita";
import { getDict, dirFor, type Dict, type Locale } from "@/lib/marketing/i18n";

/**
 * "Three steps. Then you are live." — the shipped page's process section, in
 * the Hub's sticky-deck treatment.
 *
 * The structure is the Hub's, because it is the best thing on either site: the section opens with the "Work smarter"
 * display band wiping in on scroll, then three cards deal themselves — each
 * pins near the top and the next slides up and covers it, so only one step is
 * ever being read.
 *
 * This is the only section on the page that gets numerals. Everywhere else the
 * chapter marker is a coloured falafel dot, because those sections aren't
 * ordered — numbering them would be decoration. This one is a genuine sequence.
 */

type Step = {
  n: string;
  /** Key into `how.steps`. The words live in the locale files. */
  id: keyof Dict["how"]["steps"];
  /** Which falafel lights this step. Amber → terracotta → green: the same sweep
   *  the display line makes, resolving on the green that means "live". */
  accent: string;
  /** One icon per aside, in the order the locale lists them. */
  asideIcons: [LucideIcon, LucideIcon];
};

const STEPS: Step[] = [
  { n: "01", id: "call", accent: "salon", asideIcons: [Phone, BadgePercent] },
  { n: "02", id: "build", accent: "rental", asideIcons: [Palette, Clock] },
  { n: "03", id: "live", accent: "clinic", asideIcons: [Smartphone, CalendarX] },
];

/** Stagger classes, in order. Defined in globals.css. */
const DELAY = ["", "fx-d1", "fx-d2", "fx-d3"] as const;

/* ── Step panels ───────────────────────────────────────────── */

/**
 * Step 01 — the call.
 *
 * Two routes to the same place, shown side by side so neither reads as the
 * fallback: a call, or a form in your own time. Underneath, the only thing we
 * actually need out of it — the three facts that become your page.
 */
function CallPanel({ t }: { t: Dict["how"]["callPanel"] }) {
  const routes = [
    { icon: Phone, ...t.routeA },
    { icon: FileText, ...t.routeB },
  ];
  const facts = [t.factA, t.factB, t.factC];

  return (
    <div className="w-full max-w-[380px] space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        {routes.map((r, i) => (
          <div
            key={r.title}
            className={`fx-row ${DELAY[i]} rounded-xl border border-espresso/[0.07] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,34,12,0.04)]`}
          >
            <r.icon className="h-4 w-4 text-espresso/45" strokeWidth={2.3} />
            <p className="mt-2.5 text-[0.8125rem] font-bold text-espresso">{r.title}</p>
            <p className="mt-1 text-[0.6875rem] leading-snug text-espresso/45">{r.body}</p>
          </div>
        ))}
      </div>

      <div className="fx-row fx-d2 rounded-xl border border-espresso/[0.07] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,34,12,0.04)]">
        <p className="text-[0.75rem] font-bold text-espresso">{t.factsTitle}</p>
        <div className="mt-3 space-y-2">
          {facts.map((fact) => (
            <div key={fact} className="flex items-center gap-2.5">
              <Check className="h-3.5 w-3.5 shrink-0 text-hub-success" strokeWidth={3} />
              <span className="text-[0.6875rem] text-espresso/55">{fact}</span>
            </div>
          ))}
        </div>
        <div className="mt-3.5 flex items-center gap-2 border-t border-espresso/[0.07] pt-3">
          <PlayCircle className="h-4 w-4 shrink-0 text-espresso/35" />
          <span className="text-[0.6875rem] text-espresso/45">{t.footnote}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 02 — the build.
 *
 * A real page we built, not a diagram of one. Every version before this
 * described the build with rows of labels and checkmarks, which is an
 * illustration of a promise; the promise is "you get a finished website", and
 * the only honest way to make it is to show the finished website.
 *
 * Two shots, because the claim has two halves: the site itself, and the fact
 * that it takes bookings. The booking step overlaps the window rather than
 * sitting beside it — one product, photographed twice, not two products.
 */
function BuildPanel({ t }: { t: Dict["how"]["shots"] }) {
  return (
    <div className="relative w-full max-w-[400px] pb-6 ps-5">
      <Window label={t.siteLabel}>
        <Image
          src="/img/product/booking-hero.webp"
          alt={t.siteAlt}
          width={1044}
          height={1010}
          sizes="(min-width: 1024px) 460px, 400px"
          className="block h-auto w-full"
        />
      </Window>

      {/* Inside the panel box, not hanging off it: the step card clips its
          panel, and an overhang gets sliced rather than layered. */}
      <figure className="absolute bottom-0 start-0 w-[42%] overflow-hidden rounded-xl border border-espresso/10 bg-white shadow-[0_20px_46px_-20px_rgba(60,34,12,0.55)]">
        <Image
          src="/img/product/booking-flow.webp"
          alt={t.flowAlt}
          width={578}
          height={504}
          sizes="180px"
          className="block h-auto w-full"
        />
      </figure>
    </div>
  );
}

/**
 * Step 03 — live, then working while nobody is looking.
 *
 * The page going live and the first real booking arriving are one panel,
 * because the step is one promise.
 */
function LivePanel({
  t,
  live,
}: {
  t: Dict["how"]["shots"];
  live: Dict["how"]["livePanel"];
}) {
  return (
    <div className="w-full max-w-[440px] space-y-3">
      <Window label={t.dashboardLabel} tone="app">
        <Image
          src="/img/product/dashboard.webp"
          alt={t.dashboardAlt}
          width={1430}
          height={683}
          sizes="(min-width: 1024px) 500px, 440px"
          className="block h-auto w-full"
        />
      </Window>

      {/* The booking that lands while nobody is looking — kept as live DOM, not
          folded into the photograph. It is the only moving thing in the step,
          and a screenshot of a notification cannot arrive. Both beats share one
          grid cell so the panel never reflows mid-loop. */}
      <div className="grid">
        <div className="fx-send col-start-1 row-start-1">
          <div className="flex items-center gap-2.5 rounded-xl border border-espresso/[0.07] bg-white px-3.5 py-3 shadow-[0_10px_30px_-18px_rgba(60,34,12,0.45)]">
            <span className="h-2 w-2 rounded-full bg-hub-success" />
            <span className="text-[0.75rem] text-espresso/55">
              {live.arriving}
            </span>
          </div>
        </div>
        <div className="fx-confirm col-start-1 row-start-1">
          <div className="flex items-center gap-2.5 rounded-xl border border-espresso/[0.07] bg-white px-3.5 py-3 shadow-[0_10px_30px_-18px_rgba(60,34,12,0.45)]">
            <Check className="h-4 w-4 shrink-0 text-hub-success" strokeWidth={3} />
            <span className="text-[0.75rem] font-bold text-espresso">
              {live.landed}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The chrome a product shot is shown through.
 *
 * `site` reads as a browser window and carries the domain; `app` reads as a
 * desktop window and carries three inert traffic lights instead, because a
 * dashboard behind a URL bar looks like a website and the point of step 03 is
 * that it is the thing you run the business from.
 */
function Window({
  label,
  tone = "site",
  children,
}: {
  label: string;
  tone?: "site" | "app";
  children: React.ReactNode;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-espresso/[0.08] bg-white shadow-[0_22px_54px_-26px_rgba(60,34,12,0.45)]">
      <div className="flex items-center gap-2 border-b border-espresso/[0.06] bg-clay/60 px-3.5 py-2.5">
        {tone === "app" ? (
          <span aria-hidden="true" className="flex gap-1.5">
            {["#e8746a", "#e9b949", "#4fb477"].map((c) => (
              <span
                key={c}
                className="h-2 w-2 rounded-full"
                style={{ background: c, opacity: 0.55 }}
              />
            ))}
          </span>
        ) : (
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-book" />
        )}
        <span className="truncate font-mono text-[0.6875rem] text-espresso/45">
          {label}
        </span>
      </div>
      {children}
    </figure>
  );
}

/**
 * Steps 02 and 03 are photographs of the actual product — the booking site we
 * built and the dashboard that runs it. Step 01 stays drawn: it is a
 * conversation, there is nothing to photograph, and a stock picture of someone
 * on a phone would be the only untrue image on the page.
 */
/**
 * Which step bleeds past the card edge. Indexed with STEPS.
 *
 * Step 03 used to bleed: a wide dashboard window cropped by the frame reads as
 * a view onto something real. But the live-booking toast sits in the same
 * scaled/translated column as the window, so the bleed dragged it sideways
 * too and cropped its text mid-word — legible on neither / nor /he. Off until
 * the toast is pulled out of the transform it shares with the image.
 */
const BLEED = [false, false, false];

/* ── Section ───────────────────────────────────────────────── */

export function HowItWorks({ locale = "en" }: { locale?: Locale }) {
  const t = getDict(locale).how;
  const rtl = dirFor(locale) === "rtl";
  return (
    /* overflow-x-clip, never overflow-hidden. `hidden` makes this section a
       scroll container, and a sticky element pins against its nearest scrolling
       ancestor — so every card in the deck below would be pinning against a box
       that never scrolls, i.e. not pinning at all. `clip` crops the same pixels
       without becoming one. */
    <section id="how-it-works" className="wash-cool overflow-x-clip">
      {/* The display line brings its own full-bleed white strip and sits above
          the section's own header. Not inside <Reveal>: that holds a translateY
          while hidden, and the line measures its own position to drive both the
          wipe and the drift. */}
      <Band lead={t.band.lead} trail={t.band.trail} />

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-24 sm:pt-20">
        <Reveal>
          <Eyebrow>{t.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal>
          <Lede className="mt-3 max-w-xl text-[0.875rem] leading-snug sm:mt-5 sm:text-lg sm:leading-relaxed">
            {t.ledeBefore} <Key>{t.ledeKey}</Key>. {t.ledeAfter}
          </Lede>
        </Reveal>

        {/* A deck, not a list. Each step pins near the top and the next slides
            up and covers it, so only one step is ever being read. The cards are
            flush — with a gap, the incoming card first sat alone against the
            page and only then slid over its predecessor, which read as three
            cards scrolling past rather than one deck dealing itself.

            No <Reveal> wrapper on these: it holds a translateY while hidden, and
            a transformed ancestor becomes the containing block for position
            sticky, which silently kills the pinning. PauseOffscreen adds no
            transform, so it is safe here. */}
        <PauseOffscreen>
          <ol className="mt-8 sm:mt-14">
            {STEPS.map((step, i) => {
              const bleed = BLEED[i];
              const copy = t.steps[step.id];
              const asides = [copy.asideA, copy.asideB];
              const pal = falafelPalette(step.accent);
              // Alternates, so the stack doesn't read as the same card three
              // times with the words swapped.
              const flip = i % 2 === 1;
              // `justify-start`/`justify-end` are logical and flip on their own
              // under dir=rtl. `origin-*` and `translate-x` are not — both are
              // screen-space, so which physical side the bleed pushes toward
              // has to be re-derived from actual direction, not just `flip`.
              const pushLeft = flip !== rtl;
              return (
                /* Direct child of the <ol> on purpose: a sticky element pins
                   inside its own parent's box, so wrapping each card in its own
                   div gives it a box exactly its own height and nothing to
                   stick within. The list is the shared box. */
                <li
                  key={step.n}
                  className="sticky grid min-h-[calc(100svh-5.75rem)] overflow-hidden rounded-3xl border border-espresso/[0.09] bg-paper-warm shadow-[0_-1px_0_rgba(60,34,12,0.10),0_-18px_60px_-22px_rgba(60,34,12,0.40)] [--deck-step:10px] [--deck-top:4.75rem] lg:min-h-[calc(100svh-7rem)] lg:grid-cols-2 lg:[--deck-step:14px] lg:[--deck-top:5.5rem]"
                  style={{
                    top: `calc(var(--deck-top) + var(--deck-step) * ${i})`,
                    zIndex: i + 1,
                  }}
                >
                  <div
                    className={`flex flex-col justify-center p-5 sm:p-9 lg:p-11 ${flip ? "lg:order-2" : ""}`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="font-mono text-[0.875rem] font-bold tracking-[0.12em]"
                        style={{ color: pal.deep }}
                      >
                        {step.n}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-px w-10"
                        style={{ background: `${pal.base}59` }}
                      />
                    </span>

                    <p className="mt-3 text-[0.9375rem] font-semibold text-espresso/35 sm:mt-5 sm:text-lg">
                      {copy.lead}
                    </p>
                    <h3 className="font-extrabold leading-[1.02] tracking-[-0.04em] text-espresso text-[clamp(1.5rem,3.4vw,3rem)]">
                      {copy.trail}
                    </h3>
                    <p className="mt-3 max-w-md text-[0.875rem] leading-snug text-espresso/55 sm:mt-5 sm:text-base sm:leading-relaxed">
                      {copy.body}
                    </p>

                    {/* Side by side from the smallest screen. Stacked, the two
                        asides alone were 220px — a third of a phone card — and
                        pushed the panel off the bottom of it. */}
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-espresso/[0.07] pt-4 sm:gap-6 sm:pt-7">
                      {asides.map((aside, a) => {
                        const AsideIcon = step.asideIcons[a];
                          return (
                          <div key={aside.title}>
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-hub-lg sm:h-9 sm:w-9"
                              style={{ background: `${pal.base}1f` }}
                            >
                              <AsideIcon
                                className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]"
                                style={{ color: pal.deep }}
                                strokeWidth={2.3}
                              />
                            </span>
                            <p className="mt-2 text-[0.8125rem] font-bold leading-snug text-espresso sm:mt-3.5 sm:text-[0.9375rem]">
                              {aside.title}
                            </p>
                            <p className="mt-1 text-[0.75rem] leading-snug text-espresso/50 sm:text-[0.8125rem] sm:leading-relaxed">
                              {aside.body}
                            </p>
                          </div>
                          );
                      })}
                    </div>
                  </div>

                  {/* Flush to the card's edges, not a padded box floating in the
                      middle of one. On a phone the panel is shown through a
                      fixed window and scaled to fit inside it, so a step card
                      can never be taller than the screen it is pinned to. */}
                  <div
                    className={`relative flex h-[244px] items-center justify-center overflow-hidden p-3 phone-short:h-[168px] sm:h-auto sm:min-h-[300px] sm:p-8 lg:min-h-[440px] lg:p-10 ${
                      flip ? "lg:order-1" : ""
                    }`}
                    style={{
                      background: `radial-gradient(120% 90% at ${
                        flip ? "20%" : "80%"
                      } 12%, ${pal.base}1a 0%, transparent 62%), linear-gradient(155deg, #F1EFE7 0%, #E9E6DC 100%)`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 w-px bg-espresso/[0.07] ${
                        flip ? "end-0" : "start-0"
                      }`}
                    />
                    {/* The origin has to be a class, not an inline style: the
                        left/right origin is what makes the visual grow toward
                        the card's outer edge on a laptop, and applied to the
                        phone's shrink it dragged the panel into the corner. */}
                    <div
                      className={`flex w-full origin-center scale-[0.68] phone-short:scale-[0.46] sm:scale-100 lg:scale-[1.14] ${
                        pushLeft ? "lg:origin-right" : "lg:origin-left"
                      } ${
                        bleed
                          ? `justify-center ${pushLeft ? "lg:-translate-x-[16%]" : "lg:translate-x-[16%]"} ${flip ? "lg:justify-start" : "lg:justify-end"}`
                          : "justify-center"
                      }`}
                    >
                      {step.id === "call" ? (
                        <CallPanel t={t.callPanel} />
                      ) : step.id === "build" ? (
                        <BuildPanel t={t.shots} />
                      ) : (
                        <LivePanel t={t.shots} live={t.livePanel} />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}

            {/* Pin room for the last card, and it has to be a real child: a
                sticky element is held inside its parent's CONTENT box, so
                padding on the <ol> buys nothing. Without something occupying
                flow after it, the third card's own bottom IS the bottom of that
                box, so it lands and is immediately dragged off. */}
            <li aria-hidden="true" className="block h-[28vh] lg:h-[40vh]" />
          </ol>
        </PauseOffscreen>

        <Reveal>
          {/* Sits above the stack so the last card slides under it, not past it. */}
          <div className="relative z-10 mt-10 flex flex-col items-center gap-4 bg-transparent text-center sm:mt-16">
            <p className="text-base font-bold text-espresso sm:text-xl">
              {t.closer.title}
            </p>
            <Button href="#connect" size="lg">
              {t.closer.cta}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
