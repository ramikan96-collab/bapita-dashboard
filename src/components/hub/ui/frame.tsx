import type { ReactNode } from "react";
import { cn } from "@/lib/hub/cn";

/**
 * Device shells for the product mocks.
 *
 * These carry the contrast the page needs. Rather than flipping the page
 * background between cream and dark to create separation — which made the old
 * homepage read as five different sites — every product surface is framed. The
 * frame is what makes the UI inside pop off the warm page.
 *
 * Content inside is real DOM, not screenshots: it stays crisp, themes with the
 * product accent, and can animate.
 */

export function BrowserFrame({
  url = "yourshop.bapita.com",
  children,
  className,
  accent,
  /** Shorter chrome bar, for a frame inside a fixed-height card stage. */
  dense = false,
}: {
  url?: string;
  children: ReactNode;
  className?: string;
  accent?: string;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-espresso/10 bg-white shadow-[0_30px_70px_-28px_rgba(60,34,12,0.4)]",
        className,
      )}
    >
      {/* chrome */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-espresso/[0.07] bg-clay/70 px-4",
          dense ? "py-1.5" : "py-2.5",
        )}
      >
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-espresso/[0.14]" />
          <span className="h-2.5 w-2.5 rounded-full bg-espresso/[0.14]" />
          <span className="h-2.5 w-2.5 rounded-full bg-espresso/[0.14]" />
        </div>
        <div className="flex min-w-0 flex-1 justify-center">
          <span className="max-w-full truncate rounded-pill bg-white/80 px-3 py-0.5 font-mono text-[0.6875rem] text-espresso/45">
            {url}
          </span>
        </div>
        {accent && (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: accent }}
          />
        )}
      </div>
      {children}
    </div>
  );
}

export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2rem] border-[6px] border-espresso/85 bg-white shadow-[0_28px_60px_-24px_rgba(60,34,12,0.5)]",
        className,
      )}
    >
      {/* speaker slot — sits inside the bezel, not floating over content */}
      <div className="flex justify-center bg-espresso/85 pb-1.5 pt-1">
        <span className="h-1 w-12 rounded-full bg-clay/25" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}
