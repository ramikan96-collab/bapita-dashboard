"use client";

import { fontsHref } from "./fonts";

interface Props {
  /** chosen font names (heading, body); nulls = theme default, no extra load needed */
  fonts: (string | null | undefined)[];
}

/**
 * Loads override Google Fonts for the booking page. Renders nothing when no overrides
 * are set (themes load their own default fonts). Self-contained — drops into any theme
 * or a custom ejected page.
 *
 * Loaded non-render-blocking (media=print swap trick): the stylesheet fetches in the
 * background instead of stalling first paint, and swaps in once ready. font-display:swap
 * (already in the href query) then handles the FOUT on the font files themselves.
 */
export function FontLoader({ fonts }: Props) {
  const href = fontsHref(fonts);
  if (!href) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preload" as="style" href={href} />
      <link
        rel="stylesheet"
        href={href}
        media="print"
        onLoad={(e) => {
          (e.currentTarget as HTMLLinkElement).media = "all";
        }}
      />
      <noscript>
        <link rel="stylesheet" href={href} />
      </noscript>
    </>
  );
}
