import { getDict, type Locale } from "@/lib/marketing/i18n";
import { cn } from "@/lib/hub/cn";

/**
 * "Early access" — the one status Bapita puts on its own homepage.
 *
 * Deliberately never the word "Beta". Same honest information — we are
 * pre-first-customer and the page should say so — and the opposite sales
 * effect: to an owner being asked for ₪1,500 up front, "Beta" reads as *come
 * back later* and "early access" reads as *move now*. What it raises is
 * answered in the FAQ and committed to in /terms, which is why this is a
 * status and not a link.
 *
 * ── Why it lives in two places ──
 *
 * It sits beside the logo in the nav from `sm` up, where it is visible at every
 * scroll position and costs nothing.
 *
 * It cannot do that on a phone. Measured, not guessed: the mobile header row
 * wants 448px — brand 85 + chip 102 + language toggle 50 + "Book a call" 99 +
 * the menu button 44, plus gutters — and a phone gives it 360 to 390. The chip
 * was exactly the overflow, and what it overflowed onto was the language
 * toggle, on an Israel-first product where reaching the Hebrew page is not
 * optional.
 *
 * So below `sm` the chip moves into the hero's eyebrow row instead. That row
 * already exists and is already a flex line with room to spare, so the chip
 * costs zero vertical pixels — which matters on the one screen this whole
 * phase is busy reclaiming — and it is still the first thing read on the page.
 * What it gives up is being visible while scrolled, which is worth less than
 * either the CTA or the language toggle it was pushing off the bar.
 *
 * One component, two call sites, so the two can never drift apart.
 */
export function EarlyAccessChip({
  locale = "en",
  className,
}: {
  locale?: Locale;
  className?: string;
}) {
  const t = getDict(locale);
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-pill border border-cinnamon/25 bg-cinnamon/[0.08] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-cinnamon sm:text-[0.625rem] sm:tracking-[0.12em]",
        className,
      )}
    >
      {t.nav.earlyAccess}
    </span>
  );
}
