import { cn } from "@/lib/hub/cn";
import type { ReactNode } from "react";

type BadgeVariant = "neutral" | "live" | "soon";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-hub-cream/[0.08] text-hub-cream/60",
  live: "bg-hub-success/15 text-hub-success",
  soon: "bg-warning/15 text-warning",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
