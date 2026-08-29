"use client";

import Link from "next/link";

/**
 * Wraps a heading or a service name in a link to the extra page that belongs to
 * it, and renders its children untouched when there is no such page — which is
 * every business that has not bought the multi-page add-on.
 */
export function PageLink({
  href,
  children,
  inline,
}: {
  href: string | null;
  children: React.ReactNode;
  /** Inline (a service name) rather than block (a section heading). */
  inline?: boolean;
}) {
  if (!href) return <>{children}</>;
  return (
    <Link
      href={href}
      style={{
        color: "inherit",
        textDecoration: "none",
        display: inline ? "inline" : "block",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
    >
      {children}
    </Link>
  );
}
