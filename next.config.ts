import type { NextConfig } from "next";

// Storage images are served from the project's own Supabase host. Derived from
// the public env var so the allowlist survives a project/org migration; the
// literal is the current host, kept as a fallback for builds where the env var
// is missing (it must never widen to `*.supabase.co` — that would let any
// Supabase project proxy images through our optimizer).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  } catch {
    return "ixihybsstplqavbpbrlo.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // AVIF first, WebP fallback. Both are far smaller than the source JPEG/PNG
    // at the same visual quality.
    formats: ["image/avif", "image/webp"],
    // Only these values are accepted by /_next/image?q= — SmartImg uses 75 for
    // thumbnails/avatars and 90 for heroes and the lightbox.
    qualities: [75, 90],
    // Optimized derivatives are immutable (upload paths are timestamped), so
    // cache them for a year. This is what keeps Supabase egress near zero:
    // the origin file is fetched once, not once per visitor.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
