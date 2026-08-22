import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

function isKnownHost(bareHost: string): boolean {
  return (
    bareHost === "book.bapita.com" ||
    bareHost === "dashboard.bapita.com" ||
    bareHost === "localhost" ||
    bareHost === "127.0.0.1" ||
    bareHost.endsWith(".vercel.app")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const bareHost = host.replace(/:\d+$/, "").replace(/^www\./, "");

  // Retired subdomain: dashboard.bapita.com → book.bapita.com (root goes to /login).
  if (bareHost === "dashboard.bapita.com") {
    const dest = pathname === "/" ? "/login" : pathname;
    // Keep the query string: auth callbacks already sent out carry `code` and
    // `next`, and dropping them breaks password reset mid-flow.
    const search = request.nextUrl.search;
    return NextResponse.redirect(`https://book.bapita.com${dest}${search}`, 308);
  }

  // Custom-domain routing — runs before auth/dashboard logic, and never touches it.
  if (!isKnownHost(bareHost)) {
    const isAsset =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/public") ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);

    // SEO files must be served ON the custom domain (host-aware handlers in
    // robots.ts / sitemap.ts), not redirected to book.bapita — otherwise the
    // domain advertises book.bapita's sitemap and Google can't fetch its own.
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
      return NextResponse.redirect("https://book.bapita.com");
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
    return NextResponse.redirect(`https://book.bapita.com${pathname}`);
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
