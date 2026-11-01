import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { isCookieSecure } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function getRequestOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host && !host.includes("localhost") && !host.includes("127.0.0.1") ? "https" : "http");
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request);
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const redirectTo = url.searchParams.get("redirectTo") || "/client";

  const cookieStore = cookies();
  const secure = isCookieSecure();

  // Save intended redirect target
  cookieStore.set("google_oauth_redirect", redirectTo, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  // 1. If Google Client ID is configured, initiate live Google OAuth 2.0 flow
  if (clientId) {
    const state = randomBytes(24).toString("hex");
    const redirectUri = `${origin}/api/auth/google/callback`;

    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes TTL
    });

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "select_account");

    return NextResponse.redirect(googleAuthUrl.toString());
  }

  // 2. When live Google OAuth credentials are not yet configured:
  // Direct user to the interactive Google Authentication dialog on the login screen
  // where they can enter their own Google account or configure Google Cloud credentials.
  const promptUrl = new URL(
    `/login?googleAuth=prompt&redirectTo=${encodeURIComponent(redirectTo)}`,
    origin
  );
  return NextResponse.redirect(promptUrl);
}
