import { cn } from "@/lib/hub/cn";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Size = "sm" | "md" | "lg";
/**
 * The page is warm end-to-end, so `primary` is espresso-on-clay. `onDark` is
 * the inverse, for the single espresso block that closes the page.
 */
type Variant = "primary" | "ghost" | "outline" | "onDark";

interface BaseProps {
  size?: Size;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

type ButtonAsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsAnchor = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const sizeClasses: Record<Size, string> = {
  /* The pill stays 36px so the header keeps its proportions; an invisible
     pseudo-element extends the hit area to the 44px floor. `sm` is the size
     the mobile nav uses, and it was the smallest target on the page.
     Padding the button instead would have made the pill itself 44px tall. */
  sm: "h-9 px-4 text-sm gap-1.5 relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
  md: "h-11 px-5 text-[0.9375rem] gap-2",
  lg: "h-13 px-7 text-base gap-2",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-espresso text-clay hover:bg-espresso-muted active:bg-espresso shadow-[0_8px_20px_-8px_rgba(42,29,20,0.5)]",
  ghost:
    "bg-transparent text-espresso/65 hover:bg-espresso/[0.06] hover:text-espresso active:bg-espresso/10",
  outline:
    "bg-transparent border border-espresso/20 text-espresso hover:bg-espresso/[0.05] active:bg-espresso/[0.08]",
  onDark:
    "bg-clay text-espresso hover:bg-white active:bg-clay shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]",
};

const base =
  "inline-flex items-center justify-center rounded-pill font-semibold leading-none tracking-[-0.01em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinnamon focus-visible:ring-offset-2 focus-visible:ring-offset-clay disabled:pointer-events-none disabled:opacity-40 select-none whitespace-nowrap";

export function Button({
  size = "md",
  variant = "primary",
  className,
  children,
  href,
  ...rest
}: ButtonProps) {
  const classes = cn(base, sizeClasses[size], variantClasses[variant], className);

  if (href !== undefined) {
    return (
      <a href={href} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
