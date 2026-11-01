import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Skip internal assets, static files, and APIs
  if (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  const isProtectedAdmin = path.startsWith("/admin");
  const isProtectedEmployee = path.startsWith("/employee");
  const isProtectedClient = path.startsWith("/client");
  const isProtectedRoute = isProtectedAdmin || isProtectedEmployee || isProtectedClient;

  const hasSessionCookie = Boolean(
    request.cookies.get("vivona_session")?.value ||
    request.cookies.get("__Host-vivona_session")?.value
  );

  // 2. Coarse edge redirect: unauthenticated visits to protected routes immediately redirect to /login
  if (isProtectedRoute && !hasSessionCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. For protected routes, strictly set Cache-Control: no-store to eliminate back-button cache leaks
  const response = NextResponse.next();
  if (isProtectedRoute) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
