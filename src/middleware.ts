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

  // Custom-domain routing — runs before auth/dashboard logic, and never touches it.
  if (!isKnownHost(bareHost)) {
    const isAsset =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/public") ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);

    const anon = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: match } = await anon
      .from("businesses")
      .select("slug")
      .eq("custom_domain", bareHost)
      .eq("custom_domain_verified", true)
      .eq("status", "live")
      .maybeSingle();

    if (!match) {
      return NextResponse.redirect("https://book.bapita.com");
    }
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/${match.slug}`, request.url));
    }
    if (isAsset) {
      return NextResponse.next();
    }
    return NextResponse.redirect(`https://book.bapita.com${pathname}`);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth pages — redirect logged-in users to dashboard
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    if (user) {
      return NextResponse.redirect(new URL("/calendar", request.url));
    }
    return supabaseResponse;
  }

  // Public API routes
  if (pathname.startsWith("/api/public")) {
    return supabaseResponse;
  }

  // Admin gate (defense-in-depth) — API handlers + the /admin layout already check this,
  // but middleware blocks non-admins before they reach either.
  const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];
  const isAdminPath =
    pathname.startsWith("/api/admin") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");
  if (isAdminPath && !ADMIN_EMAILS.includes(user?.email ?? "")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL(user ? "/calendar" : "/login", request.url));
  }

  // Dashboard routes require auth
  const isDashboard = DASHBOARD_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (isDashboard && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Everything else (booking pages at /[slug]) is public
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
