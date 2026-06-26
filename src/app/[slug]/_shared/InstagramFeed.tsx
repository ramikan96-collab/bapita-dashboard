"use client";

import { useEffect } from "react";

interface Props {
  /** LightWidget widget id, widget URL, or full embed src pasted by the owner */
  embed: string | null | undefined;
  /** border radius to match the theme's gallery tiles */
  radius?: number;
}

/** Turn whatever the owner pasted into a LightWidget iframe src. */
function toLightWidgetSrc(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // Full LightWidget URL anywhere in the pasted value (e.g. an <iframe src="..."> snippet)
  const urlMatch = v.match(/(?:https?:)?\/\/lightwidget\.com\/widgets\/([A-Za-z0-9]+)/i);
  if (urlMatch) return `https://lightwidget.com/widgets/${urlMatch[1]}.html`;
  // Bare widget id
  if (/^[A-Za-z0-9]+$/.test(v)) return `https://lightwidget.com/widgets/${v}.html`;
  return null;
}

/**
 * Live Instagram feed via a LightWidget embed. Self-contained: drops into any theme or a
 * custom ejected page. Auto-updates on its own (the widget pulls the latest posts).
 * Renders nothing when no embed is set.
 */
export function InstagramFeed({ embed, radius = 10 }: Props) {
  const src = embed ? toLightWidgetSrc(embed) : null;

  useEffect(() => {
    if (!src) return;
    // LightWidget's script auto-resizes the iframe to fit its content.
    const existing = document.querySelector<HTMLScriptElement>("script[data-lightwidget]");
    if (existing) return;
    const s = document.createElement("script");
    s.src = "https://cdn.lightwidget.com/widgets/lightwidget.js";
    s.async = true;
    s.dataset.lightwidget = "1";
    document.body.appendChild(s);
  }, [src]);

  if (!src) return null;

  return (
    <iframe
      src={src}
      title="Instagram feed"
      scrolling="no"
      allowTransparency
      className="lightwidget-widget"
      style={{ width: "100%", border: 0, overflow: "hidden", borderRadius: radius }}
    />
  );
}
