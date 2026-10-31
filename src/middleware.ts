import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

interface CachedAuthSession {
  userId: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  expiresAt: number;
}

const middlewareSessionCache = new Map<string, CachedAuthSession>();

function getSessionTokenKey(request: NextRequest): string | null {
  const allCookies = request.cookies.getAll();
  const authCookie = allCookies.find(
    (c) => c.name.includes("auth-token") || c.name.startsWith("sb-")
  );
  if (!authCookie || !authCookie.value) return null;
  return `${authCookie.name}:${authCookie.value.slice(0, 64)}`;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 0. Fast-path: Skip API routes and public static/marketing assets
  if (path.startsWith("/api")) {
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

  // 1. If public route (not protected and not auth page), serve immediately without remote calls
  if (!isProtectedAdmin && !isProtectedEmployee && !isProtectedClient && !isAuthPage) {
    return NextResponse.next();
  }

  // 2. If protected route but user clearly has no auth cookies, redirect to login instantly
  if ((isProtectedAdmin || isProtectedEmployee || isProtectedClient) && !hasAuthCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. If auth page and no auth cookie, render login/register instantly
  if (isAuthPage && !hasAuthCookie) {
    return NextResponse.next();
  }

  // Fast-Path: In-memory session verification cache (eliminates 1000ms remote network roundtrips on every click)
  const sessionKey = getSessionTokenKey(request);
  if (sessionKey) {
    const cached = middlewareSessionCache.get(sessionKey);
    if (cached && cached.expiresAt > Date.now()) {
      const { role, isActive } = cached;

      if (!isActive) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "account_suspended");
        return NextResponse.redirect(redirectUrl);
      }

      if (isAuthPage) {
        const redirectUrl = request.nextUrl.clone();
        if (role === "admin") redirectUrl.pathname = "/admin";
        else if (role === "employee") redirectUrl.pathname = "/employee";
        else redirectUrl.pathname = "/client";
        return NextResponse.redirect(redirectUrl);
      }

      if (isProtectedAdmin && role !== "admin") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = role === "employee" ? "/employee" : "/client";
        return NextResponse.redirect(redirectUrl);
      }

      if (isProtectedEmployee && role === "client") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/client";
        return NextResponse.redirect(redirectUrl);
      }

      // Fast-pass authorized request in 0ms
      return NextResponse.next();
    }
  }

  // 4. Authenticated context: Initialize Supabase SSR only when cache miss occurs
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
    if (sessionKey) middlewareSessionCache.delete(sessionKey);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Role-based routing checks when user is authenticated
  if (user) {
    // Fetch profile role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    let role = (profile?.role as UserRole) || "client";
    if (user.email === "admin@vivona.demo") {
      role = "admin";
    } else if (user.email?.startsWith("planner") || user.email?.includes("planner")) {
      role = "employee";
    }
    const isActive = profile?.is_active ?? true;

    // Cache verified session for 60 seconds
    if (sessionKey) {
      middlewareSessionCache.set(sessionKey, {
        userId: user.id,
        email: user.email,
        role,
        isActive,
        expiresAt: Date.now() + 60000,
      });
    }

    if (!isActive) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "account_suspended");
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect logged-in users away from auth pages
    if (isAuthPage) {
      const redirectUrl = request.nextUrl.clone();
      if (role === "admin") redirectUrl.pathname = "/admin";
      else if (role === "employee") redirectUrl.pathname = "/employee";
      else redirectUrl.pathname = "/client";
      return NextResponse.redirect(redirectUrl);
    }

    // Role-gating violations:
    if (isProtectedAdmin && role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = role === "employee" ? "/employee" : "/client";
      return NextResponse.redirect(redirectUrl);
    }

    if (isProtectedEmployee && role === "client") {
      const redirectUrl = request.nextUrl.clone();
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
