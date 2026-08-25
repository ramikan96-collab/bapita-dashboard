import type { ReactNode } from "react";
import { cn } from "@/lib/hub/cn";

/**
 * The page's typographic signature.
 *
 * Every section opener is a two-line headline: a statement in espresso, then a
 * counter-statement in clay-taupe. "Four tools. / One pita." The device repeats
 * ~9 times down the page and is what the design is meant to be remembered by,
 * so it lives in one component rather than being hand-rolled per section.
 *
 * Taupe on the warm bands measures ~3.1:1, which clears WCAG AA for large text
 * only. That's why `size="sm"` still lands at 28px+ and there is no smaller
 * variant — the trail line must never be set at body size.
 */

type HeadingLevel = "h1" | "h2" | "h3";
type Size = "hero" | "chapter" | "sm";

const sizeClasses: Record<Size, string> = {
  hero: "text-display-xl leading-[1.02]",
  chapter: "text-chapter leading-[1.04]",
  sm: "text-display-lg leading-[1.08]",
};

export function TwoTone({
  lead,
  trail,
  as: Tag = "h2",
  size = "chapter",
  /** `dark` is for the single espresso block that closes the page. */
  tone = "light",
  className,
}: {
  lead: ReactNode;
  trail: ReactNode;
  as?: HeadingLevel;
  size?: Size;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <Tag
      className={cn(
        "text-balance font-extrabold tracking-[-0.03em]",
        dark ? "text-clay" : "text-espresso",
        sizeClasses[size],
        className,
      )}
    >
      <span className="block">{lead}</span>
      <span className={cn("block", dark ? "text-clay/40" : "text-clay-taupe")}>
        {trail}
      </span>
    </Tag>
  );
}

/**
 * Body copy where the load-bearing phrase sits at full espresso and everything
 * around it drops back. Lets a paragraph be skimmed in one pass without
 * resorting to bold-spam. Wrap the phrase in <Key>.
 */
export function Lede({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-lg leading-[1.6] text-espresso/55 sm:text-xl sm:leading-[1.6]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** The phrase inside a <Lede> that carries the point. */
export function Key({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-espresso">{children}</span>;
}

/**
 * Section label. Takes an optional falafel dot in a product color — that dot is
 * the page's chapter marker. Deliberately NOT a number: the sections aren't a
 * sequence, so numbering them would be decoration. (The one place numerals do
 * appear is How it works, which genuinely is ordered.)
 */
export function Eyebrow({
  children,
  dot,
  className,
}: {
  children: ReactNode;
  dot?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-cinnamon",
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 28%, color-mix(in srgb, ${dot} 45%, #fff) 0%, ${dot} 60%, color-mix(in srgb, ${dot} 70%, #000) 100%)`,
          }}
        />
      )}
      {children}
    </p>
  );
}
