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
  const isAuthPage = path === "/login" || path === "/register";

  const hasSessionCookie = Boolean(
    request.cookies.get("vivona_session")?.value ||
    request.cookies.get("__Host-vivona_session")?.value
  );

  // 2. Protected routes require active session cookie
  if ((isProtectedAdmin || isProtectedEmployee || isProtectedClient) && !hasSessionCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
