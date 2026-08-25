"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Scissors,
  BedDouble,
  Stethoscope,
  UtensilsCrossed,
  MessageCircle,
  CreditCard,
  Search,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/hub/reveal";
import { TwoTone, Lede, Eyebrow } from "@/components/hub/ui/type";
import { SiteMock } from "@/components/marketing/site-mock";
import { AUDIENCES, type AudienceId } from "@/lib/marketing/audiences";
import {
  useInView,
  usePinned,
  useSectionProgress,
} from "@/lib/marketing/motion-hooks";
import { useCalmMotion } from "@/lib/hub/motion";
import { cn } from "@/lib/hub/cn";

/**
 * "Three layers. One system." — three cards side by side, and the scroll runs
 * all three of them.
 *
 * The shipped page put the three layers in a row and described them. The first
 * v3 port stacked them as alternating rows and described them better. This does
 * neither: three equal cards IS the shape of "three layers, one system", and
 * each card demonstrates its layer instead of captioning it.
 *
 * ── The scroll is the demo ──
 *
 * On a laptop the section pins and vertical scroll drives every surface at
 * once: the booking site changes business, the dashboard's figures climb and
 * its funnel bars grow, and the add-ons switch themselves on one at a time
 * while the monthly figure follows. Scroll back and all of it runs backwards.
 * Reach the end and the pin releases into the next section.
 *
 * Every step still works by hand — the tabs are tabs, the switches are switches
 * — and a tap holds until scroll crosses the next threshold, so taking one over
 * never fights the page.
 *
 * Below 1024px, and on the calm motion tier, none of that happens: the section
 * is a normal stack of three cards, the site cycles on a timer, the figures
 * count up once when the card comes into view, and the switches stand where
 * they are. That is also what the server renders, so the fallback is what
 * arrives before hydration rather than a special case bolted on after.
 *
 * ── Why the first card is wider ──
 *
 * It carries the argument the retired "Who it's for" section used to make on
 * its own: same product, four kinds of business. A visitor watching the mock
 * become a salon, a rental, a clinic and a restaurant needs to be able to read
 * it, so it gets 1.28 of the three columns and the other two split the rest.
 */

/** How tall the pinned section is, in vh. The excess over 100 is the scrub. */
const PIN_VH = 260;
/** Card height when the section is NOT pinned. */
const CARD_H = "h-[34rem]";

/* ── Scroll choreography ──────────────────────────────────────── */

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Tabs: four steps, ending well before the pin releases. */
const TAB_FROM = 0.06;
const TAB_SPAN = 0.56;
/** Figures: climb early, so the dashboard has landed before the eye reaches it. */
const COUNT_FROM = 0.06;
const COUNT_SPAN = 0.42;
/** Switches: one flips at each of these, in order. */
const SWITCH_AT = [0.34, 0.5, 0.66];

/* ── Card shell ───────────────────────────────────────────────── */

function BuildCard({
  tag,
  accent,
  title,
  body,
  stageRef,
  pinned,
  children,
}: {
  tag: string;
  accent: string;
  title: string;
  body: string;
  stageRef: RefObject<HTMLDivElement | null>;
  pinned: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "lift mx-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-3xl border bg-chip lg:max-w-none",
        pinned ? "h-full" : CARD_H,
      )}
      style={{
        borderColor: `${accent}2e`,
        boxShadow: `0 1px 0 ${accent}1f inset, 0 22px 60px -34px rgba(60,34,12,0.42)`,
      }}
    >
      <div className="shrink-0 px-5 pb-3.5 pt-4">
        <span
          className="inline-flex w-fit items-center gap-2 rounded-pill px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em]"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
          {tag}
        </span>
        <h3 className="mt-2.5 text-[1.3125rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-espresso">
          {title}
        </h3>
        <p className="mt-1.5 text-[0.8125rem] leading-[1.5] text-espresso/55">
          {body}
        </p>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-t border-hairline p-4"
        style={{
          background: `radial-gradient(120% 80% at 50% -12%, ${accent}20 0%, transparent 60%), linear-gradient(170deg, #F3F1EA 0%, #ECEAE1 100%)`,
        }}
      >
        {children}
      </div>
    </article>
  );
}

/* ── 1 · Booking website ──────────────────────────────────────── */

const AUDIENCE_ICON: Record<AudienceId, LucideIcon> = {
  salons: Scissors,
  properties: BedDouble,
  clinics: Stethoscope,
  restaurants: UtensilsCrossed,
};

const SITE_MS = 5200;

function SiteCard({
  sectionRef,
  pinned,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  pinned: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const calm = useCalmMotion();
  const visible = useInView(stage, { once: false, rootMargin: "0px" });

  const [index, setIndex] = useState(0);
  const [ticking, setTicking] = useState(true);
  /** Last step the scroll put us on, so a manual tap is not stamped over on
   *  the very next frame — only when the scroll actually moves on. */
  const scrollStep = useRef(-1);

  useEffect(() => {
    if (pinned || !ticking || calm || !visible) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % AUDIENCES.length),
      SITE_MS,
    );
    return () => window.clearInterval(id);
  }, [pinned, ticking, calm, visible]);

  useSectionProgress(sectionRef, pinned, (p) => {
    const step = Math.min(
      AUDIENCES.length - 1,
      Math.max(0, Math.floor(((p - TAB_FROM) / TAB_SPAN) * AUDIENCES.length)),
    );
    if (step !== scrollStep.current) {
      scrollStep.current = step;
      setIndex(step);
    }
  });

  const select = (i: number) => {
    setTicking(false);
    setIndex(i);
  };

  const audience = AUDIENCES[index];
  const running = !pinned && ticking && !calm && visible;

  return (
    <BuildCard
      tag="The product"
      accent="#e8920a"
      title="Booking Website"
      body="Clients see your services, your real openings, and book instantly, any hour of the day. Salon, rental, clinic or restaurant, it takes your shape."
      stageRef={stage}
      pinned={pinned}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Kind of business"
          className="flex gap-1 rounded-pill bg-espresso/[0.05] p-1"
        >
          {AUDIENCES.map((a, i) => {
            const Icon = AUDIENCE_ICON[a.id];
            const on = i === index;
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={a.label}
                onClick={() => select(i)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-pill transition-colors duration-200",
                  on ? "text-white" : "text-espresso/40 hover:text-espresso/70",
                )}
                style={on ? { background: a.accent } : undefined}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            );
          })}
        </div>
        <p
          className="min-w-0 truncate text-end text-[0.6875rem] font-bold uppercase tracking-[0.12em]"
          style={{ color: audience.accent }}
        >
          {audience.label}
        </p>
      </div>

      <StepRail
        count={AUDIENCES.length}
        index={index}
        accent={audience.accent}
        timed={running}
        ms={SITE_MS}
      />

      {/* key remounts on switch so the fade plays, and so the mock never shows
          one audience's services above another's date strip mid-swap. Two
          services rather than three: the stage is a fixed budget, and the third
          row is what used to push the "book" button out of the card. */}
      <div className="mt-2.5 flex min-h-0 flex-1 items-start">
        <div
          key={audience.id}
          className="w-full"
          style={{ animation: "fadeIn 420ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          <SiteMock
            audience={{ ...audience, items: audience.items.slice(0, 2) }}
            dense
          />
        </div>
      </div>
    </BuildCard>
  );
}

/**
 * The line under a self-driving control row.
 *
 * Two jobs, one device. When a timer is running it fills once per step, so the
 * reader can see how long they have. When the scroll is driving it becomes
 * segments — a filling bar would be claiming a pace the reader is setting.
 */
function StepRail({
  count,
  index,
  accent,
  timed,
  ms,
}: {
  count: number;
  index: number;
  accent: string;
  timed: boolean;
  ms: number;
}) {
  if (timed) {
    return (
      <span
        aria-hidden="true"
        className="mt-2 block h-px w-full shrink-0 overflow-hidden bg-espresso/[0.08]"
      >
        <span
          key={index}
          className="block h-full origin-left"
          style={{ background: accent, animation: `cycle-fill ${ms}ms linear both` }}
        />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="mt-2 flex w-full shrink-0 gap-1">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="h-px flex-1 rounded-pill transition-colors duration-300"
          style={{ background: i <= index ? accent : "rgba(42,29,20,0.10)" }}
        />
      ))}
    </span>
  );
}

/* ── 2 · Owner dashboard ──────────────────────────────────────── */

const SHEKELS = (n: number) => `₪${Math.round(n).toLocaleString("en-US")}`;
const WHOLE = (n: number) => String(Math.round(n));

const REVENUE = 2400;
const FUNNEL = [
  { label: "visitors", value: 214, pct: 100 },
  { label: "started", value: 68, pct: 32 },
  { label: "booked", value: 41, pct: 19 },
];

function DashboardCard({
  sectionRef,
  pinned,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  pinned: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const calm = useCalmMotion();
  const live = useInView(stage);

  const revenue = useRef<HTMLSpanElement>(null);
  const booked = useRef<HTMLSpanElement>(null);
  const counts = useRef<(HTMLSpanElement | null)[]>([]);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  /**
   * One writer for every figure on the card, driven either by the scroll or by
   * a one shot count up. Straight to the DOM: this runs per frame, and the
   * final numbers are what sits in the markup, so a reader whose JS never runs
   * still sees ₪2,400 rather than ₪0.
   */
  const paint = useCallback((t: number) => {
    if (revenue.current) revenue.current.textContent = SHEKELS(REVENUE * t);
    if (booked.current) booked.current.textContent = WHOLE(FUNNEL[2].value * t);
    FUNNEL.forEach((row, i) => {
      const c = counts.current[i];
      if (c) c.textContent = WHOLE(row.value * t);
      const b = bars.current[i];
      // Each bar trails the one above it, so the funnel reads top to bottom.
      if (b) b.style.width = `${row.pct * clamp01((t - i * 0.12) / 0.7)}%`;
    });
  }, []);

  useSectionProgress(sectionRef, pinned, (p) => {
    const t = clamp01((p - COUNT_FROM) / COUNT_SPAN);
    // easeOutCubic: the figures land rather than arriving at constant speed.
    paint(1 - Math.pow(1 - t, 3));
  });

  useEffect(() => {
    if (pinned) return;
    if (calm || !live) {
      if (calm) paint(1);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 1500);
      paint(t === 1 ? 1 : 1 - Math.pow(2, -9 * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pinned, calm, live, paint]);

  return (
    <BuildCard
      tag="Included free"
      accent="#d4622a"
      title="Owner Dashboard"
      body="Your whole week in one place: who visited, where they came from, and how many turned into bookings. Prefer pen and paper? Every booking still reaches your phone."
      stageRef={stage}
      pinned={pinned}
    >
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-espresso/[0.07] bg-white p-4 shadow-[0_18px_44px_-28px_rgba(60,34,12,0.35)]">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-espresso/35">
          This week
        </p>

        <div className="mt-2 flex items-baseline gap-4">
          <span>
            <span
              ref={revenue}
              className="text-[1.625rem] font-extrabold tracking-[-0.04em] tabular-nums text-espresso"
            >
              ₪2,400
            </span>
            <span className="ms-1.5 text-[0.6875rem] text-espresso/40">revenue</span>
          </span>
          <span>
            <span
              ref={booked}
              className="text-[1.625rem] font-extrabold tracking-[-0.04em] tabular-nums text-espresso"
            >
              41
            </span>
            <span className="ms-1.5 text-[0.6875rem] text-espresso/40">booked</span>
          </span>
        </div>

        <span className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-pill bg-hub-success/12 px-2 py-1 text-[0.625rem] font-bold text-hub-success">
          <TrendingUp className="h-3 w-3" strokeWidth={2.6} />0 no shows this week
        </span>

        <p className="mt-4 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-espresso/35">
          Who visited
        </p>
        <div className="mt-2.5 flex flex-col gap-2.5">
          {FUNNEL.map((row, i) => (
            <div key={row.label} className="flex items-center gap-3">
              <span
                ref={(el) => {
                  counts.current[i] = el;
                }}
                className="w-9 shrink-0 font-mono text-[0.6875rem] font-bold tabular-nums text-espresso"
              >
                {row.value}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-espresso/[0.06]">
                <span
                  ref={(el) => {
                    bars.current[i] = el;
                  }}
                  className="block h-full rounded-pill bg-book"
                  style={{ width: `${row.pct}%` }}
                />
              </span>
              <span className="w-12 shrink-0 text-end text-[0.625rem] text-espresso/40">
                {row.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {["Instagram 46%", "Google 31%", "Direct 23%"].map((s) => (
            <span
              key={s}
              className="rounded-pill bg-espresso/[0.05] px-2.5 py-1 text-[0.625rem] font-semibold text-espresso/50"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </BuildCard>
  );
}

/* ── 3 · Add ons ──────────────────────────────────────────────── */

const SWITCHES = [
  {
    id: "whatsapp",
    name: "WhatsApp reminders",
    icon: MessageCircle,
    accent: "#1fa971",
    on: "Sending before every booking",
    off: "Clients remember on their own",
  },
  {
    id: "payments",
    name: "Online payments",
    icon: CreditCard,
    accent: "#e8920a",
    on: "Deposit taken at booking",
    off: "You collect on the day",
  },
  {
    id: "seo",
    name: "SEO",
    icon: Search,
    accent: "#2d6cf0",
    on: "Tuned every month to rank near you",
    off: "Found only by people who know you",
  },
] as const;

function AddonsCard({
  sectionRef,
  pinned,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  pinned: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  /**
   * Only ids the reader or the scroll has actually set. The resting value for
   * anything absent is derived, not stored: pinned opens empty and fills as you
   * scroll, unpinned opens full, because there is nothing to fill it with and a
   * panel of dead switches sells nothing.
   */
  const [state, setState] = useState<Record<string, boolean>>({});
  const scrollCount = useRef(-1);
  const restingOn = !pinned;
  const isOn = (id: string) => state[id] ?? restingOn;

  useSectionProgress(sectionRef, pinned, (p) => {
    const n = SWITCH_AT.filter((at) => p >= at).length;
    if (n !== scrollCount.current) {
      scrollCount.current = n;
      setState(Object.fromEntries(SWITCHES.map((s, i) => [s.id, i < n])));
    }
  });

  const toggle = (id: string) =>
    setState((cur) => ({ ...cur, [id]: !(cur[id] ?? restingOn) }));

  const count = SWITCHES.reduce((n, s) => n + (isOn(s.id) ? 1 : 0), 0);

  return (
    <BuildCard
      tag="Grow when ready"
      accent="#7c5cfc"
      title="Add ons"
      body="Reminders, payments, reviews, SEO. Layer in what you need, when you need it. Everything runs itself, ₪200 a month each."
      stageRef={stage}
      pinned={pinned}
    >
      <p className="shrink-0 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-espresso/35">
        Switch on when you are ready
      </p>

      <div className="mt-2.5 flex flex-col gap-2.5">
        {SWITCHES.map((s) => {
          const active = isOn(s.id);
          return (
            <button
              key={s.id}
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => toggle(s.id)}
              className="flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-2.5 text-start transition-colors duration-300"
              style={{
                borderColor: active ? `${s.accent}4d` : "rgba(42,29,20,0.08)",
                boxShadow: active
                  ? `0 1px 0 ${s.accent}1f inset, 0 12px 30px -22px ${s.accent}99`
                  : "0 1px 2px rgba(60,34,12,0.04)",
              }}
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-hub-lg transition-colors duration-300"
                style={{
                  background: active ? `${s.accent}1f` : "rgba(42,29,20,0.05)",
                  color: active ? s.accent : "rgba(42,29,20,0.3)",
                }}
              >
                <s.icon className="h-4 w-4" strokeWidth={2.3} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-bold text-espresso">
                  {s.name}
                </span>
                <span
                  className={cn(
                    "block truncate text-[0.6875rem] transition-colors duration-300",
                    active ? "text-espresso/50" : "text-espresso/30",
                  )}
                >
                  {active ? s.on : s.off}
                </span>
              </span>

              <span
                aria-hidden="true"
                className="relative h-5 w-9 shrink-0 rounded-pill transition-colors duration-300"
                style={{ background: active ? s.accent : "rgba(42,29,20,0.14)" }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-[inset-inline-start] duration-300 ease-out"
                  style={{ insetInlineStart: active ? "1.125rem" : "0.125rem" }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto rounded-2xl border border-espresso/[0.07] bg-white/70 px-4 py-3">
        <p className="text-[0.75rem] font-bold text-espresso">
          {count === 0 ? (
            "Just the booking website"
          ) : (
            <>
              {count} add on{count > 1 ? "s" : ""} running ·{" "}
              <span key={count} className="count-pop inline-block">
                ₪{count * 200}
              </span>{" "}
              a month
            </>
          )}
        </p>
        <p className="mt-1 text-[0.6875rem] leading-snug text-espresso/45">
          {count === 0
            ? "Which is a complete business on its own. Add the rest when it pays for itself."
            : "Switched on by us. Nothing to install, nothing to learn."}
        </p>
      </div>
    </BuildCard>
  );
}

/* ── Section ──────────────────────────────────────────────────── */

export function WhatWeBuild() {
  const section = useRef<HTMLElement>(null);
  const pinned = usePinned();

  const header = (
    <Reveal>
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow className="justify-center" dot="#e8920a">
          What we build for you
        </Eyebrow>
        <TwoTone size="sm" lead="Three layers." trail="One system." className="mt-2" />
        <Lede className="mx-auto mt-2 text-[0.9375rem] leading-snug sm:text-base">
          We build and maintain your entire online presence. You just show up and
          do your job.
        </Lede>
      </div>
    </Reveal>
  );

  const cards = (
    <div
      className={cn(
        "grid gap-5 lg:grid-cols-[1.28fr_1fr_1fr]",
        pinned && "h-full min-h-0",
      )}
    >
      <SiteCard sectionRef={section} pinned={pinned} />
      <DashboardCard sectionRef={section} pinned={pinned} />
      <AddonsCard sectionRef={section} pinned={pinned} />
    </div>
  );

  return (
    <section
      id="product"
      ref={section}
      className="wash-clay relative"
      style={pinned ? { height: `${PIN_VH}vh` } : undefined}
    >
      {pinned ? (
        <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden px-5 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-7xl">{header}</div>
          <div className="mx-auto mt-5 min-h-0 w-full max-w-7xl flex-1">
            {cards}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          {header}
          <Reveal delay={80}>
            <div className="mt-8 sm:mt-10">{cards}</div>
          </Reveal>
        </div>
      )}
    </section>
  );
}
