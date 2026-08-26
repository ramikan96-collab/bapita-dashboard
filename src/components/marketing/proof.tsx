"use client";

import { useRef } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  MessageCircle,
  PhoneOff,
  Search,
  Star,
} from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { PauseOffscreen } from "@/components/hub/pause-offscreen";
import { TwoTone, Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { usePinned, useSectionProgress } from "@/lib/marketing/motion-hooks";
import { dirFor, getDict, type Dict, type Locale } from "@/lib/marketing/i18n";

/**
 * "Sound familiar?" and "Why this works", merged.
 *
 * They were two sections doing one job. The first listed four things that go
 * wrong when you run bookings by hand; the second listed six sourced numbers
 * proving those same things go wrong for everyone. A reader met the problem,
 * scrolled through three unrelated sections, and then met the evidence for it.
 *
 * Now every card is one problem WITH the number under it. Six cards, six
 * numbers, six sources printed on the card — an unattributed percentage reads
 * as marketing, so the source is part of the design rather than a footnote.
 * Five of the six link to the study; the header says outright that none of the
 * figures are ours, because a reader who assumes they are reads the rail as a
 * boast instead of as the case for booking online at all.
 *
 * ── The scroll ──
 *
 * On a laptop the section pins for its own height and vertical scroll drives
 * the rail sideways, so the next card arrives as you scroll rather than as you
 * hunt for a scrollbar. Below that width, and on the calm motion tier, it is a
 * plain swipeable rail with scroll snapping — the same cards, no pinning, no
 * hijacked scroll. That is the fallback in the markup too: the server renders
 * the unpinned version, and pinning is switched on afterwards only if it
 * applies. A reader whose JS never runs gets a rail that works.
 *
 * ── No business names ──
 *
 * Every scene used to be a barbershop: named competitors, a "barber near me"
 * search, haircut prices. Bapita sells to salons, short term rentals, clinics
 * and restaurants now, so the scenes carry one of each and name none of them.
 * A visitor running a clinic should not have to translate a barber's week into
 * their own before the argument lands.
 */

/** The words a scene draws with. Structure is here; copy is in the locale. */
type Scenes = Dict["proof"]["scenes"];

type Card = {
  /** Key into `proof.cards` — the problem line, the label and the source. */
  id: keyof Dict["proof"]["cards"];
  /** The figure itself. A number, so it reads the same in both languages. */
  value: string;
  /** The study itself. Omitted where the figure has no traceable page. */
  href?: string;
  glow: string;
  Scene: (props: { t: Scenes }) => React.ReactElement;
};

/* ── Scenes ───────────────────────────────────────────────────── */

/** Stagger classes, in order. Defined in globals.css after the loop classes. */
const DELAY = ["", "fx-d1", "fx-d2", "fx-d3"] as const;

/** 1 — the search that ends somewhere else. */
function SearchScene({ t }: { t: Scenes }) {
  const results = [
    { ...t.resultA, stars: "★★★★★" },
    { ...t.resultB, stars: "★★★★☆" },
  ];
  return (
    <Scene className="justify-center gap-2">
      <p className="mb-1 flex items-center gap-1.5 rounded-hub-lg border border-espresso/[0.07] bg-paper-warm px-2.5 py-2 font-mono text-[0.6875rem] text-espresso/50">
        <Search className="h-3 w-3 shrink-0" strokeWidth={2.4} />
        {t.searchQuery}
      </p>
      {results.map((r, i) => (
        <div
          key={r.name}
          className={`fx-row ${DELAY[i]} rounded-hub-lg border border-espresso/[0.07] bg-paper-warm px-2.5 py-2`}
        >
          <p className="truncate text-[0.75rem] font-semibold text-espresso">{r.name}</p>
          <p className="mt-0.5 text-[0.6875rem] text-espresso/40">
            {r.stars} {r.meta}
          </p>
        </div>
      ))}
      <div className="fx-row fx-d2 rounded-hub-lg border border-dashed border-hub-danger/40 bg-hub-danger/[0.05] px-2.5 py-2.5 text-center">
        <p className="text-[0.75rem] font-bold text-hub-danger">{t.notHere}</p>
      </div>
    </Scene>
  );
}

/** 2 — same street, two businesses, one of them bookable. */
function PickScene({ t }: { t: Scenes }) {
  return (
    <Scene className="justify-center gap-2.5">
      <p className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-espresso/40">
        {t.sameStreet}
      </p>
      <div className="fx-row flex items-center gap-2.5 rounded-hub-lg border border-cinnamon/30 bg-paper-warm px-2.5 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[0.75rem] font-bold text-espresso">
          {t.booksOnline}
        </span>
        <span className="fx-bob rounded-pill bg-hub-success/12 px-2 py-0.5 text-[0.6875rem] font-bold text-hub-success">
          {t.booked}
        </span>
      </div>
      <div className="fx-row fx-d2 flex items-center gap-2.5 rounded-hub-lg border border-espresso/[0.07] px-2.5 py-2.5 opacity-60">
        <PhoneOff className="h-3.5 w-3.5 shrink-0 text-espresso/35" strokeWidth={2.4} />
        <span className="min-w-0 flex-1 truncate text-[0.75rem] text-espresso/55">
          {t.callDuringHours}
        </span>
      </div>
    </Scene>
  );
}

/** 3 — the bookings that land while the lights are off. One of each kind of
 *  business, because all four of them close and all four of them keep taking
 *  bookings after they do. */
function AfterHoursScene({ t }: { t: Scenes }) {
  const rows = [
    { at: "21:40", what: `${t.lateAppointment} · ₪180` },
    { at: "23:15", what: `${t.lateStay} · ₪1,300` },
    { at: "02:07", what: t.lateTable },
  ];
  return (
    <Scene className="justify-center gap-2">
      <p className="mb-1 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-espresso/40">
        <Clock className="h-3 w-3" strokeWidth={2.4} />
        {t.closedAt}
      </p>
      {rows.map((row, i) => (
        <div
          key={row.at}
          className={`fx-row ${DELAY[i]} flex items-center gap-2.5 rounded-hub-lg border border-espresso/[0.07] bg-paper-warm px-2.5 py-2`}
        >
          <span className="font-mono text-[0.75rem] font-bold tabular-nums text-espresso">
            {row.at}
          </span>
          <span className="min-w-0 truncate text-[0.75rem] text-espresso/55">
            {row.what}
          </span>
          <Check className="ms-auto h-3.5 w-3.5 shrink-0 text-hub-success" strokeWidth={3} />
        </div>
      ))}
    </Scene>
  );
}

/** 4 — who answered first. */
function RaceScene({ t }: { t: Scenes }) {
  return (
    <Scene className="justify-center gap-5">
      <Race
        who={t.raceWinner}
        detail={t.raceWinnerDetail}
        fill="fx-fill-fast"
        color="#1fa971"
      />
      <Race
        who={t.raceLoser}
        detail={<TypingDots t={t} />}
        fill="fx-fill-slow"
        color="rgba(42,29,20,0.22)"
      />
    </Scene>
  );
}

/** 5 — the reminder going out, the seat being held. */
function ReminderScene({ t }: { t: Scenes }) {
  return (
    <Scene className="justify-center">
      {/* Both beats share one grid cell so the card never reflows mid-loop. */}
      <div className="grid">
        <div className="fx-send col-start-1 row-start-1 self-center">
          <div className="flex items-start gap-2 rounded-2xl rounded-ss-md border border-espresso/[0.07] bg-paper-warm px-3 py-2.5">
            <MessageCircle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cinnamon"
              strokeWidth={2.4}
            />
            <p className="text-[0.75rem] leading-snug text-espresso/70">
              {t.reminderBefore}{" "}
              <span className="font-bold text-espresso">{t.reminderKey}</span>{" "}
              {t.reminderAfter}
            </p>
          </div>
        </div>
        <div className="fx-confirm col-start-1 row-start-1 flex items-center justify-center self-center">
          <span className="inline-flex items-center gap-2 rounded-pill bg-hub-success/12 px-3.5 py-2 text-[0.8125rem] font-bold text-hub-success">
            <Check className="h-4 w-4" strokeWidth={3} />
            {t.confirmed}
          </span>
        </div>
      </div>
    </Scene>
  );
}

/** 6 — reviews arriving without being chased. */
function ReviewScene({ t }: { t: Scenes }) {
  return (
    <Scene className="justify-center">
      <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-espresso/40">
        {t.askedAfter}
      </p>
      <div className="space-y-2">
        {[t.reviewers.a, t.reviewers.b, t.reviewers.c].map((name, i) => (
          <div
            key={name}
            className={`fx-row ${DELAY[i]} flex items-center gap-2.5 rounded-hub-lg border border-espresso/[0.07] bg-paper-warm px-2.5 py-2`}
          >
            <span className="min-w-0 flex-1 truncate text-[0.75rem] text-espresso/60">
              {name}
            </span>
            <span className="flex shrink-0 gap-0.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((s) => (
                <Star key={s} className="h-2.5 w-2.5 fill-current text-book" strokeWidth={0} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </Scene>
  );
}

/* ── The six ──────────────────────────────────────────────────── */

const CARDS: Card[] = [
  {
    id: "search",
    value: "76%",
    href: "https://www.thinkwithgoogle.com/consumer-insights/consumer-trends/mobile-search-trends-consumers-to-stores/",
    glow: "#2d6cf0",
    Scene: SearchScene,
  },
  {
    id: "pick",
    value: "94%",
    href: "https://www.getapp.com/resources/research-online-booking-importance-of-appointment-scheduling/",
    glow: "#e8920a",
    Scene: PickScene,
  },
  {
    id: "afterHours",
    value: "50%",
    glow: "#d4622a",
    Scene: AfterHoursScene,
  },
  {
    id: "race",
    value: "85%",
    href: "https://oncallclerk.com/blog/why-callers-dont-leave-voicemail",
    glow: "#1fa971",
    Scene: RaceScene,
  },
  {
    id: "reminder",
    value: "25%",
    href: "https://pubmed.ncbi.nlm.nih.gov/20569761/",
    glow: "#7c5cfc",
    Scene: ReminderScene,
  },
  {
    id: "review",
    value: "9 in 10",
    href: "https://www.brightlocal.com/research/local-consumer-review-survey/",
    glow: "#d4a017",
    Scene: ReviewScene,
  },
];

/* ── Section ──────────────────────────────────────────────────── */

/** How much vertical scroll one card's worth of sideways travel costs. */
const SCROLL_PER_CARD = 62; // vh

export function Proof({ locale = "en" }: { locale?: Locale }) {
  const t = getDict(locale).proof;
  /**
   * Which way the rail travels. In a right-to-left document the flex row lays
   * out from the container's right edge and the overflow hangs off the LEFT,
   * so translating negatively — correct in English — pushed the unseen cards
   * further out of view and the Hebrew page had four cards that could never be
   * reached. The distance is the same; only the sign moves.
   */
  const railSign = dirFor(locale) === "rtl" ? 1 : -1;
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  /**
   * Server renders the plain rail. Pinning is switched on afterwards, and only
   * where it belongs: a hijacked scroll on a phone is how a section becomes
   * impossible to get past.
   */
  const pinned = usePinned();

  useSectionProgress(section, pinned, (p) => {
    const tr = track.current;
    if (!tr) return;
    // The track has to end with its last card flush against the end gutter,
    // not scrolled a card too far: measure rather than assume a card width.
    const travel = Math.max(0, tr.scrollWidth - tr.clientWidth);
    tr.style.transform = `translate3d(${railSign * p * travel}px, 0, 0)`;
  });

  /**
   * The unpinned rail is a real scroll container, and a right-to-left one
   * scrolls into NEGATIVE scrollLeft — so "next" is the same button but the
   * opposite delta. Without the sign, the arrows on the Hebrew page moved the
   * rail in the direction the reader had just come from.
   */
  function nudge(dir: 1 | -1) {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: -railSign * dir * (el.clientWidth * 0.8), behavior: "smooth" });
  }

  const header = (
    /* `w-full` is load-bearing in the pinned branch. The sticky box is a flex
       column, and an item with `mx-auto` opts out of stretch: without a width
       the header shrank to its own longest line and centred on THAT, landing
       217px right of the closing line under it and off the page grid entirely.
       In the unpinned branch it is a plain block and never had the problem,
       which is why it survived this long. */
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Reveal>
        <div className="max-w-2xl">
          <Eyebrow dot="#d64545">{t.eyebrow}</Eyebrow>
          <TwoTone lead={t.lead} trail={t.trail} className="mt-2 sm:mt-3" />
          <Lede className="mt-2.5 text-[0.9375rem] leading-snug sm:mt-4 sm:text-lg sm:leading-relaxed">
            {t.ledeBefore} <Key>{t.ledeKey}</Key>.
          </Lede>
          {/* Said once, in the section header, rather than hedged on six cards.
              A visitor who thinks these percentages are OUR results reads the
              whole rail as a boast; they are other people's research and the
              argument is stronger when that is stated outright. */}
          <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-espresso/40 sm:mt-3 sm:text-[0.6875rem] sm:tracking-[0.14em]">
            {t.attribution}
          </p>
        </div>
      </Reveal>
    </div>
  );

  const cards = CARDS.map((card) => (
    <ProofCard key={card.id} card={card} t={t} />
  ));

  /**
   * The closing line has to live INSIDE whichever branch is rendering, not
   * after the section's children.
   *
   * When the section is pinned it is several screens tall and its only visible
   * child is a `sticky` box. Anything placed after that box is laid out at the
   * true bottom of the section, so it sat under the pinned cards for the whole
   * scroll and then shoved the page as the pin released — which is exactly the
   * "it moves the page and disappears behind the cards" behaviour. In the
   * pinned branch it belongs in the sticky box, under the rail.
   */
  const closer = (
    <p className="text-[0.9375rem] leading-relaxed text-espresso/50">
      <span className="font-bold text-espresso">{t.closerBold}</span>{" "}
      <a
        href="#connect"
        className="font-semibold text-espresso underline decoration-espresso/25 underline-offset-4 transition-colors hover:decoration-espresso/70"
      >
        {t.closerLink}
      </a>
      .
    </p>
  );

  return (
    <section
      id="problem"
      ref={section}
      className="wash-clay relative"
      style={
        pinned
          ? { height: `${100 + SCROLL_PER_CARD * (CARDS.length - 1)}vh` }
          : undefined
      }
    >
      {pinned ? (
        /* `overflow-x-hidden` only, not `-hidden`: a card taller than this
           box's `h-full` share (a real laptop window, not just a phone —
           26rem of card plus the header text is taller than a lot of actual
           browser chrome-minus-nav budgets) used to have its top and bottom
           sliced off by `justify-center` inside a vertically clipped box. The
           rail still needs its sideways bleed hidden; the card no longer needs
           to fit inside a box shorter than its own minimum height. `start`,
           not `center`, so any remaining overflow runs off the bottom, not up
           under the fixed nav. */
        <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col justify-start overflow-x-hidden py-8">
          {header}
          <PauseOffscreen className="mt-7 min-h-0 flex-1">
            {/* No overflow scrolling here: the transform IS the scroll. The end
                padding matches the start gutter so the last card lands where
                the headline starts rather than jammed against the edge. */}
            <div className="h-full overflow-x-hidden">
              <div
                ref={track}
                className="rail-inset flex h-full gap-5 will-change-transform"
              >
                {cards}
                <div className="w-px shrink-0" aria-hidden="true" />
              </div>
            </div>
          </PauseOffscreen>
          <div className="mx-auto mt-5 w-full max-w-6xl shrink-0 px-5 sm:px-8">
            {closer}
          </div>
        </div>
      ) : (
        <div className="py-14 sm:py-20">
          {header}
          <div className="mx-auto mt-6 max-w-6xl px-5 sm:px-8">
            <div className="hidden gap-2 sm:flex">
              {([-1, 1] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => nudge(dir)}
                  aria-label={dir === -1 ? t.prev : t.next}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-espresso/15 text-espresso/60 transition-colors hover:bg-espresso/[0.05] hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinnamon/50"
                >
                  {dir === -1 ? (
                    <ChevronLeft className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <PauseOffscreen>
            <div
              ref={rail}
              className="rail rail-inset mt-6 flex gap-4 overflow-x-auto pb-3 sm:mt-8 sm:gap-5 sm:pb-4"
            >
              {cards}
              <div className="w-px shrink-0" aria-hidden="true" />
            </div>
          </PauseOffscreen>
          <div className="mx-auto mt-8 max-w-6xl px-5 sm:px-8">
            <Reveal>{closer}</Reveal>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Card ─────────────────────────────────────────────────────── */

function ProofCard({ card, t }: { card: Card; t: Dict["proof"] }) {
  const { Scene: CardScene } = card;
  const copy = t.cards[card.id];
  return (
    <article
      className="lift flex h-full min-h-[26rem] w-[min(84vw,20rem)] shrink-0 flex-col rounded-3xl border p-5 sm:w-[22rem] sm:p-7"
      style={{
        borderColor: `${card.glow}33`,
        background: `linear-gradient(165deg, ${card.glow}12, #FDFBF7 42%)`,
        boxShadow: `0 1px 0 ${card.glow}22 inset, 0 14px 40px -22px rgba(60,34,12,0.28)`,
      }}
    >
      {/* `shrink-0`: at the pinned box's `h-full` (viewport-height-derived), a
          short window can hand this card less room than the heading's own two
          lines need. Flex items shrink below content size by default, and text
          isn't clipped when that happens — it just overflows downward into the
          Scene below. Pin the heading to its content height and let the card
          grow past `h-full` instead of the two silently overlapping. */}
      <h3 className="shrink-0 text-[1.0625rem] font-bold leading-snug tracking-[-0.02em] text-balance text-espresso sm:text-[1.1875rem]">
        {copy.problem}
      </h3>

      <CardScene t={t.scenes} />

      <div className="mt-4 border-t border-espresso/[0.08] pt-3.5">
        <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-espresso sm:text-[2.5rem]">
          {card.value}
        </p>
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-espresso/55">
          {copy.label}
        </p>
        <Citation
          prefix={t.sourcePrefix}
          source={copy.source}
          href={card.href}
        />
      </div>
    </article>
  );
}

/**
 * The attribution, on its own line under the figure.
 *
 * A link where the study has a page anyone can open, plain text where it does
 * not — the Boulevard figure is quoted everywhere and traceable nowhere, and
 * pointing at a homepage that does not carry it would be worse than printing
 * the name alone.
 */
function Citation({
  prefix,
  source,
  href,
}: {
  prefix: string;
  source: string;
  href?: string;
}) {
  /* `after` extends the tappable box to 39px without moving the type: a
     15px-tall link is a real target on a rail you swipe through with a thumb,
     and padding the link instead would push the card past its min height. */
  const base =
    "mt-2.5 inline-flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-espresso/35";
  const hit =
    "relative after:absolute after:inset-x-0 after:-inset-y-3 after:content-['']";
  if (!href)
    return (
      <p className={base}>
        {prefix} · {source}
      </p>
    );
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener nofollow"
      className={`${base} ${hit} underline decoration-espresso/20 underline-offset-4 transition-colors hover:text-espresso/70 hover:decoration-espresso/50`}
    >
      {prefix} · {source}
      <ArrowUpRight className="h-3 w-3 shrink-0" strokeWidth={2.4} />
    </a>
  );
}

/**
 * The stage a card's clip plays on. Recessed rather than raised — the loop is
 * evidence sitting inside the card, not a second card on top of it.
 */
function Scene({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-4 flex min-h-0 flex-1 flex-col rounded-2xl border border-espresso/[0.06] bg-espresso/[0.025] p-3 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/** One competitor in the who-replied-first clip. */
function Race({
  who,
  detail,
  fill,
  color,
}: {
  who: string;
  detail: React.ReactNode;
  fill: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.75rem] font-bold text-espresso">{who}</span>
        <span className="text-[0.6875rem] text-espresso/45">{detail}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-espresso/[0.07]">
        <div className={`${fill} h-full w-full rounded-full`} style={{ background: color }} />
      </div>
    </div>
  );
}

function TypingDots({ t }: { t: Scenes }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={t.raceWaiting}>
      {t.raceLoserDetail}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="fx-dot inline-block h-1 w-1 rounded-full bg-espresso/45"
          /* Inline, not the fx-d* classes: those are tuned to the 6.4s card
             cycle and would put a visible gap between the three dots. */
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
