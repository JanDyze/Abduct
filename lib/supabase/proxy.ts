import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { NEXT_COOKIE, safeNextPath } from "@/lib/next-path";

// Paths reachable without a session. /api/cron checks its own bearer token; /auth/confirm is where
// Google sign-in lands; /offline.html and /sw.js are the installed app's offline page and service
// worker.
const PUBLIC_PATHS = ["/login", "/api/cron", "/auth", "/offline.html", "/sw.js", "/share/receive"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Refreshes the Supabase session cookie and redirects signed-out visitors to /login.
// This is an optimistic check only; pages and actions verify the user again (lib/auth.ts).
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/cron")) return NextResponse.next({ request });

  // When Supabase doesn't accept the requested return address it falls back to the Site URL with
  // the sign-in code on it (/?code=…): hand that to /auth/confirm so the sign-in still finishes.
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    url.search = `?code=${encodeURIComponent(request.nextUrl.searchParams.get("code")!)}&next=/`;
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Don't run code between createServerClient and getClaims: it can cause random sign-outs.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    const next = pathname + search;
    url.pathname = "/login";
    url.search = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
    const redirect = NextResponse.redirect(url);
    // Also remembered in a cookie: Google can come back without `next` (when Supabase falls back
    // to the Site URL), and /auth/confirm picks it up from here.
    if (next !== "/") redirect.cookies.set(NEXT_COOKIE, next, { path: "/", maxAge: 60 * 60, sameSite: "lax", httpOnly: true });
    return redirect;
  }

  if (signedIn && pathname === "/login") {
    const target = new URL(safeNextPath(request.nextUrl.searchParams.get("next")) ?? "/", "http://abduct");
    const url = request.nextUrl.clone();
    url.pathname = target.pathname;
    url.search = target.search;
    return NextResponse.redirect(url);
  }

  return response;
}
