import { LenisProvider } from "@/components/hub/lenis-provider";
import { ScrollProgress } from "@/components/hub/scroll-progress";

// Shared chrome for every public marketing page on bapita.com: the smooth-scroll
// provider and the top progress bar, nothing else.
//
// Header and footer are NOT here on purpose. The marketing home and the demoted
// suite page at /hub carry different navigation and different footers, and the
// legal pages carry neither — putting one header in this layout is what forced
// the previous version to hard-code a single nav for pages that don't share one.
// Each page composes its own <MarketingNav>/<Footer>.
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <LenisProvider>
      <ScrollProgress />
      {/* This wrapper is load-bearing, not tidiness.
       *
       * The root layout puts `h-full` on <html> AND <body>, which the dashboard
       * needs. That makes <body> exactly 100vh tall with the page overflowing
       * it. A `position: sticky` element is held inside its PARENT's box, so a
       * sticky header parented directly to <body> un-sticks after
       * `100vh - header` of scroll and then rides the content up — which is
       * exactly what <MarketingNav> was doing (stuck for 808px on an 872px
       * viewport, then gone).
       *
       * A plain auto-height block re-parents every marketing page's sticky
       * chrome to a box that IS the full page height, without touching the
       * shared body class the dashboard depends on. */}
      <div>{children}</div>
    </LenisProvider>
  );
}
