"use client";

import { useEffect } from "react";

// Behold renders via a <behold-widget> custom element, not a standard tag.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "behold-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { "feed-id"?: string };
    }
  }
}

interface Props {
  /** Behold feed id, or the full <behold-widget …> embed snippet pasted by the owner */
  embed: string | null | undefined;
  /** border radius to match the theme's gallery tiles */
  radius?: number;
}

/** Pull a Behold feed id out of whatever the owner pasted. */
function toBeholdFeedId(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // feed-id="XXXX" anywhere in the pasted value (full embed snippet)
  const attrMatch = v.match(/feed-id=["']([A-Za-z0-9]+)["']/i);
  if (attrMatch) return attrMatch[1];
  // Bare feed id
  if (/^[A-Za-z0-9]+$/.test(v)) return v;
  return null;
}

/**
 * Live Instagram feed via a Behold embed. Self-contained: drops into any theme or a
 * custom ejected page. Auto-updates on its own (Behold pulls the latest posts).
 * Grid layout (columns, post count, spacing) is configured in the Behold dashboard.
 * Renders nothing when no feed id is set.
 */
export function InstagramFeed({ embed, radius = 10 }: Props) {
  const feedId = embed ? toBeholdFeedId(embed) : null;

  useEffect(() => {
    if (!feedId) return;
    // Behold's module script defines the <behold-widget> element. Load it once.
    const existing = document.querySelector<HTMLScriptElement>("script[data-behold]");
    if (existing) return;
    const s = document.createElement("script");
    s.type = "module";
    s.src = "https://w.behold.so/widget.js";
    s.dataset.behold = "1";
    document.head.appendChild(s);
  }, [feedId]);

  if (!feedId) return null;

  return (
    <div style={{ width: "100%", borderRadius: radius, overflow: "hidden" }}>
      <behold-widget feed-id={feedId} />
    </div>
  );
}
