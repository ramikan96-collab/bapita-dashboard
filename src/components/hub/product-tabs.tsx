"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, ArrowUpRight, ArrowRight } from "lucide-react";
import { TwoTone, Lede, Key, Eyebrow } from "@/components/hub/ui/type";
import { PRODUCT_MOCKS } from "@/components/hub/ui/product-mock";
import { PRODUCTS, type Product, type ProductId } from "@/lib/hub/products";

const ACCENT: Record<ProductId, string> = {
  book: "#e8920a",
  social: "#d4622a",
  bots: "#1fa971",
  reach: "#2d6cf0",
};

/**
 * One line per product, in the owner's language — what changes for them, not
 * what the software does. Deliberately separate from the longer `description`
 * in products.ts: that one explains, this one lands.
 *
 * Each line is set in a different trade on purpose. The page sells to anyone who
 * books appointments — physios, groomers, tattoo studios, trainers — and four
 * lines all set in a barbershop quietly told everyone else this wasn't for them.
 */
const STATEMENT: Record<ProductId, string> = {
  book:
    "A client books a 2am slot from their phone, and your week fills in while you're with someone else.",
  bots:
    "Someone messages the clinic at midnight asking about prices. They get an answer in seconds — and the appointment is already in your calendar.",
  social:
    "A month of posts goes out on schedule, and every comment, DM and review lands in one inbox instead of five apps.",
  reach:
    "When someone nearby searches for a physio, a groomer, a studio like yours — you're the one they find first.",
};

/**
 * Viewport-heights of scroll spent on each product before it hands over.
 * At 85 this took ~800px of scrolling per tab, which read as a stuck page —
 * 50vh puts each hand-over at roughly one flick of the wheel.
 *
 * A phone gets more, not less: touch scrolling carries momentum, and at 50vh a
 * single flick threw the reader past two products.
 */
const VH_PER_PRODUCT = 50;
const VH_PER_PRODUCT_COMPACT = 65;

/** Tailwind `sm`. Below it the panel is laid out compactly — see <Panel>. */
const NARROW = "(max-width: 639px)";

function subscribeNarrow(onChange: () => void) {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Read as an external store rather than effect-set state: the value decides how
 * tall the section is, and getting that wrong for one frame reflows the whole
 * page under the reader.
 */
function useNarrow() {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

/**
 * The four products.
 *
 * The section pins and each product gets its own stretch of scroll, so reading
 * down the page walks you through all four instead of asking you to notice a
 * tab row and click it.
 *
 * Phones used to be carved out of that: the panel — statement, five features,
 * CTA and the product mock — ran to ~1000px, and a pinned element taller than
 * the viewport hides its own bottom half with no way to reach it. So below `sm`
 * the four panels became a swipe rail instead. That solved the overflow and
 * lost the argument: the whole point is that scrolling the page walks you
 * through the range, and a rail asks for a gesture nobody knew was there —
 * the product mock also sat ~600px below the fold, so you never saw a product
 * and its screenshot at the same time.
 *
 * Fixed at the cause instead: <Panel> is ~420px on a phone, which fits a pinned
 * screen, so every width now behaves the same way. The tab row still drives,
 * and reflects, the sequence.
 */
export function ProductTabs() {
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const narrow = useNarrow();

  // ── Scroll position drives the active product ──
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;

    function apply() {
      frame = 0;
      const rect = section!.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      const p = -rect.top / scrollable;
      // Clamped so the first and last products hold while the section enters
      // and leaves, instead of flickering at the boundaries.
      const next = Math.min(
        PRODUCTS.length - 1,
        Math.max(0, Math.floor(p * PRODUCTS.length)),
      );
      setIndex((prev) => (prev === next ? prev : next));
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
  }, []);

  /** Scroll to the middle of a product's stretch, so it lands settled. */
  function goTo(i: number) {
    const section = sectionRef.current;
    if (!section) return;
    const scrollable = section.offsetHeight - window.innerHeight;
    const top = section.offsetTop + scrollable * ((i + 0.5) / PRODUCTS.length);
    // Must go through Lenis when it's mounted: a raw window.scrollTo fights its
    // running animation and the scroll position oscillates, which makes the
    // active tab flicker between two products.
    const lenis = window.__lenis;
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    goTo((i + dir + PRODUCTS.length) % PRODUCTS.length);
  }

  const active = PRODUCTS[index];

  return (
    <section
      ref={sectionRef}
      id="products"
      className="wash-clay relative"
      style={{
        height: `calc(100vh + ${
          (narrow ? VH_PER_PRODUCT_COMPACT : VH_PER_PRODUCT) * PRODUCTS.length
        }vh)`,
      }}
    >
      {/* Pinned under the header (h-16) and sized in svh, so what's pinned is
          exactly what's on screen. */}
      <div className="sticky top-16 flex min-h-[calc(100svh-4rem)] flex-col justify-center py-2 sm:py-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
            <Eyebrow className="justify-center">Products</Eyebrow>
            {/* Both lines stay one line each at every breakpoint — the moment the
                lead wraps, the two-tone device stops reading as two statements. */}
            <TwoTone
              size="sm"
              lead="Four tools you need."
              trail="Built, branded, running."
              className="mt-2 sm:mt-3"
            />
            {/* Four lines of lede on a phone cost 90px the panel needs. Held
                to the compact scale below `sm`; no words removed. */}
            <Lede className="mx-auto mt-2 text-[0.8125rem] leading-snug phone-short:mt-1.5 phone-short:text-[0.75rem] sm:mt-4 sm:text-lg sm:leading-relaxed">
              Two core tools — Book and Social — with an add-on each. Take{" "}
              <Key>one or take all four</Key>. One login, one bill, and whatever
              you pick gets set up under your own name and colors.
            </Lede>
          </div>

          {/* Tab row — reflects scroll (or swipe) position, and still clickable.
              It scrolls horizontally on the narrowest phones rather than letting
              four labels crush into unreadable stubs. */}
          <div
            role="tablist"
            aria-label="Bapita products"
            className="rail mt-3 flex justify-start gap-1 overflow-x-auto border-b border-espresso/10 px-5 sm:mt-8 sm:justify-center sm:gap-2 sm:px-8"
          >
            {PRODUCTS.map((product, i) => {
              const isActive = i === index;
              const isAddOn = product.tier === "add-on";
              return (
                <button
                  key={product.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={
                    isAddOn
                      ? `${product.name}, add-on to ${product.parent === "book" ? "Book" : "Social"}`
                      : product.name
                  }
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => goTo(i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  /* Add-ons sit a size down and carry a caret. The row is read
                     left to right as two pairs — main, its add-on, main, its
                     add-on — so the hierarchy is in the row itself and doesn't
                     need a second line of labels under it.
                     min-h-11 keeps every tab a 44px touch target. */
                  className={`-mb-px flex min-h-11 shrink-0 items-center gap-1 border-b-2 pb-2 pt-1 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinnamon/50 sm:pb-3 sm:pt-2 ${
                    isAddOn
                      ? "px-2.5 text-[0.8125rem] sm:px-4"
                      : "px-3 text-[0.9375rem] sm:px-6"
                  } ${
                    isActive
                      ? "text-espresso"
                      : `border-transparent hover:text-espresso/70 ${isAddOn ? "text-espresso/25" : "text-espresso/35"}`
                  }`}
                  style={isActive ? { borderColor: ACCENT[product.id] } : undefined}
                >
                  {isAddOn && (
                    <span aria-hidden="true" className="text-espresso/25">
                      ↳
                    </span>
                  )}
                  {product.name}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            aria-label={`Bapita ${active.name}`}
            className="mx-auto mt-3 px-5 sm:mt-6 sm:px-8"
          >
            <Panel product={active} compact={narrow} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One product's case.
 *
 * `compact` is the phone layout. Everything is the same and nothing is cut —
 * the statement, all the features, the CTA and the mock are all still here —
 * but the type comes down a step, the air comes out, and the mock is shown
 * through a fixed-height window instead of at full height. That last one is
 * what makes the panel fit: the mocks are 300–400px tall, and stacked under a
 * paragraph and a five-item list they put the screenshot two-thirds of a screen
 * below the words describing it. Cropped, the product and its picture are on
 * screen together, and a browser chrome running past the frame reads as a
 * window onto something real rather than as a sticker.
 */
function Panel({ product, compact }: { product: Product; compact?: boolean }) {
  const accent = ACCENT[product.id];
  const isLive = product.status === "live";
  const parent = product.parent
    ? PRODUCTS.find((p) => p.id === product.parent)
    : undefined;

  return (
    <div className="grid h-full items-center gap-3 overflow-hidden rounded-3xl border border-espresso/[0.07] bg-paper-warm p-3.5 shadow-[0_20px_60px_-30px_rgba(60,34,12,0.35)] sm:gap-6 sm:p-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:p-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-pill px-3 py-1 text-[0.75rem] font-bold transition-colors duration-300"
            style={{ background: `${accent}1f`, color: accent }}
          >
            Bapita {product.name}
          </span>
          <span
            className={`rounded-pill px-2.5 py-1 text-[0.6875rem] font-bold ${
              isLive
                ? "bg-hub-success/15 text-hub-success"
                : "bg-espresso/[0.07] text-espresso/50"
            }`}
          >
            {product.statusLabel}
          </span>
          {parent && (
            /* Stated, not implied. Someone landing straight on this tab from
               the tab row needs to know Bots is bought on top of Book, not
               instead of it. */
            <span className="rounded-pill border border-espresso/10 px-2.5 py-1 text-[0.6875rem] font-bold text-espresso/40">
              ↳ Add-on to {parent.name}
            </span>
          )}
        </div>

        {/* Keyed so the copy cross-fades as scroll hands over to the next
            product, rather than swapping abruptly mid-sentence. */}
        <div key={product.id} className="animate-[fadeIn_300ms_ease-out]">
          <p className="mt-2.5 text-[1rem] font-bold leading-[1.24] tracking-[-0.02em] text-balance text-espresso phone-short:mt-2 phone-short:text-[0.9375rem] sm:mt-5 sm:text-[1.5rem] sm:leading-[1.32]">
            {STATEMENT[product.id]}
          </p>

          <ul className="mt-2.5 space-y-1 phone-short:mt-2 phone-short:space-y-0.5 sm:mt-6 sm:space-y-2.5">
            {product.features.map((feat) => (
              <li
                key={feat}
                className="flex items-start gap-2 text-[0.8125rem] leading-snug text-espresso/65 phone-short:text-[0.75rem] sm:gap-3 sm:text-[0.9375rem] sm:leading-normal"
              >
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                  style={{ color: accent }}
                  strokeWidth={3}
                />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 phone-short:mt-1.5 sm:mt-7">
          {isLive ? (
            <a
              href={product.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-bold text-espresso underline decoration-espresso/25 underline-offset-4 transition-colors hover:decoration-espresso/70"
            >
              See Bapita {product.name} live
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          ) : (
            <a
              href="#connect"
              className="group inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-bold text-espresso underline decoration-espresso/25 underline-offset-4 transition-colors hover:decoration-espresso/70"
            >
              Get on the list for {product.name}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          )}
        </div>
      </div>

      {/* What it actually looks like.
          All four mocks share a single grid cell, so the container is as tall
          as the tallest one and nothing reflows on hand-over.

          On a phone that cell is a fixed-height window the mock is scaled into
          and cropped by. `origin-top` so the crop always takes the bottom —
          the browser chrome, the shop header and the first rows survive, which
          is the part that says "this is your site". */}
      <div
        className={`grid rounded-2xl p-2.5 transition-colors duration-500 sm:p-5 ${
          compact ? "h-[118px] overflow-hidden phone-short:h-[60px]" : ""
        }`}
        style={{
          background: `linear-gradient(150deg, ${accent}14, ${accent}05 60%, transparent)`,
        }}
      >
        {PRODUCTS.map((p) => {
          const Stacked = PRODUCT_MOCKS[p.id];
          const isActive = p.id === product.id;
          return (
            <div
              key={p.id}
              className={`col-start-1 row-start-1 transition-opacity duration-300 ${
                compact
                  ? "origin-top scale-[0.55] self-start phone-short:scale-[0.4]"
                  : "self-center"
              } ${isActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
              aria-hidden={!isActive}
            >
              <Stacked />
            </div>
          );
        })}
      </div>
    </div>
  );
}
