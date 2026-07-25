import type { ImgHTMLAttributes } from "react";

/**
 * Drop-in replacement for `<img>` on the public booking pages.
 *
 * Why this and not `next/image`: every image here is positioned by the theme's
 * own CSS (absolute-fill heroes, fixed-size avatar circles, flex gallery tiles)
 * and several carry focal-point `objectPosition` and hover handlers. `<Image>`
 * would mean rewriting that layout in four themes plus the custom page.
 * SmartImg keeps the exact same element, styles and handlers, and only rewrites
 * `src` into a responsive `srcSet` pointing at Next's optimizer endpoint.
 *
 * The win is the same one `<Image>` gives: visitors download a correctly-sized
 * AVIF/WebP from Vercel's CDN instead of the multi-megabyte original from
 * Supabase Storage, and Vercel fetches each original only once.
 *
 * Anything that isn't a public Supabase Storage URL is passed through untouched,
 * so a foreign or malformed URL degrades to today's behaviour rather than 400ing.
 */

// Must stay a subset of Next's `deviceSizes` ∪ `imageSizes`. We use the
// framework defaults (neither is overridden in next.config.ts) — /_next/image
// rejects any `w` outside that set.
const ALLOWED_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];

const STORAGE_PATH = "/storage/v1/object/public/";

const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  } catch {
    return null;
  }
})();

function isOptimizable(src: string): boolean {
  if (!supabaseOrigin) return false;
  if (!src.startsWith(`${supabaseOrigin}${STORAGE_PATH}`)) return false;
  const path = src.toLowerCase().split("?")[0];
  // SVGs gain nothing from raster transcoding and are blocked by
  // `dangerouslyAllowSVG: false` anyway. HEIC/HEIF can't be decoded by the
  // optimizer (or by most browsers) — passing them through keeps legacy
  // uploads behaving exactly as they do today instead of 400ing. New uploads
  // are transcoded to JPEG before they reach Storage; see lib/image-upload.ts.
  return !SKIP_EXTENSIONS.some((ext) => path.endsWith(ext));
}

const SKIP_EXTENSIONS = [".svg", ".heic", ".heif"];

/**
 * Three candidate widths topping out at ~2x the rendered size, so a 1x screen
 * pulls the small one and a retina screen pulls the large one.
 */
function widthsFor(maxWidth: number): number[] {
  const target = maxWidth * 2;
  const found = ALLOWED_WIDTHS.findIndex((w) => w >= target);
  const top = found === -1 ? ALLOWED_WIDTHS.length - 1 : found;
  return ALLOWED_WIDTHS.slice(Math.max(0, top - 2), top + 1);
}

function optimizedUrl(src: string, w: number, q: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

type SmartImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string | null | undefined;
  /** Widest CSS px the image is ever rendered at, before device pixel ratio. */
  maxWidth: number;
  /**
   * Explicit srcSet ladder, for images whose rendered width varies a lot across
   * breakpoints (full-bleed heroes). Values must come from ALLOWED_WIDTHS.
   */
  widths?: number[];
  /** Must be listed in `images.qualities` in next.config.ts. */
  quality?: 75 | 90;
};

export function SmartImg({
  src,
  maxWidth,
  widths: widthsProp,
  quality = 75,
  sizes,
  loading = "lazy",
  decoding = "async",
  alt = "",
  ...rest
}: SmartImgProps) {
  if (!src || !isOptimizable(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src ?? ""} alt={alt} loading={loading} decoding={decoding} {...rest} />;
  }

  const widths = widthsProp ?? widthsFor(maxWidth);
  const srcSet = widths.map((w) => `${optimizedUrl(src, w, quality)} ${w}w`).join(", ");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimizedUrl(src, widths[widths.length - 1], quality)}
      srcSet={srcSet}
      sizes={sizes ?? `${maxWidth}px`}
      alt={alt}
      loading={loading}
      decoding={decoding}
      {...rest}
    />
  );
}
