"use client";

import { useEffect, useState } from "react";

/**
 * Measures intrinsic aspect ratio (naturalWidth / naturalHeight) for each url.
 * Returns a map; a url is only present once its image has loaded.
 */
export function useImageRatios(urls: string[]): Record<string, number> {
  const [ratios, setRatios] = useState<Record<string, number>>({});

  // Re-run only when the set of urls actually changes.
  const key = urls.join("|");

  useEffect(() => {
    let cancelled = false;
    for (const url of urls) {
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        const r = img.naturalWidth / img.naturalHeight || 1;
        setRatios((prev) => (prev[url] ? prev : { ...prev, [url]: r }));
      };
      img.src = url;
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ratios;
}
