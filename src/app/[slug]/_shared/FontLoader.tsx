import { fontsHref } from "./fonts";

interface Props {
  /** chosen font names (heading, body); nulls = theme default, no extra load needed */
  fonts: (string | null | undefined)[];
}

/**
 * Loads override Google Fonts for the booking page. Renders nothing when no overrides
 * are set (themes load their own default fonts). Self-contained — drops into any theme
 * or a custom ejected page.
 */
export function FontLoader({ fonts }: Props) {
  const href = fontsHref(fonts);
  if (!href) return null;
  return <link rel="stylesheet" href={href} />;
}
