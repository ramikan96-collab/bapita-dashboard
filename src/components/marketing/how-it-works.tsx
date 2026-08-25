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
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { Band } from "@/components/hub/band";
import { PauseOffscreen } from "@/components/hub/pause-offscreen";
import { Button } from "@/components/hub/ui/button";
import { Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { falafelPalette } from "@/components/hub/ui/pita";

/**
 * "Three steps. Then you are live." — the shipped page's process section, in
 * the Hub's sticky-deck treatment.
 *
 * Copy is book.bapita.com's, unchanged. The structure is the Hub's, because it
 * is the best thing on either site: the section opens with the "Work smarter"
 * display band wiping in on scroll, then three cards deal themselves — each
 * pins near the top and the next slides up and covers it, so only one step is
 * ever being read.
 *
 * This is the only section on the page that gets numerals. Everywhere else the
 * chapter marker is a coloured falafel dot, because those sections aren't
 * ordered — numbering them would be decoration. This one is a genuine sequence.
 */

type Aside = { icon: LucideIcon; title: string; body: string };

type Step = {
  n: string;
  /** Which falafel lights this step. Amber → terracotta → green: the same sweep
   *  the display line makes, resolving on the green that means "live". */
  accent: string;
  lead: string;
  trail: string;
  body: string;
  asides: [Aside, Aside];
};

const STEPS: Step[] = [
  {
    n: "01",
    accent: "salon",
    lead: "Start with",
    trail: "one call",
    body: "One call, 30 minutes. You tell us about your business: your services, how you handle bookings now, what you want to fix. We take it from there.",
    asides: [
      {
        icon: Phone,
        title: "Thirty minutes",
        body: "No prep, no slides, and no account to create first.",
      },
      {
        icon: BadgePercent,
        title: "No commission",
        body: "You keep every shekel your bookings bring in.",
      },
    ],
  },
  {
    n: "02",
    accent: "rental",
    lead: "Your call to",
    trail: "a finished page",
    body: "Your booking website, owner dashboard, and confirmations, built by us, in your name. No homework on your end. No back and forth.",
    asides: [
      {
        icon: Palette,
        title: "Your name, your colours",
        body: "Nothing on it looks like a template someone else uses.",
      },
      {
        icon: Clock,
        title: "Days, not months",
        body: "You get a date on the call and we hold to it.",
      },
    ],
  },
  {
    n: "03",
    accent: "clinic",
    lead: "Your page to",
    trail: "live, and running",
    body: "Your system goes live fast. Clients can find you, book online, and get reminders without you doing a thing. We stay on hand for any updates.",
    asides: [
      {
        icon: Smartphone,
        title: "Run it from your phone",
        body: "Every booking lands there, and by email too.",
      },
      {
        icon: CalendarX,
        title: "Changes are a message",
        body: "New price, new service, a closure. You tell us, it's done.",
      },
    ],
  },
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
function CallPanel() {
  const routes = [
    { icon: Phone, title: "A 30 min call", body: "We fill it in with you." },
    { icon: FileText, title: "Or a form", body: "Whenever it suits you." },
  ];
  const facts = ["Your services and prices", "The hours you work", "Photos, if you have them"];

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
        <p className="text-[0.75rem] font-bold text-espresso">All we need from you</p>
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
          <span className="text-[0.6875rem] text-espresso/45">
            That&apos;s the whole of your homework.
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 02 — the build.
 *
 * The page assembling itself out of what you said on the call: the details land
 * one at a time, then the page they become.
 */
function BuildPanel() {
  const details = [
    { k: "Services", v: "Cut · Beard · Cut + beard" },
    { k: "Hours", v: "9:00 to 19:00" },
    { k: "Domain", v: "yourshop.co.il" },
  ];
  return (
    <div className="w-full max-w-[380px] space-y-2.5">
      {details.map((d, i) => (
        <div
          key={d.k}
          className={`fx-row ${DELAY[i]} flex items-center gap-3.5 rounded-xl border border-espresso/[0.07] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(60,34,12,0.04)]`}
        >
          <span className="w-16 shrink-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-espresso/35">
            {d.k}
          </span>
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-espresso">
            {d.v}
          </span>
          <Check className="h-4 w-4 shrink-0 text-hub-success" strokeWidth={3} />
        </div>
      ))}
      <div className="fx-row fx-d3 flex items-center gap-2.5 rounded-xl border border-cinnamon/30 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(60,34,12,0.04)]">
        <Sparkles className="h-4 w-4 shrink-0 text-cinnamon" strokeWidth={2.4} />
        <span className="text-[0.8125rem] font-bold text-espresso">
          Built and styled by us
        </span>
      </div>
      <p className="pt-1.5 text-center text-[0.75rem] text-espresso/40">
        You review a finished page, not an empty dashboard.
      </p>
    </div>
  );
}

/**
 * Step 03 — live, then working while nobody is looking.
 *
 * The page going live and the first real booking arriving are one panel,
 * because the step is one promise.
 */
function LivePanel() {
  return (
    <div className="w-full max-w-[360px] space-y-2.5">
      <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-espresso/[0.08] bg-white shadow-[0_18px_44px_-24px_rgba(60,34,12,0.35)]">
        <div className="flex items-center gap-2 border-b border-espresso/[0.06] bg-clay/60 px-3.5 py-2.5">
          <span className="h-2 w-2 rounded-full bg-book" />
          <span className="font-mono text-[0.6875rem] text-espresso/45">yourshop.co.il</span>
        </div>
        <div className="h-28 bg-gradient-to-br from-clay-toast to-bowl-tan/70" />
        <div className="space-y-2.5 p-4">
          <div className="fx-row h-3 w-3/4 rounded-full bg-espresso/[0.12]" />
          <div className="fx-row fx-d1 h-3 w-1/2 rounded-full bg-espresso/[0.07]" />
          <div className="fx-row fx-d2 mt-4 flex items-center gap-2 rounded-hub-lg bg-hub-success/10 px-3 py-2.5">
            <Check className="h-4 w-4 text-hub-success" strokeWidth={3} />
            <span className="text-[0.75rem] font-bold text-hub-success">Live</span>
          </div>
        </div>
      </div>

      {/* The first booking arriving while the owner isn't looking. Both beats
          share a grid cell so the panel never reflows mid-loop. */}
      <div className="grid">
        <div className="fx-send col-start-1 row-start-1">
          <div className="flex items-center gap-2.5 rounded-xl border border-espresso/[0.07] bg-white px-3.5 py-3">
            <span className="h-2 w-2 rounded-full bg-hub-success" />
            <span className="text-[0.75rem] text-espresso/55">
              New booking · 16:00 Thursday
            </span>
          </div>
        </div>
        <div className="fx-confirm col-start-1 row-start-1">
          <div className="flex items-center gap-2.5 rounded-xl border border-espresso/[0.07] bg-white px-3.5 py-3">
            <Check className="h-4 w-4 shrink-0 text-hub-success" strokeWidth={3} />
            <span className="text-[0.75rem] font-bold text-espresso">In your calendar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 03's panel is the one that runs past the card edge. A browser chrome
 * cropped by the frame reads as a window onto something real; doing the same to
 * 01 and 02 would amputate their checkmarks, and a list with its end column
 * sliced off reads as a layout bug.
 */
const PANELS = [
  { Panel: CallPanel, bleed: false },
  { Panel: BuildPanel, bleed: false },
  { Panel: LivePanel, bleed: true },
];

/* ── Section ───────────────────────────────────────────────── */

export function HowItWorks() {
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
      <Band lead="Work" trail="smarter" />

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-24 sm:pt-20">
        <Reveal>
          <Eyebrow>The process</Eyebrow>
        </Reveal>
        <Reveal>
          <Lede className="mt-3 max-w-xl text-[0.875rem] leading-snug sm:mt-5 sm:text-lg sm:leading-relaxed">
            Three steps, and <Key>the building is ours</Key>. No tech skills
            needed, no long onboarding. Just one conversation, and we take care
            of the rest.
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
              const { Panel, bleed } = PANELS[i];
              const pal = falafelPalette(step.accent);
              // Alternates, so the stack doesn't read as the same card three
              // times with the words swapped.
              const flip = i % 2 === 1;
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
                      {step.lead}
                    </p>
                    <h3 className="font-extrabold leading-[1.02] tracking-[-0.04em] text-espresso text-[clamp(1.5rem,3.4vw,3rem)]">
                      {step.trail}
                    </h3>
                    <p className="mt-3 max-w-md text-[0.875rem] leading-snug text-espresso/55 sm:mt-5 sm:text-base sm:leading-relaxed">
                      {step.body}
                    </p>

                    {/* Side by side from the smallest screen. Stacked, the two
                        asides alone were 220px — a third of a phone card — and
                        pushed the panel off the bottom of it. */}
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-espresso/[0.07] pt-4 sm:gap-6 sm:pt-7">
                      {step.asides.map((aside) => (
                        <div key={aside.title}>
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-hub-lg sm:h-9 sm:w-9"
                            style={{ background: `${pal.base}1f` }}
                          >
                            <aside.icon
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
                      ))}
                    </div>
                  </div>

                  {/* Flush to the card's edges, not a padded box floating in the
                      middle of one. On a phone the panel is shown through a
                      fixed window and scaled to fit inside it, so a step card
                      can never be taller than the screen it is pinned to. */}
                  <div
                    className={`relative flex h-[210px] items-center justify-center overflow-hidden p-3 phone-short:h-[160px] sm:h-auto sm:min-h-[300px] sm:p-8 lg:min-h-[440px] lg:p-10 ${
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
                      className={`flex w-full origin-center scale-[0.6] phone-short:scale-[0.46] sm:scale-100 lg:scale-[1.14] ${
                        flip ? "lg:origin-right" : "lg:origin-left"
                      } ${
                        bleed
                          ? flip
                            ? "justify-center lg:-translate-x-[16%] lg:justify-start"
                            : "justify-center lg:translate-x-[16%] lg:justify-end"
                          : "justify-center"
                      }`}
                    >
                      <Panel />
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
              That&apos;s it. You&apos;re live, and we keep it running.
            </p>
            <Button href="#connect" size="lg">
              Build My Website
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
