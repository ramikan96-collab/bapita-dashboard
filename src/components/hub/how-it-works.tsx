import {
  Check,
  Plus,
  Boxes,
  BadgePercent,
  Palette,
  Video,
  KeyRound,
  CalendarX,
  Phone,
  FileText,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { Band } from "@/components/hub/band";
import { PauseOffscreen } from "@/components/hub/pause-offscreen";
import { Button } from "@/components/hub/ui/button";
import { Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { FALAFEL_COLORS } from "@/components/hub/ui/pita";
import { PRODUCTS, type ProductId } from "@/lib/hub/products";
import { PRODUCT_ICONS } from "@/lib/hub/icon-map";

/**
 * The only section on the page that gets numerals.
 *
 * Everywhere else the chapter marker is a colored falafel dot, because those
 * sections aren't ordered — numbering them would be decoration. This one is a
 * genuine sequence, and the headlines chain: each step's trail becomes the next
 * step's lead, so the order can't be misread even by someone skimming the big
 * type only.
 *
 * Three stacked panels, alternating sides. The earlier version put the copy in
 * a column beside one sticky visual, which meant the visual existed on desktop
 * only and each step got no weight of its own.
 *
 * The section opens with the display line ("Work smarter") in a white strip of
 * its own, above the eyebrow. It was briefly folded in under the eyebrow, which
 * put two headers in one block and forced the giant words to a size that ran off
 * the right edge. Separated, each does one job: the strip is the chapter break,
 * the eyebrow and lede are this section's own header.
 */

type Aside = { icon: LucideIcon; title: string; body: string };

type Step = {
  n: string;
  /** Which falafel lights this step. Amber → terracotta → green: the same sweep
   *  the display line makes, resolving on the green that means "live". */
  accent: ProductId;
  lead: string;
  trail: string;
  body: string;
  asides: [Aside, Aside];
};

const STEPS: Step[] = [
  {
    n: "01",
    accent: "book",
    lead: "Start by",
    trail: "picking your tools",
    body: "Book on its own, Book with Bots answering your chats, Social on its own, or all four. Tell us what's actually costing you time and we'll say which ones earn their keep and which you can skip.",
    asides: [
      {
        icon: Boxes,
        title: "One or all four",
        body: "Take what you need now. The rest can follow whenever.",
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
    accent: "social",
    lead: "Your tools to",
    trail: "your details",
    body: "A short call or a form — whichever you prefer. Accounts and logins are quicker to set up together on the call. If you'd rather do that part alone, you get a short video showing exactly what to click.",
    asides: [
      {
        icon: Video,
        title: "Call or form, your pick",
        body: "Twenty minutes on a call, or fill it in whenever suits you.",
      },
      {
        icon: KeyRound,
        title: "Logins, done together",
        body: "We connect your accounts on the call so nothing gets stuck.",
      },
    ],
  },
  {
    n: "03",
    accent: "bots",
    lead: "Your details to",
    trail: "live, and shown to you",
    body: "We build it, put your name and colors on it in Hebrew or English, then walk you through it screen by screen. After that it's yours, on the phone you already have.",
    asides: [
      {
        icon: Palette,
        title: "Your name, your colors",
        body: "Nothing on it looks like a template someone else uses.",
      },
      {
        icon: CalendarX,
        title: "Cancel any month",
        body: "Per tool, no lock-in, and your client list leaves with you.",
      },
    ],
  },
];

/** Stagger classes, in order. Defined in globals.css. */
const DELAY = ["", "fx-d1", "fx-d2", "fx-d3"] as const;

/* ── Step panels ───────────────────────────────────────────── */

function PickPanel() {
  return (
    <div className="w-full max-w-[380px] space-y-2.5">
      {PRODUCTS.map((p, i) => {
        const Icon = PRODUCT_ICONS[p.id];
        const addOn = p.tier === "add-on";
        // The two mains are shown taken and the add-ons shown available — the
        // panel is the shape of the decision, not a recommendation.
        const picked = !addOn;
        return (
          <div
            key={p.id}
            className={`${picked ? `fx-row ${DELAY[i]}` : ""} ${
              addOn ? "ms-7" : ""
            } flex items-center gap-3.5 rounded-xl border bg-white px-4 shadow-[0_1px_2px_rgba(60,34,12,0.04)] ${
              addOn ? "py-2.5" : "py-3.5"
            }`}
            style={{
              borderColor: picked
                ? `${FALAFEL_COLORS[p.id].base}66`
                : "rgba(42,29,20,0.07)",
            }}
          >
            <span
              className={`flex shrink-0 items-center justify-center rounded-full ${
                addOn ? "h-7 w-7" : "h-9 w-9"
              }`}
              style={{
                background: `radial-gradient(circle at 32% 28%, ${FALAFEL_COLORS[p.id].highlight}, ${FALAFEL_COLORS[p.id].base} 60%, ${FALAFEL_COLORS[p.id].deep})`,
              }}
            >
              <Icon
                className={addOn ? "h-3.5 w-3.5" : "h-4 w-4"}
                style={{ color: "rgba(42,29,20,0.55)" }}
                strokeWidth={2.4}
              />
            </span>
            <span
              className={`flex-1 font-bold ${
                addOn ? "text-[0.8125rem] text-espresso/60" : "text-[0.875rem] text-espresso"
              }`}
            >
              {addOn && (
                <span aria-hidden="true" className="me-1 text-espresso/25">
                  ↳
                </span>
              )}
              {p.name}
            </span>
            {picked ? (
              <Check
                className="h-[1.125rem] w-[1.125rem]"
                style={{ color: FALAFEL_COLORS[p.id].base }}
                strokeWidth={3}
              />
            ) : (
              <Plus className="h-[1.125rem] w-[1.125rem] text-espresso/20" />
            )}
          </div>
        );
      })}
      <p className="pt-1.5 text-center text-[0.75rem] text-espresso/40">
        Start with the two you need. Add the rest later.
      </p>
    </div>
  );
}

/**
 * Step 02 — the hand-over.
 *
 * Two routes to the same place, shown side by side so neither reads as the
 * fallback: a call, or a form in your own time. Underneath, the one thing the
 * step is actually about — connecting your accounts — with the video offered
 * for anyone who'd rather not do it live.
 */
function SharePanel() {
  const routes = [
    { icon: Phone, title: "A 20-min call", body: "We fill it in with you." },
    { icon: FileText, title: "Or a form", body: "Whenever it suits you." },
  ];
  return (
    <div className="w-full max-w-[380px] space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        {routes.map((r, i) => (
          <div
            key={r.title}
            className={`fx-row ${DELAY[i]} rounded-xl border border-espresso/[0.07] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,34,12,0.04)]`}
          >
            <r.icon className="h-4 w-4 text-espresso/45" strokeWidth={2.3} />
            <p className="mt-2.5 text-[0.8125rem] font-bold text-espresso">
              {r.title}
            </p>
            <p className="mt-1 text-[0.6875rem] leading-snug text-espresso/45">
              {r.body}
            </p>
          </div>
        ))}
      </div>

      <div className="fx-row fx-d2 rounded-xl border border-espresso/[0.07] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,34,12,0.04)]">
        <p className="text-[0.75rem] font-bold text-espresso">
          Connecting your accounts
        </p>
        <div className="mt-3 space-y-2">
          {["Instagram & Facebook", "Google Business", "WhatsApp Business"].map(
            (name) => (
              <div key={name} className="flex items-center gap-2.5">
                <Check className="h-3.5 w-3.5 shrink-0 text-hub-success" strokeWidth={3} />
                <span className="text-[0.6875rem] text-espresso/55">{name}</span>
                <span className="ms-auto text-[0.625rem] font-semibold text-espresso/30">
                  connected
                </span>
              </div>
            ),
          )}
        </div>
        <div className="mt-3.5 flex items-center gap-2 border-t border-espresso/[0.07] pt-3">
          <PlayCircle className="h-4 w-4 shrink-0 text-espresso/35" />
          <span className="text-[0.6875rem] text-espresso/45">
            Rather do it yourself? 2-min video.
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 03 — built, then handed over.
 *
 * The page assembling and the first real booking arriving are one panel, because
 * the step is one promise: we build it, we show you, and then it works while
 * you're not looking.
 */
function LivePanel() {
  return (
    <div className="w-full max-w-[360px] space-y-2.5">
    <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-espresso/[0.08] bg-white shadow-[0_18px_44px_-24px_rgba(60,34,12,0.35)]">
      <div className="flex items-center gap-2 border-b border-espresso/[0.06] bg-clay/60 px-3.5 py-2.5">
        <span className="h-2 w-2 rounded-full bg-book" />
        <span className="font-mono text-[0.6875rem] text-espresso/45">
          shimi.bapita.com
        </span>
      </div>
      <div className="h-28 bg-gradient-to-br from-clay-toast to-bowl-tan/70" />
      {/* The page assembling: bars land, then the badge. No turnaround claim —
          the old "Live · 41 hours" was a promise nobody made. */}
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
            <span className="text-[0.75rem] font-bold text-espresso">
              In your calendar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 03's panel is the one that runs past the card edge.
 *
 * A browser chrome cropped by the frame reads as a window onto something real.
 * Doing the same to 01 and 02 would just amputate the checkmarks — those two
 * panels are lists, and a list with its right column sliced off reads as a
 * layout bug, not as a crop.
 */
const PANELS = [
  { Panel: PickPanel, bleed: false },
  { Panel: SharePanel, bleed: false },
  { Panel: LivePanel, bleed: true },
];

/* ── Section ───────────────────────────────────────────────── */

export function HowItWorks() {
  return (
    /* overflow-x-clip, never overflow-hidden. `hidden` makes this section a
       scroll container, and a sticky element pins against its nearest scrolling
       ancestor — so every card in the deck below was pinning against a box that
       never scrolls, i.e. not pinning at all, and all three simply scrolled past
       as a list. `clip` crops the same pixels without becoming one. */
    <section id="how-it-works" className="wash-cool overflow-x-clip">
      {/* The display line brings its own full-bleed white strip and sits above
          the section's own header — one oversized statement per row, nothing
          else in it, the way the reference does it. The strip belongs to <Band>
          because the word's travel is measured against it.

          Not inside <Reveal>: that holds a translateY while hidden, and the
          line measures its own position to drive both the wipe and the drift. */}
      <Band />

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-24 sm:pt-20">
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
        </Reveal>
        <Reveal>
          <Lede className="mt-3 max-w-xl text-[0.875rem] leading-snug sm:mt-5 sm:text-lg sm:leading-relaxed">
            Three steps, and <Key>the building is ours</Key>. You pick what you
            want and tell us about your business — once on a call or a form.
            Everything after that is on us.
          </Lede>
        </Reveal>

        {/* A deck, not a list.
            Each step pins near the top and the next one slides up and covers
            it, so only one step is ever being read: 01 holds, 02 hides it, 03
            hides that. Each card pins a few pixels lower than the one beneath
            so the covered ones stay visible as a stack of edges.

            The cards are flush — no gap between them. With a gap, the incoming
            card first sat alone in the open against the page background and
            only then slid over its predecessor, which read as three separate
            cards scrolling past rather than one deck dealing itself. Flush,
            the only way a card can enter is by covering the one before it.
            The scroll distance for each hand-off is that card's own height.

            A pinned card fills the viewport. Its natural height is around
            455px, so pinned at 88px on an 800px screen it left 257px of the
            NEXT card sitting in the open underneath — all three were readable
            at once and the deck had nothing to deal. Sized to the screen, the
            next card starts just past the fold: you get one step at a time,
            and the second and third arrive because you scrolled to them. The
            leftover slack goes to the content, which centres in the card
            rather than hugging the top of a tall box.

            The deck used to be off below lg. Stacked single-column these cards
            ran ~960px, taller than a phone screen, so a card pinned at 88px
            kept its own last 180px permanently below the fold — the panel was
            unreachable, not merely covered, and the section ran to four and a
            quarter screens of scrolling.

            The cards are now ~560px on a phone (compact type, asides side by
            side, the panel shown through a fixed window), which fits, so the
            deck is on at every width. Same behaviour as the laptop: one step
            at a time, each arriving because you scrolled to it.

            No reveal animation on these either: a card fading in on top of
            another is transparent while it does it, so you read both at once.
            The slide IS the reveal. And no <Reveal> wrapper — it holds a
            translateY while hidden, and a transformed ancestor becomes the
            containing block for position sticky, which silently kills the
            pinning. PauseOffscreen adds no transform, so it is safe here. */}
        <PauseOffscreen>
          <ol className="mt-8 sm:mt-14">
            {STEPS.map((step, i) => {
              const { Panel, bleed } = PANELS[i];
              const pal = FALAFEL_COLORS[step.accent];
              // Alternates, so the stack doesn't read as the same card three
              // times with the words swapped.
              const flip = i % 2 === 1;
              return (
                /* Direct child of the <ol> on purpose: a sticky element pins
                   inside its own parent's box, so wrapping each card in its own
                   div gives it a box exactly its own height and nothing to stick
                   within. The list is the shared box. */
                <li
                  key={step.n}
                  /* The upward shadow is the deck's: deep enough that the
                     incoming card visibly sits ON the one below rather than
                     appearing to crop it — with a soft shadow, a card cut
                     mid-sentence read as a bug. It is lg-only because nothing
                     overlaps below that, where a dark blur cast upward into
                     the gap is just a smudge over the previous card. */
                  /* The pin offset and the per-card step are tokens so the
                     phone deck can sit closer under the header without
                     changing the laptop one. */
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

                  {/* Flush to the card's edges, not a padded box floating in
                      the middle of one. The old pane sat 2% off the card colour
                      with a 280px mock adrift in it, so it read as empty space
                      rather than as the other half of the card. */}
                  {/* On a phone the panel is shown through a fixed window and
                      scaled to fit inside it, so a step card can never be
                      taller than the screen it is pinned to. */}
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
                    {/* Grows toward the card's outer edge and is cropped by it.
                        A visual that runs past the frame reads as a window onto
                        something real; one that fits neatly reads as a sticker. */}
                    {/* The origin has to be a class, not an inline style: the
                        left/right origin is what makes the visual grow toward
                        the card's outer edge on a laptop, and applied to the
                        phone's shrink it dragged the whole panel into the
                        start-hand corner of its window. */}
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

            {/* Pin room for the last card, and it has to be a real child.
                A sticky element is held inside its parent's CONTENT box, so
                padding on the <ol> buys nothing — measured, not assumed: 18vh
                and 40vh of padding released the deck at the same scroll
                position. Without something occupying flow after it, the third
                card's own bottom IS the bottom of that box, so it lands and is
                immediately dragged off: the one step that never got read at
                rest. Empty and hidden from the a11y tree — it is scroll
                distance, not a fourth item. */}
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
              Book a free call
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
