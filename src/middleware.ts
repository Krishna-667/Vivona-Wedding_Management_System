import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 0. Fast-path: Skip API routes and Next.js internal static assets
  if (path.startsWith("/api") || path.startsWith("/_next")) {
    return NextResponse.next();
  }

  const isProtectedAdmin = path.startsWith("/admin");
  const isProtectedEmployee = path.startsWith("/employee");
  const isProtectedClient = path.startsWith("/client");
  const isAuthPage = path === "/login" || path === "/register";

  // Check if any Supabase authentication cookie exists
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") || c.name.includes("auth-token")
  );

  // 1. If public route (not protected and not auth page), serve immediately
  if (!isProtectedAdmin && !isProtectedEmployee && !isProtectedClient && !isAuthPage) {
    return NextResponse.next();
  }

  // 2. If protected route but user has no auth cookies, redirect to login
  if ((isProtectedAdmin || isProtectedEmployee || isProtectedClient) && !hasAuthCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. If auth page and no auth cookie, render login/register directly
  if (isAuthPage && !hasAuthCookie) {
    return NextResponse.next();
  }

  // 4. Authenticated context: Initialize Supabase SSR
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && (isProtectedAdmin || isProtectedEmployee || isProtectedClient)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Role-based routing checks when user is authenticated
  if (user) {
    let role: UserRole = "client";
    if (user.email === "admin@vivona.demo") {
      role = "admin";
    } else if (user.email?.startsWith("planner") || user.email?.includes("planner")) {
      role = "employee";
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

      role = (profile?.role as UserRole) || "client";
      if (profile && profile.is_active === false) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.search = "";
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "account_suspended");
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Redirect logged-in users away from auth pages
    if (isAuthPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.search = ""; // CLEAR search params to prevent infinite redirectTo loops
      if (role === "admin") redirectUrl.pathname = "/admin";
      else if (role === "employee") redirectUrl.pathname = "/employee";
      else redirectUrl.pathname = "/client";
      return NextResponse.redirect(redirectUrl);
    }

    // Role-gating violations:
    if (isProtectedAdmin && role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.search = "";
      redirectUrl.pathname = role === "employee" ? "/employee" : "/client";
      return NextResponse.redirect(redirectUrl);
    }

    if (isProtectedEmployee && role === "client") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.search = "";
      redirectUrl.pathname = "/client";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
