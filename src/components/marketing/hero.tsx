"use client";

import { useEffect, useRef } from "react";
import {
  Globe,
  LayoutDashboard,
  BellRing,
  MapPin,
  Scissors,
  BedDouble,
  Stethoscope,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Falafel, PitaBowl } from "@/components/hub/ui/pita";
import { Button } from "@/components/hub/ui/button";
import { TwoTone, Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { useMotionTier } from "@/lib/hub/motion";
import { getDict, type Dict, type Locale } from "@/lib/marketing/i18n";

/**
 * The hero IS the metaphor — retargeted.
 *
 * On the suite page the four falafels were the four PRODUCTS, and the pita was
 * the suite that held them. bapita.com sells one product, so the objects have
 * changed while the gesture has not: the falafels are now the four KINDS OF
 * BUSINESS, and the pita is the one system that holds all of them. Scrolling
 * drops the capabilities in first, then the businesses they serve, and the
 * payoff lands once the pita is full.
 *
 * That is the argument the relaunch is making, made physically: whatever you
 * run, it goes in the same pita.
 *
 * Scroll-driven rather than auto-playing, so the reader controls the reveal.
 * Progress is written straight to the DOM inside a rAF tick — React never
 * re-renders on scroll, which keeps ten animated nodes on the compositor.
 *
 * ── One scene, two tiers ──
 *
 * Both motion tiers play the same pinned scene and every object makes the same
 * trip into the pita — that trip IS the section. The tier decides the flourish
 * around it:
 *
 *   full — it falls, accelerating, swinging out on an arc and rotating.
 *   calm — it eases in and settles, no spin and no swing.
 *
 * Same objects, same order, same payoff, and because the scene is pinned to
 * exactly one screen in both tiers it can never overflow a phone.
 */

/**
 * `row` is 0 (upper) or 1 (lower), not a y fraction. See ROW GEOMETRY below.
 * `nudge` is a few px of hand-placed drift so the grid reads as a tableau.
 */
type Base = { rx: number; row: 0 | 1; nudge: number; rot: number; start: number };
type Chit = Base & {
  kind: "chit";
  /** Key into `hero.chits`. The words themselves live in the locale files. */
  id: keyof Dict["hero"]["chits"];
  icon: LucideIcon;
};
type Ball = Base & {
  kind: "ball";
  /** Doubles as the falafel palette id and the key into `hero.balls`. */
  id: keyof Dict["hero"]["balls"];
  icon: LucideIcon;
};
type Obj = Chit | Ball;

/** One diameter, for all four. None of these businesses is an add-on to
 *  another, so nothing here is allowed to look secondary. */
const BALL_SIZE = "clamp(54px, 8vw, 80px)";

/**
 * Resting positions are fractions of the scene box, measured from its centre.
 *
 * ── Why this is a grid and not a scatter ──
 *
 * It used to be ten objects at hand-picked angles, which collided: six chits at
 * |rx| 0.30–0.44 and four falafels at |rx| 0.22–0.25 put a ~130px wide chit and
 * an 80px falafel with a name pill under it inside the same 80px of the scene,
 * so at most viewport widths a tag sat on top of a tag.
 *
 * The fix is a layout with actual clearance rather than better guesses. Two
 * bands, four columns: the falafels hold the inner pair of columns at |rx|
 * 0.15, the chits hold the outer pair at |rx| 0.36. On the narrowest desktop
 * scene that still leaves ~55px between a name pill and the chit beside it.
 * The rows sit at different heights per column so the whole thing reads as a
 * tableau rather than as a spreadsheet.
 *
 * Two chits went with the collision, and the section is better for it: the four
 * that stayed are the four things a visitor is actually buying, and the pita
 * now has air around it.
 */
const OBJECTS: Obj[] = [
  { kind: "chit", id: "site", icon: Globe, rx: -0.36, row: 0, nudge: -4, rot: -7, start: 0.05 },
  { kind: "chit", id: "dashboard", icon: LayoutDashboard, rx: 0.36, row: 0, nudge: 4, rot: 6, start: 0.1 },
  { kind: "chit", id: "reminders", icon: BellRing, rx: -0.36, row: 1, nudge: 5, rot: 5, start: 0.15 },
  { kind: "chit", id: "google", icon: MapPin, rx: 0.36, row: 1, nudge: -3, rot: -5, start: 0.2 },

  { kind: "ball", id: "salon", icon: Scissors, rx: -0.15, row: 0, nudge: -6, rot: 0, start: 0.3 },
  { kind: "ball", id: "clinic", icon: Stethoscope, rx: 0.15, row: 0, nudge: 6, rot: 0, start: 0.38 },
  { kind: "ball", id: "rental", icon: BedDouble, rx: -0.15, row: 1, nudge: -5, rot: 0, start: 0.46 },
  { kind: "ball", id: "restaurant", icon: UtensilsCrossed, rx: 0.15, row: 1, nudge: 5, rot: 0, start: 0.54 },
];

/* ── ROW GEOMETRY ──────────────────────────────────────────────────────────
 *
 * Rest positions used to be fractions of the scene box (`ry * h`), which is
 * why the tableau came apart: the pita's height is a fraction of the VIEWPORT
 * WIDTH, so the gap between the lower row and the pita rim was two unrelated
 * numbers subtracted from each other. On a wide-but-short screen the rim rose
 * through the row and cut the "Salons" and "Clinics" name pills in half.
 *
 * Both rows are now measured DOWN FROM THE PITA RIM instead, so the clearance
 * is a constant no matter how the box is shaped. A falafel and its name pill
 * are one object for spacing purposes — that pill is why the old numbers were
 * always a little too tight.
 */
/** Falafel + name pill + air, half-height. The tallest object in either row.
 *  Measured, not guessed: the stack renders 84px at the widest falafel, so 46
 *  is the real half plus a little air. Overstating this is not free — the bowl
 *  is sized from what the rows leave behind, so every phantom pixel here comes
 *  straight off the pita. */
const STACK_HALF = 46;
/** Air between the lower row's pill and the pita rim. Absorbs the per-object
 *  `nudge` (up to 5px downward) and still leaves daylight. */
const RIM_CLEARANCE = 20;
/** Air between the two rows. */
const ROW_GAP = 26;

/**
 * A phone cannot hold this composition at rest, so mobile plays the same
 * choreography as a queue instead of a tableau: an object fades in just before
 * its own fall and is gone before the next pair arrives, so only two or three
 * are ever on screen.
 */
const MOBILE_BP = 640; // Tailwind `sm` — the markup switches at the same width.
/** Half-height reserved per slot row: a falafel + its label, plus air. */
const MOBILE_ROW_HALF = 52;
/** Mobile retiming. Tighter falls, evenly spaced, all landed before the payoff. */
const MOBILE_FIRST_START = 0.05;
const MOBILE_STAGGER = 0.05;
const MOBILE_FALL = 0.11;
/** Scroll spent fading an object in ahead of its own fall. */
const MOBILE_LEAD = 0.045;
/** How many objects are already sitting in their slots at scroll zero, so the
 *  opening frame — the one frame everybody sees — is a full tableau. */
const MOBILE_PRESET = 4;

/** Four slots, cycled: start-top, end-top, start-bottom, end-bottom. */
function slotFor(i: number) {
  const slot = i % 4;
  return { col: slot % 2 === 0 ? -1 : 1, bottom: slot >= 2 };
}

/**
 * The order the phone plays them in, as indices into OBJECTS.
 *
 * The phone opens on all four businesses and nothing else. They ARE the claim
 * this page is making — four rooms, one product — and they cannot be the thing
 * you have to scroll to reach. The capabilities follow once they have dropped.
 */
const MOBILE_ORDER = [4, 5, 6, 7, 0, 1, 2, 3];

/** Reverse lookup: where object `i` sits in the phone queue. */
const MOBILE_POSITION = OBJECTS.map((_, i) => MOBILE_ORDER.indexOf(i));

/** How much of the scroll each object's arc occupies. */
const FALL_DURATION = 0.16;
/** Must match the PitaBowl box in the markup below. */
const PITA_ASPECT = 560 / 760;
/** px the bowl is pushed below the scene floor on desktop. Must match the
 *  `sm:translate-y-*` on the bowl wrapper in the markup. */
const PITA_DROP = 28;
/** The bowl never shrinks past this, even on a very short scene — below it the
 *  silhouette stops reading as a pita.
 *
 *  Tuned down from 190 after watching a 1280x523 viewport: every 10px the bowl
 *  keeps is ~7px the two rows lose, and past a point the upper row's name pills
 *  end up underneath the lower row's falafels. A smaller bowl with all eight
 *  labels readable beats a bigger one with two of them buried. */
const PITA_MIN_W = 150;
/** Pocket centre, as a fraction of the pita box height from its top. */
const POCKET_Y = 0.14;
/** Warm light out of the pocket as the pita fills. */
const POCKET_GLOW =
  "radial-gradient(ellipse at center, rgba(255, 214, 150, 0.85) 0%, transparent 72%)";

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function Hero({ locale = "en" }: { locale?: Locale }) {
  const t = getDict(locale).hero;

  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const objRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bowlRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const payoffRef = useRef<HTMLDivElement>(null);
  const calm = useMotionTier() === "calm";

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    if (!section || !scene) return;

    let frame = 0;

    function apply() {
      frame = 0;
      const rect = section!.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const p = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;

      const w = scene!.clientWidth;
      const h = scene!.clientHeight;
      const bowl = bowlRef.current;
      const mobile = window.innerWidth < MOBILE_BP;
      // Short phones get a smaller bowl so the falafels still have a stage.
      const short = mobile && window.innerHeight <= 700;
      // vw, matching the bowl's CSS width — the scene box is narrower than the
      // viewport, so measuring off `w` aimed the fall short of the pocket.
      let pitaW = short
        ? Math.min(250, window.innerWidth * 0.42)
        : Math.min(320, window.innerWidth * (mobile ? 0.46 : 0.54));

      // On desktop the bowl is sized by the scene's HEIGHT as well as its
      // width. Two rows of objects have to fit above the rim, and a bowl
      // measured off vw alone doesn't know that — on a wide, short laptop a
      // 320px bowl left the rows nowhere to stand and the rim rose through
      // the name pills. Give the rows their space first; the bowl gets what
      // is left, down to a floor where it still reads as a bowl.
      if (!mobile) {
        const needed = 3 * STACK_HALF + ROW_GAP + RIM_CLEARANCE - PITA_DROP;
        const byHeight = (h - needed) / PITA_ASPECT;
        pitaW = Math.max(PITA_MIN_W, Math.min(pitaW, byHeight));
      }
      const pitaH = pitaW * PITA_ASPECT;
      if (bowl) bowl.style.width = `${Math.round(pitaW)}px`;
      // Matches the `translate-y` on the bowl in the markup. Dropping the bowl
      // buys the lower row its clearance without shrinking anything, and the
      // part that leaves the box is the plain underside of the dome.
      const pitaDrop = mobile ? 0 : PITA_DROP;
      const targetY = h / 2 + pitaDrop - pitaH * (1 - POCKET_Y) - 6;

      // Desktop rows, measured down from the rim (see ROW GEOMETRY above).
      //
      // The bowl has already given up whatever height it could; if two rows
      // still do not fit in what is left, the tableau scales down as a unit
      // rather than letting the rows run into each other or off the top edge.
      // Floored, because past that the labels stop being readable — and by
      // then the copy has been cut back too, so it does not get reached.
      const objectBand = h - RIM_CLEARANCE - pitaH + pitaDrop;
      const deskFit = Math.max(
        0.62,
        Math.min(1, objectBand / (4 * STACK_HALF + ROW_GAP))
      );
      const halfF = STACK_HALF * deskFit;
      const rowLowY = h / 2 + pitaDrop - pitaH - RIM_CLEARANCE - halfF;
      // Last guard. The rows are placed from the rim upward, so on a scene that
      // is short even after the bowl and the objects have both given ground,
      // the upper row would walk out through the top of the box and land on the
      // call-to-action. Closing the gap between the rows is the lesser evil.
      const rowHighY = Math.max(
        rowLowY - (2 * halfF + ROW_GAP * deskFit),
        -h / 2 + halfF
      );

      // Mobile slot geometry, in scene-centre coordinates. Two rows have to fit
      // the band above the bowl; rather than let them run into each other on a
      // short phone, the row height — and with it every object — shrinks.
      const band = h - pitaH - 12;
      const rowHalf = mobile
        ? Math.max(30, Math.min(MOBILE_ROW_HALF, (band - 8) / 4))
        : MOBILE_ROW_HALF;
      const fit = mobile ? rowHalf / MOBILE_ROW_HALF : deskFit;
      const rowTop = -h / 2 + rowHalf + 4;
      const rowBottom = rowTop + 2 * rowHalf + 8;
      // A chit is the widest object; keep it inside the scene box, not just
      // near the edge, so nothing is ever clipped on a narrow phone.
      const colX = Math.max(56, Math.min(w * 0.24, w / 2 - 80 * fit));

      OBJECTS.forEach((o, i) => {
        const el = objRefs.current[i];
        if (!el) return;

        const q = MOBILE_POSITION[i];
        const start = mobile ? MOBILE_FIRST_START + q * MOBILE_STAGGER : o.start;
        const t = clamp01((p - start) / (mobile ? MOBILE_FALL : FALL_DURATION));
        // Ease into the fall so it reads as tipped, not yanked.
        const e = t * t;

        const intro =
          !mobile || q < MOBILE_PRESET
            ? 1
            : clamp01((p - (start - MOBILE_LEAD)) / MOBILE_LEAD);

        let fromX: number;
        let fromY: number;
        if (mobile) {
          const { col, bottom } = slotFor(q);
          fromX = col * colX;
          fromY = bottom ? rowBottom : rowTop;
        } else {
          fromX = o.rx * w;
          fromY = (o.row === 0 ? rowHighY : rowLowY) + o.nudge * deskFit;
        }

        // Both tiers put the object INTO the pita — that trip is the whole idea
        // of the section. What calm drops is the flourish around the trip: no
        // spin, no swing, and an ease the whole way rather than an accelerating
        // drop, so it reads as being set down rather than tipped in.
        const flourish = calm ? 0 : 1;
        const e2 = calm ? t * t * (3 - 2 * t) : e;
        const x = fromX + (0 - fromX) * e2;
        const y =
          fromY +
          (targetY - fromY) * e2 -
          Math.sin(t * Math.PI) * h * 0.05 * flourish +
          (1 - intro) * 14 * flourish;

        // Squash into the pocket over the last fifth of the arc, then vanish.
        const land = clamp01((t - 0.8) / 0.2);
        const scale =
          fit * (0.9 + intro * 0.1) * (1 - land * (calm ? 0.3 : 0.55));

        el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) rotate(${o.rot * (1 - e) * flourish}deg) scale(${scale})`;
        el.style.opacity = String(intro * (1 - land));
      });

      // The pita warms as it fills. A single opacity write on a plain overlay —
      // deliberately not a `filter` on the bowl, which would re-render its eight
      // gradient layers, blurred shadow and blend-mode grain every frame.
      if (glowRef.current) {
        glowRef.current.style.opacity = String(clamp01((p - 0.05) / 0.6) * 0.55);
      }
      if (payoffRef.current) {
        const reveal = clamp01((p - 0.62) / 0.12);
        payoffRef.current.style.opacity = String(reveal);
        const lift = (1 - reveal) * (calm ? 6 : 16);
        payoffRef.current.style.transform = `translate(-50%, ${lift}px)`;
      }
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [calm]);

  return (
    <section
      ref={sectionRef}
      className="wash-paper relative"
      /* Enough scroll for ten objects to arrive in sequence, tuned so the last
         one lands well before the reader would give up on the section. */
      style={{ height: "220vh" }}
    >
      <div
        /* svh, not vh: with dvh the pinned scene resizes every time the mobile
           URL bar collapses, and 100vh overflows behind it.
           Pinned BELOW the sticky header (h-16), not under it. */
        className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col items-center overflow-hidden px-5 pb-4 pt-4 sm:px-8 sm:pb-8 sm:pt-14 desk-short:pt-6 desk-short:pb-4 desk-tiny:pt-3 desk-tiny:pb-2"
      >
        <div className="text-center">
          <Eyebrow className="justify-center">{t.eyebrow}</Eyebrow>

          {/* Phone sizes are held down deliberately: the header block ran to
              ~240px before the scene even started, which on a 745px Safari
              viewport left the pita cropped by the bottom edge. */}
          <TwoTone
            as="h1"
            size="hero"
            lead={t.lead}
            trail={t.trail}
            className="mt-1.5 text-[2rem] leading-[1.08] phone-short:text-[1.75rem] sm:mt-3 sm:text-display-xl desk-short:mt-1 desk-short:text-[2.5rem] desk-short:leading-[1.06] desk-tiny:mt-1 desk-tiny:text-[2rem]"
          />

          <Lede className="mx-auto mt-2.5 max-w-xl text-[0.9375rem] leading-snug phone-short:mt-2 phone-short:text-[0.875rem] sm:mt-4 sm:text-xl sm:leading-relaxed desk-short:mt-2 desk-short:text-base desk-short:leading-snug desk-tiny:mt-1.5 desk-tiny:text-[0.875rem]">
            {t.ledeBefore} <Key>{t.ledeKey}</Key> {t.ledeAfter}
          </Lede>

          <div className="mt-6 flex flex-col items-center gap-2 phone-short:mt-4 sm:mt-6 sm:gap-3 desk-short:mt-2.5 desk-short:gap-1 desk-tiny:mt-2 desk-tiny:gap-1">
            <Button href="#connect" size="lg" data-cta="hero_primary">
              {t.cta}
            </Button>
            {/* Dropped on short phones: it duplicates the header's link, and
                those 44px are the difference between the scene fitting under
                the fold and the falafels landing on the bowl. */}
            <a
              href="#product"
              className="-my-2 px-3 py-3 text-sm font-semibold text-espresso/45 underline decoration-espresso/20 underline-offset-4 transition-colors phone-short:hidden desk-tiny:hidden hover:text-espresso hover:decoration-espresso/50"
            >
              {t.secondary}
            </a>
          </div>
        </div>

        {/* Scene */}
        {/* min-h is load-bearing, not padding: the desktop rest positions are
              fractions of this box, so when it collapsed every object converged
              on the centre and the four business names landed on top of each
              other and on the pita. The floor is the pita (236px at its widest)
              plus the two label rows above it. */}
          <div
            ref={sceneRef}
            className="relative -mt-1 w-full max-w-3xl flex-1 sm:mt-4 sm:min-h-[360px] desk-short:mt-2 desk-short:min-h-[300px] desk-tiny:mt-1 desk-tiny:min-h-[240px]"
          >
          {/* Objects sit above the pita so nothing is hidden behind the bowl
              while it floats; the squash-and-fade at the pocket is what sells
              the drop, not z-order.

              `left-1/2`, not `start-1/2`, and the same for the bowl and the
              payoff chip below. The centring here is an anchor plus a physical
              `translate(-50%)`; under `dir=rtl` the logical anchor flips to the
              right edge while the transform does not, and the whole tableau
              landed one element-width to the left of centre on /he. A centred
              object is centred in both directions, so the physical property is
              the correct one — the tableau is symmetrical and has nothing to
              mirror. */}
          {OBJECTS.map((o, i) => (
            <div
              key={i}
              ref={(el) => {
                objRefs.current[i] = el;
              }}
              className="absolute left-1/2 top-1/2 z-10 will-change-transform"
              /* Starts hidden; the first rAF tick places and reveals it, so
                 neither tier ships a frame of ten objects piled at the centre. */
              style={{ opacity: 0 }}
            >
              {o.kind === "ball" ? (
                <BallStack o={o} t={t} />
              ) : (
                <ChitChip o={o} t={t} />
              )}
            </div>
          ))}

          {/* The pita, bottom-centred. Objects fall into its pocket. */}
          <div
            ref={bowlRef}
            /* Width here is the SSR/first-paint value only — on desktop the
               effect overwrites it with a height-aware one on the first tick. */
            className="absolute bottom-0 left-1/2 z-0 w-[min(320px,46vw)] -translate-x-1/2 phone-short:w-[min(250px,42vw)] sm:w-[min(320px,54vw)] sm:translate-y-7"
            style={{ aspectRatio: "760 / 560" }}
          >
            <PitaBowl className="size-full" />
            <div
              ref={glowRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[10%] top-[2%] h-[26%] rounded-full"
              style={{ background: POCKET_GLOW, opacity: 0 }}
            />
          </div>

          {/* Payoff, once the pita is full */}
          <div
            ref={payoffRef}
            className="absolute bottom-[52%] left-1/2 z-20 w-max max-w-[calc(100vw-2.5rem)] text-center sm:bottom-[54%]"
            style={{ opacity: 0, transform: "translate(-50%, 16px)" }}
          >
            <PayoffChip text={t.payoff} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** One capability. Opaque fill on purpose: these nodes have their transform
 *  rewritten every frame, and a backdrop-filter under a moving element
 *  re-rasterizes per frame and locks the main thread. */
function ChitChip({ o, t }: { o: Chit; t: Dict["hero"] }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap rounded-hub-lg border border-espresso/[0.08] bg-[var(--color-chip)] px-2.5 py-1.5 text-[10px] font-semibold text-espresso/55 shadow-hub-sm sm:text-[11px]">
      <o.icon className="h-3 w-3 shrink-0 text-cinnamon/70" strokeWidth={2.4} />
      {t.chits[o.id]}
    </span>
  );
}

/** One kind of business: the falafel and its name. */
function BallStack({ o, t }: { o: Ball; t: Dict["hero"] }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Falafel id={o.id} size={BALL_SIZE} icon={o.icon} />
      <span className="flex items-center gap-1 rounded-pill border border-espresso/[0.06] bg-[var(--color-chip)] px-2 py-0.5 text-[11px] font-bold text-espresso/75 shadow-hub-sm">
        {t.balls[o.id]}
      </span>
    </div>
  );
}

function PayoffChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-espresso/10 bg-[var(--color-chip)] px-3.5 py-2 text-[0.75rem] font-bold text-espresso shadow-[0_10px_30px_-12px_rgba(60,34,12,0.4)] sm:px-4 sm:text-[0.8125rem]">
      <span className="h-1.5 w-1.5 rounded-full bg-hub-success" />
      {text}
    </span>
  );
}

/**
 * The proof bar — three claims, straight from the shipped page, where it sits
 * directly under the hero for the same reason: it answers "what does this
 * actually change for me" before the pain section starts listing what's wrong.
 */
const PROOF_IDS = ["a", "b", "c"] as const;

export function ProofBar({ locale = "en" }: { locale?: Locale }) {
  const t = getDict(locale).proofBar;
  return (
    <section className="wash-flat border-y border-hairline py-8 sm:py-10">
      <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-5 sm:px-8">
        {PROOF_IDS.map((id) => (
          <div key={id} className="text-center">
            <p className="text-2xl font-extrabold tracking-[-0.03em] text-espresso sm:text-3xl">
              {t[id].stat}
            </p>
            <p className="mx-auto mt-1.5 max-w-[16ch] text-[0.75rem] leading-snug text-espresso/50 sm:text-[0.8125rem]">
              {t[id].label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
