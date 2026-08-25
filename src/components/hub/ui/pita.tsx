import type { LucideIcon } from "lucide-react";

/**
 * The brand's two physical objects, shared by the hero scene and the pita
 * chapter: a falafel (one product) and a pita bowl (the suite that holds them).
 *
 * Extracted here because the two sections must render byte-identical objects —
 * the whole metaphor depends on the reader recognizing that the falafel drifting
 * in the hero is the same falafel that later drops into the pita.
 */

export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")";

export type FalafelPalette = { highlight: string; base: string; deep: string };

/**
 * Clay palettes per falafel — amber / terracotta / emerald / azure and a few
 * more for the marketing page.
 *
 * Keyed by plain string rather than ProductId since 2026-08-22: the /hub suite
 * page still drops the four products in, but the marketing home drops in the
 * four KINDS OF BUSINESS (hero) and the add-ons you can pick (pricing), and
 * those are not products. The object is the same object either way — that is
 * the whole point of the metaphor — so it takes any id and falls back to the
 * amber if an unknown one ever reaches it.
 */
export const FALAFEL_COLORS: Record<string, FalafelPalette> = {
  // Suite products (the /hub page).
  book: { highlight: "#ffd28a", base: "#e8a01a", deep: "#a06405" },
  social: { highlight: "#ffb082", base: "#e2703a", deep: "#a8460f" },
  bots: { highlight: "#b8d9b0", base: "#679e5a", deep: "#3d6b30" },
  reach: { highlight: "#a8c8e8", base: "#4a7fb5", deep: "#2a4f7a" },

  // Kinds of business (marketing hero) — the four rooms bapita.com sells to.
  salon: { highlight: "#ffd28a", base: "#e8a01a", deep: "#a06405" },
  rental: { highlight: "#ffb082", base: "#e2703a", deep: "#a8460f" },
  clinic: { highlight: "#b8d9b0", base: "#679e5a", deep: "#3d6b30" },
  restaurant: { highlight: "#a8c8e8", base: "#4a7fb5", deep: "#2a4f7a" },

  // Add-ons (marketing pricing) — what fills the pita once the site is built.
  site: { highlight: "#ffd28a", base: "#e8a01a", deep: "#a06405" },
  reminders: { highlight: "#b8d9b0", base: "#679e5a", deep: "#3d6b30" },
  payments: { highlight: "#ffb082", base: "#e2703a", deep: "#a8460f" },
  reviews: { highlight: "#ffe0a0", base: "#d4a017", deep: "#8f6606" },
  seo: { highlight: "#a8c8e8", base: "#4a7fb5", deep: "#2a4f7a" },
  gbp: { highlight: "#cfc0f0", base: "#8b6fd4", deep: "#4f3a8c" },
  calsync: { highlight: "#a8dfe4", base: "#3f9aa6", deep: "#1f5f68" },
};

const DEFAULT_PALETTE = FALAFEL_COLORS.book;

export function falafelPalette(id: string): FalafelPalette {
  return FALAFEL_COLORS[id] ?? DEFAULT_PALETTE;
}

export function Falafel({
  id,
  size,
  icon: Icon,
  className,
}: {
  id: string;
  /** Any CSS length — callers pass clamped values so the ball scales with the viewport. */
  size: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const pal = falafelPalette(id);
  return (
    <div
      className={`orb-ball relative flex items-center justify-center ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 26%, ${pal.highlight} 0%, ${pal.base} 42%, ${pal.deep} 100%)`,
        boxShadow: [
          "inset 6px 9px 14px rgba(255, 250, 240, 0.4)",
          "inset -9px -12px 20px rgba(110, 63, 23, 0.28)",
          "inset -2px -3px 4px rgba(255, 236, 208, 0.45)",
          "0 16px 28px -12px rgba(110, 63, 23, 0.35)",
        ].join(", "),
      }}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ backgroundImage: GRAIN, opacity: 0.16, mixBlendMode: "overlay" }}
      />
      {Icon && (
        <Icon
          className="h-[36%] w-[36%]"
          style={{
            color: "rgba(42, 29, 20, 0.55)",
            filter: "drop-shadow(0 1px 0 rgba(255, 255, 255, 0.35))",
          }}
          strokeWidth={2.2}
        />
      )}
    </div>
  );
}

/**
 * The pita bowl. Depth comes from several layered gradients per surface (base
 * tone, directional sheen, far rim-light, ambient occlusion) rather than one
 * flat gradient, and every highlight is a blurred glow instead of a hard line.
 * Percentage radii keep the dome silhouette identical at any width.
 *
 * `data-pocket` is the drop target both scenes animate falafels into.
 */
export function PitaBowl({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div data-bowl className={className} style={style}>
      <div className="relative size-full">
        {/* ambient contact shadow — grounds the object */}
        <div
          className="absolute start-1/2 rounded-full blur-2xl"
          style={{
            top: "4%",
            width: "86%",
            height: "26%",
            translate: "-50% 0",
            background:
              "radial-gradient(ellipse at center, rgba(90, 55, 20, 0.32) 0%, transparent 72%)",
          }}
        />

        {/* Rim — a torus band: base tone + soft glaze highlight + far-edge light */}
        <div
          className="absolute start-0 end-0 top-0 overflow-hidden rounded-full"
          style={{
            height: "19%",
            background:
              "linear-gradient(180deg, #f8dda6 0%, #eebd76 26%, #cd9750 58%, #a8763a 84%, #93642e 100%)",
            boxShadow: [
              "inset 0 4px 0 rgba(255, 250, 235, 0.8)",
              "inset 0 18px 22px rgba(255, 244, 214, 0.6)",
              "inset 0 -20px 26px rgba(90, 52, 16, 0.55)",
              "0 12px 20px rgba(55, 30, 8, 0.22)",
            ].join(", "),
          }}
        >
          <div
            className="absolute"
            style={{
              top: "-30%",
              left: "8%",
              width: "40%",
              height: "140%",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(255, 252, 240, 0.65) 0%, transparent 70%)",
              filter: "blur(4px)",
            }}
          />
          <div
            className="absolute"
            style={{
              top: "10%",
              right: "4%",
              width: "26%",
              height: "80%",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(255, 226, 175, 0.35) 0%, transparent 75%)",
              filter: "blur(3px)",
            }}
          />
        </div>

        {/* Body + its three light layers, all sharing the dome silhouette */}
        {[
          {
            background:
              "radial-gradient(circle at 48% 4%, #f3d6a0 0%, #e0b06a 24%, #c68d48 50%, #97632a 78%, #6d4419 100%)",
            boxShadow: [
              "inset 30px 34px 56px rgba(255, 244, 214, 0.42)",
              "inset -30px -40px 64px rgba(70, 38, 12, 0.72)",
              "inset 0 18px 24px rgba(60, 32, 10, 0.35)",
              "0 46px 72px -20px rgba(60, 34, 12, 0.45)",
            ].join(", "),
          },
          {
            background:
              "radial-gradient(ellipse 44% 28% at 24% 10%, rgba(255, 246, 220, 0.6) 0%, transparent 65%)",
          },
          {
            background:
              "radial-gradient(ellipse 58% 38% at 84% 32%, rgba(255, 205, 140, 0.25) 0%, transparent 70%)",
          },
          {
            background:
              "radial-gradient(ellipse 70% 24% at 50% 100%, rgba(40, 20, 6, 0.4) 0%, transparent 70%)",
          },
        ].map((layer, i) => (
          <div
            key={i}
            className="pointer-events-none absolute inset-0"
            style={{
              top: "9%",
              borderRadius: "0 0 53% 53% / 0 0 75% 67%",
              ...layer,
            }}
          />
        ))}

        {/* Pocket — deep concave opening with a catch-light hugging the near lip */}
        <div
          data-pocket
          className="absolute overflow-hidden rounded-full"
          style={{
            top: "4%",
            left: "6%",
            right: "6%",
            height: "20%",
            background:
              "radial-gradient(ellipse at 50% 38%, #2e1a0a 0%, #4c2a11 55%, #6b4020 82%, #7d4d26 100%)",
            boxShadow:
              "inset 0 20px 32px rgba(0, 0, 0, 0.7), inset 0 -4px 8px rgba(190, 130, 78, 0.2)",
          }}
        >
          <div
            className="absolute start-[10%] end-[10%]"
            style={{
              top: "8%",
              height: "22%",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(255, 232, 195, 0.38) 0%, transparent 75%)",
              filter: "blur(2px)",
            }}
          />
        </div>

        {/* grain — ties every layer together as one material */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            top: "9%",
            backgroundImage: GRAIN,
            opacity: 0.14,
            mixBlendMode: "overlay",
            borderRadius: "0 0 53% 53% / 0 0 75% 67%",
          }}
        />
      </div>
    </div>
  );
}
