"use client";

import { useRef } from "react";
import {
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

type Card = {
  /** The thing that is going wrong. */
  problem: string;
  value: string;
  label: string;
  source: string;
  glow: string;
  Scene: () => React.ReactElement;
};

/* ── Scenes ───────────────────────────────────────────────────── */

/** Stagger classes, in order. Defined in globals.css after the loop classes. */
const DELAY = ["", "fx-d1", "fx-d2", "fx-d3"] as const;

/** 1 — the search that ends somewhere else. */
function SearchScene() {
  const results = [
    { name: "The place two streets over", meta: "★★★★★ 4.9 · Open now" },
    { name: "The one with 200 reviews", meta: "★★★★☆ 4.7 · 0.4 km" },
  ];
  return (
    <Scene className="justify-center gap-2">
      <p className="mb-1 flex items-center gap-1.5 rounded-hub-lg border border-espresso/[0.07] bg-paper-warm px-2.5 py-2 font-mono text-[0.6875rem] text-espresso/50">
        <Search className="h-3 w-3 shrink-0" strokeWidth={2.4} />
        book near me
      </p>
      {results.map((r, i) => (
        <div
          key={r.name}
          className={`fx-row ${DELAY[i]} rounded-hub-lg border border-espresso/[0.07] bg-paper-warm px-2.5 py-2`}
        >
          <p className="truncate text-[0.75rem] font-semibold text-espresso">{r.name}</p>
          <p className="mt-0.5 text-[0.6875rem] text-espresso/40">{r.meta}</p>
        </div>
      ))}
      <div className="fx-row fx-d2 rounded-hub-lg border border-dashed border-hub-danger/40 bg-hub-danger/[0.05] px-2.5 py-2.5 text-center">
        <p className="text-[0.75rem] font-bold text-hub-danger">You are not here</p>
      </div>
    </Scene>
  );
}

/** 2 — same street, two businesses, one of them bookable. */
function PickScene() {
  return (
    <Scene className="justify-center gap-2.5">
      <p className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-espresso/40">
        Same street, two businesses
      </p>
      <div className="fx-row flex items-center gap-2.5 rounded-hub-lg border border-cinnamon/30 bg-paper-warm px-2.5 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[0.75rem] font-bold text-espresso">
          Books online
        </span>
        <span className="fx-bob rounded-pill bg-hub-success/12 px-2 py-0.5 text-[0.6875rem] font-bold text-hub-success">
          Booked
        </span>
      </div>
      <div className="fx-row fx-d2 flex items-center gap-2.5 rounded-hub-lg border border-espresso/[0.07] px-2.5 py-2.5 opacity-60">
        <PhoneOff className="h-3.5 w-3.5 shrink-0 text-espresso/35" strokeWidth={2.4} />
        <span className="min-w-0 flex-1 truncate text-[0.75rem] text-espresso/55">
          Call during opening hours
        </span>
      </div>
    </Scene>
  );
}

/** 3 — the bookings that land while the lights are off. One of each kind of
 *  business, because all four of them close and all four of them keep taking
 *  bookings after they do. */
function AfterHoursScene() {
  const rows = [
    { t: "21:40", s: "Appointment · ₪180" },
    { t: "23:15", s: "Two nights · ₪1,300" },
    { t: "02:07", s: "Table for four" },
  ];
  return (
    <Scene className="justify-center gap-2">
      <p className="mb-1 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-espresso/40">
        <Clock className="h-3 w-3" strokeWidth={2.4} />
        Closed at 19:00
      </p>
      {rows.map((row, i) => (
        <div
          key={row.t}
          className={`fx-row ${DELAY[i]} flex items-center gap-2.5 rounded-hub-lg border border-espresso/[0.07] bg-paper-warm px-2.5 py-2`}
        >
          <span className="font-mono text-[0.75rem] font-bold tabular-nums text-espresso">
            {row.t}
          </span>
          <span className="min-w-0 truncate text-[0.75rem] text-espresso/55">{row.s}</span>
          <Check className="ms-auto h-3.5 w-3.5 shrink-0 text-hub-success" strokeWidth={3} />
        </div>
      ))}
    </Scene>
  );
}

/** 4 — who answered first. */
function RaceScene() {
  return (
    <Scene className="justify-center gap-5">
      <Race
        who="Your booking page"
        detail="took it at 23:14"
        fill="fx-fill-fast"
        color="#1fa971"
      />
      <Race
        who="A missed message"
        detail={<TypingDots />}
        fill="fx-fill-slow"
        color="rgba(42,29,20,0.22)"
      />
    </Scene>
  );
}

/** 5 — the reminder going out, the seat being held. */
function ReminderScene() {
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
              Hi Dana, you are booked for tomorrow at 16:00. Reply{" "}
              <span className="font-bold text-espresso">1</span> to confirm.
            </p>
          </div>
        </div>
        <div className="fx-confirm col-start-1 row-start-1 flex items-center justify-center self-center">
          <span className="inline-flex items-center gap-2 rounded-pill bg-hub-success/12 px-3.5 py-2 text-[0.8125rem] font-bold text-hub-success">
            <Check className="h-4 w-4" strokeWidth={3} />
            Confirmed. Slot held
          </span>
        </div>
      </div>
    </Scene>
  );
}

/** 6 — reviews arriving without being chased. */
function ReviewScene() {
  return (
    <Scene className="justify-center">
      <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-espresso/40">
        Asked after every visit
      </p>
      <div className="space-y-2">
        {["Dana M.", "Yossi K.", "Noa L."].map((name, i) => (
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
    problem: "Someone nearby just looked for what you do.",
    value: "76%",
    label: "who search near me visit a business within 24 hours",
    source: "Think with Google",
    glow: "#2d6cf0",
    Scene: SearchScene,
  },
  {
    problem: "They pick whoever they can book right now.",
    value: "94%",
    label: "more likely to pick a business that books online",
    source: "GetApp",
    glow: "#e8920a",
    Scene: PickScene,
  },
  {
    problem: "Half the bookings happen after you have closed.",
    value: "50%",
    label: "of bookings are made while the business is shut",
    source: "Boulevard",
    glow: "#d4622a",
    Scene: AfterHoursScene,
  },
  {
    problem: "A message at 23:14 is a client gone by morning.",
    value: "85%",
    label: "of people who reach voicemail never call back",
    source: "OnCallClerk",
    glow: "#1fa971",
    Scene: RaceScene,
  },
  {
    problem: "No shows quietly take a day out of every week.",
    value: "25%",
    label: "fewer no shows once reminders go out on their own",
    source: "Am. J. of Medicine",
    glow: "#7c5cfc",
    Scene: ReminderScene,
  },
  {
    problem: "They read your reviews before they read your prices.",
    value: "9 in 10",
    label: "read reviews before choosing a local business",
    source: "BrightLocal",
    glow: "#d4a017",
    Scene: ReviewScene,
  },
];

/* ── Section ──────────────────────────────────────────────────── */

/** How much vertical scroll one card's worth of sideways travel costs. */
const SCROLL_PER_CARD = 62; // vh

export function Proof() {
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
    tr.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
  });

  function nudge(dir: 1 | -1) {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  }

  const header = (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <Reveal>
        <div className="max-w-2xl">
          <Eyebrow dot="#d64545">Sound familiar?</Eyebrow>
          <TwoTone
            lead="The real cost of"
            trail="running things manually"
            className="mt-2 sm:mt-3"
          />
          <Lede className="mt-2.5 text-[0.9375rem] leading-snug sm:mt-4 sm:text-lg sm:leading-relaxed">
            These aren&apos;t one off annoyances. They repeat every week, and{" "}
            <Key>every one of them has a number on it</Key>.
          </Lede>
        </div>
      </Reveal>
    </div>
  );

  const cards = CARDS.map((card) => (
    <ProofCard key={card.value + card.source} card={card} />
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
      <span className="font-bold text-espresso">Built by us. Run by you.</span>{" "}
      You know your trade, we know the software.{" "}
      <a
        href="#connect"
        className="font-semibold text-espresso underline decoration-espresso/25 underline-offset-4 transition-colors hover:decoration-espresso/70"
      >
        Let&apos;s fix your problems
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
        <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden py-8">
          {header}
          <PauseOffscreen className="mt-7 min-h-0 flex-1">
            {/* No overflow scrolling here: the transform IS the scroll. The end
                padding matches the start gutter so the last card lands where
                the headline starts rather than jammed against the edge. */}
            <div className="h-full overflow-hidden">
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
                  aria-label={dir === -1 ? "Previous cards" : "Next cards"}
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

function ProofCard({ card }: { card: Card }) {
  const { Scene: CardScene } = card;
  return (
    <article
      className="lift flex h-full min-h-[26rem] w-[min(84vw,20rem)] shrink-0 flex-col rounded-3xl border p-5 sm:w-[22rem] sm:p-7 lg:min-h-0"
      style={{
        borderColor: `${card.glow}33`,
        background: `linear-gradient(165deg, ${card.glow}12, #FDFBF7 42%)`,
        boxShadow: `0 1px 0 ${card.glow}22 inset, 0 14px 40px -22px rgba(60,34,12,0.28)`,
      }}
    >
      <h3 className="text-[1.0625rem] font-bold leading-snug tracking-[-0.02em] text-balance text-espresso sm:text-[1.1875rem]">
        {card.problem}
      </h3>

      <CardScene />

      <div className="mt-4 border-t border-espresso/[0.08] pt-3.5">
        <p className="flex items-baseline gap-2.5">
          <span className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-espresso sm:text-[2.5rem]">
            {card.value}
          </span>
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-espresso/35">
            {card.source}
          </span>
        </p>
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-espresso/55">
          {card.label}
        </p>
      </div>
    </article>
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

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="still waiting">
      unanswered
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
