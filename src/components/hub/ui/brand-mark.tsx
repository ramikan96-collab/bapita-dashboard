/**
 * Bapita bowl mark — the "pita" that catches the five tools.
 * A clean white bowl (rim ellipse + half-ellipse body) reading as both a
 * bowl and a smile. Neutral white only on the dark hub; the cream card and
 * five-dot constellation from earlier versions are gone.
 */
export function BowlIcon({
  size = 28,
  className,
  color = "currentColor",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* bowl body — a half-ellipse smile */}
      <path
        d="M3.5 11.2 A 10.5 11 0 0 0 24.5 11.2 Z"
        fill={color}
      />
      {/* rim opening — thin ellipse above the body */}
      <ellipse
        cx="14"
        cy="11.2"
        rx="10.5"
        ry="2.7"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
    >
      <BowlIcon size={24} />
      <span
        style={{
          fontFamily: "var(--font-heebo), ui-sans-serif, system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "1.0625rem",
          letterSpacing: "-0.03em",
          color: "currentColor",
        }}
      >
        bapita
      </span>
    </span>
  );
}
