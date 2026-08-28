import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { BOOKING_HOST, BOOKING_URL, SITE_HOST, SITE_URL } from "@/lib/site-url";

// Dashboard routes that require auth — everything else is a public booking page
const DASHBOARD_ROUTES = [
  "/calendar",
  "/clients",
  "/extras",
  "/financials",
  "/insights",
  "/new-booking",
  "/profile",
  "/settings",
  "/usage",
  "/admin",
];

/**
 * Whether this request's routing depends on who the caller is.
 *
 * Middleware runs on nearly every request, so resolving auth unconditionally
 * meant every public booking page view and every crawler hit paid for a session
 * lookup it never used. Only the surfaces that actually branch on identity are
 * listed here; public booking pages (`/[slug]`), the public booking API, the
 * cancel/pay confirmation pages and SEO files skip auth entirely.
 *
 * Deliberately fail-closed: an `/api` route is only treated as public when it
 * is explicitly under `/api/public`, so a new authenticated route added later
 * is covered by default rather than silently exposed.
 */
function needsAuth(pathname: string): boolean {
  // "/" branches: logged-in users are sent to the calendar instead of marketing.
  if (pathname === "/") return true;
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/api/")) return !pathname.startsWith("/api/public");
  return DASHBOARD_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

// Hosts this app owns. Anything NOT listed here is treated as a customer's
// custom domain and looked up in `businesses` — so both of our own hosts MUST
// be here, or the marketing site would fail that lookup and bounce forever.
function isKnownHost(bareHost: string): boolean {
  return (
    bareHost === SITE_HOST ||
    bareHost === BOOKING_HOST ||
    bareHost === "localhost" ||
    bareHost === "127.0.0.1" ||
    bareHost.endsWith(".vercel.app")
  );
}

/**
 * Fully retired. Nothing is served here; every path forwards to the apex.
 * 308 rather than 301 only because it is the method-preserving twin — both are
 * permanent, which is what tells Google the move is canonical.
 */
const RETIRED_HOST = "dashboard.bapita.com";

/**
 * Booking-page slugs a business has since renamed, old → new.
 *
 * Renaming `businesses.slug` orphans every inbound link and every indexed
 * search result pointing at the old path — without an entry here it just
 * 404s. 308 (not the page's own logic) so Google recrawls the old URL as a
 * permanent move and carries its indexing over instead of dropping it.
 */
const SLUG_REDIRECTS: Record<string, string> = {
  "kasa-herzeliya": "good-living-herzeliya",
};

/**
 * The split between our two hosts.
 *
 * book.bapita.com keeps the job it was named for: `/[slug]` booking pages —
 * book.bapita.com/kasa-herzeliya — plus the public API, assets and SEO files
 * those pages need. That is also the URL `[slug]/page.tsx` declares as
 * canonical for a business without its own domain, so moving it would throw
 * away the indexing every one of those pages has accumulated.
 *
 * What left that host is everything aimed at the OWNER rather than at their
 * customers: the marketing pages, `/login`, `/auth` and the dashboard. Those
 * are listed here and forward to the apex, so there is exactly one login URL
 * and exactly one session cookie domain.
 *
 * The list is explicit rather than a slug-shaped regex on purpose: a new
 * dashboard route added later and forgotten here still WORKS on the booking
 * host — it is only in the wrong place — whereas a slug that a pattern
 * misjudged would 404 a live customer's page.
 */
const OWNER_ONLY_PATHS = [
  "/hub",
  "/legacy",
  "/privacy",
  "/terms",
  "/login",
  "/auth",
  ...DASHBOARD_ROUTES,
];

function belongsOnApex(pathname: string): boolean {
  return (
    pathname === "/" ||
    OWNER_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

/**
 * A booking page's language, by slug, for the `x-booking-locale` header.
 *
 * The custom-domain branch below already hands the root layout this header so
 * <html lang>/<html dir> are server-rendered. The very same page reached at
 * book.bapita.com/<slug> never set it, so every Hebrew booking page shipped
 * lang="en" dir="ltr": Google read Hebrew pages as English, and every logical
 * CSS property (padding-inline-start, the sticky header, the card layout)
 * resolved against the wrong writing direction.
 *
 * Memoised per slug because middleware runs on every request and a business's
 * default_lang changes approximately never — one cold miss per warm instance
 * is the whole cost. A short TTL rather than forever so a language switched in
 * the dashboard takes effect without a redeploy.
 *
 * Misses are cached too, and for longer: without that, every hit on a dead
 * single-segment URL — a stale link, a scanner walking /wp-admin, /.env and
 * friends — would be one Supabase round trip, and those arrive in bursts.
 */
const LOCALE_TTL_MS = 5 * 60 * 1000;
const MISS_TTL_MS = 30 * 60 * 1000;
const localeCache = new Map<string, { locale: string | null; at: number }>();

async function bookingLocale(slug: string): Promise<string | null> {
  const hit = localeCache.get(slug);
  if (hit) {
    const ttl = hit.locale === null ? MISS_TTL_MS : LOCALE_TTL_MS;
    if (Date.now() - hit.at < ttl) return hit.locale;
  }

  const anon = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
  const { data, error } = await anon
    .from("businesses")
    .select("default_lang")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();

  // A failed query is not a miss — caching it would pin every booking page to
  // the wrong language for half an hour over one blip. Skip the header this
  // once and let the next request retry.
  if (error) return null;

  // No row: not a booking slug (a 404, a typo, an unpublished business). Fall
  // through untouched rather than guessing a language for a page that has none.
  const locale = data ? (data.default_lang === "en" ? "en" : "he") : null;
  localeCache.set(slug, { locale, at: Date.now() });
  return locale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const bareHost = host.replace(/:\d+$/, "").replace(/^www\./, "");

  // Retired subdomain, and the owner-facing paths that moved off the booking
  // host → the apex, path for path. Runs before anything else so a stale
  // bookmark never reaches auth, tenant lookup or the dashboard gate.
  //
  // The query string is kept deliberately: auth callbacks already sent out
  // carry `code` and `next`, and dropping them breaks password reset mid-flow.
  if (bareHost === RETIRED_HOST || (bareHost === BOOKING_HOST && belongsOnApex(pathname))) {
    return NextResponse.redirect(
      `${SITE_URL}${pathname}${request.nextUrl.search}`,
      308
    );
  }

  // Renamed booking slugs — must run before the locale lookup below, which
  // would otherwise just miss the old slug in `businesses` and 404 it.
  if (bareHost === BOOKING_HOST) {
    const renamed = SLUG_REDIRECTS[pathname.slice(1)];
    if (renamed) {
      return NextResponse.redirect(
        `${BOOKING_URL}/${renamed}${request.nextUrl.search}`,
        308
      );
    }
  }

  // Custom-domain routing — runs before auth/dashboard logic, and never touches it.
  if (!isKnownHost(bareHost)) {
    const isAsset =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/public") ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);

    // SEO files must be served ON the custom domain (host-aware handlers in
    // robots.ts / sitemap.ts), not redirected to the apex — otherwise the
    // domain advertises bapita.com's sitemap and Google can't fetch its own.
    const isSeoFile = pathname === "/sitemap.xml" || pathname === "/robots.txt";

    const anon = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: match } = await anon
      .from("businesses")
      .select("slug, default_lang")
      .eq("custom_domain", bareHost)
      .eq("custom_domain_verified", true)
      .eq("status", "live")
      .maybeSingle();

    if (!match) {
      return NextResponse.redirect(SITE_URL);
    }
    if (pathname === "/") {
      // Pass the business locale to the root layout so the crawler gets a
      // server-rendered lang/dir on its own domain (default HE for custom
      // domains — Israeli booking pages). Own hosts never set this header,
      // so the dashboard/marketing stay lang="en".
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-booking-locale", match.default_lang || "he");
      return NextResponse.rewrite(new URL(`/${match.slug}`, request.url), {
        request: { headers: requestHeaders },
      });
    }
    if (isAsset || isSeoFile) {
      return NextResponse.next();
    }
    return NextResponse.redirect(`${BOOKING_URL}${pathname}`);
  }

  // The Hebrew marketing page. Same mechanism the custom booking domains use:
  // the root layout reads `x-booking-locale` to put lang/dir on <html>, and a
  // child route cannot reach <html> to set them itself. Without this the
  // Hebrew page would render inside dir="ltr" and every logical property on it
  // would point the wrong way.
  if (pathname === "/he" || pathname.startsWith("/he/")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-booking-locale", "he");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // book.bapita.com/<slug> — the booking page on our own hosts, which needs the
  // same server-rendered lang/dir a custom domain already gets.
  //
  // Single path segment, no dot (so /sitemap.xml and /robots.txt fall through to
  // their own handlers) and not an owner-facing path. That last guard is what
  // makes this safe on localhost and *.vercel.app: on book.bapita.com the
  // dashboard was already forwarded to the apex above, but on those hosts
  // /calendar and /settings are still served here and must never be handed a
  // Hebrew RTL document — nor should a business that happens to be slugged
  // "settings" be able to take one over.
  //
  // Deliberately NOT restricted to BOOKING_HOST: a preview deployment has to
  // reproduce this, or the fix cannot be verified before it reaches production.
  const localeSlug = /^\/([^/.]+)$/.exec(pathname)?.[1];
  if (localeSlug && !belongsOnApex(pathname) && !needsAuth(pathname)) {
    const locale = await bookingLocale(localeSlug);
    if (locale) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-booking-locale", locale);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  // Public surfaces never consult auth — this is the booking-page traffic, i.e.
  // the overwhelming majority of requests.
  if (!needsAuth(pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() verifies the access token locally against the project's ES256
  // signing key (JWKS fetched once, then cached) instead of calling the Auth
  // server on every request. It still resolves the session first, so an expiring
  // token is refreshed and the rotated cookies are written exactly as before.
  //
  // The tradeoff versus getUser(): a session revoked server-side stays valid
  // here until the access token expires. That is acceptable for routing — the
  // /admin layout and every /api/admin handler re-check against the Auth server
  // themselves, so the gate below is defense-in-depth, not the only barrier.
  const { data: claimsResult } = await supabase.auth.getClaims();
  const claims = claimsResult?.claims ?? null;
  const isLoggedIn = claims !== null;
  const userEmail = typeof claims?.email === "string" ? claims.email : "";

  // Marketing homepage at "/" (own hosts only) — logged-in users skip straight
  // to the calendar instead of seeing the marketing page. Anonymous users fall
  // through and resolve naturally to src/app/(marketing)/page.tsx.
  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/calendar", request.url));
  }

  // Auth pages — redirect logged-in users to dashboard
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/calendar", request.url));
    }
    return supabaseResponse;
  }

  // Admin gate (defense-in-depth) — API handlers + the /admin layout already check this,
  // but middleware blocks non-admins before they reach either.
  const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];
  const isAdminPath =
    pathname.startsWith("/api/admin") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");
  if (isAdminPath && !ADMIN_EMAILS.includes(userEmail)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL(isLoggedIn ? "/calendar" : "/login", request.url));
  }

  // Dashboard routes require auth
  const isDashboard = DASHBOARD_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
