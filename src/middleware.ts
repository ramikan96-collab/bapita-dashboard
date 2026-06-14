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

export async function middleware(request: NextRequest) {
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

  const { pathname } = request.nextUrl;

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
