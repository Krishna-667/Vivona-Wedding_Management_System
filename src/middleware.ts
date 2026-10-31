import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

export async function middleware(request: NextRequest) {
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

  const path = request.nextUrl.pathname;

  // 0. Skip API routes from middleware profile/session redirection
  if (path.startsWith("/api")) {
    return response;
  }

  // 1. Unauthenticated checks for protected routes
  const isProtectedAdmin = path.startsWith("/admin");
  const isProtectedEmployee = path.startsWith("/employee");
  const isProtectedClient = path.startsWith("/client");

  if (!user && (isProtectedAdmin || isProtectedEmployee || isProtectedClient)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Role-based routing checks when user is authenticated
  if (user) {
    // Fetch profile role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as UserRole) || "client";
    const isActive = profile?.is_active ?? true;

    if (!isActive) {
      // Inactive account
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "account_suspended");
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect logged-in users away from auth pages
    if (path === "/login" || path === "/register") {
      const redirectUrl = request.nextUrl.clone();
      if (role === "admin") redirectUrl.pathname = "/admin";
      else if (role === "employee") redirectUrl.pathname = "/employee";
      else redirectUrl.pathname = "/client";
      return NextResponse.redirect(redirectUrl);
    }

    // Role-gating violations:
    // Admin route requested by non-admin
    if (isProtectedAdmin && role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = role === "employee" ? "/employee" : "/client";
      return NextResponse.redirect(redirectUrl);
    }

    // Employee route requested by pure client
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
