import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
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

/**
 * Standard OAuth 2.0 / OpenID Connect authorization code flow with PKCE (RFC 7636).
 * Follows the same pattern as major platforms (Notion, Spotify, Figma, Linear).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request);
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectTo = url.searchParams.get("redirectTo") || "/client";

  // If Google OAuth credentials are not configured on the server, redirect to login with a clear error
  if (!clientId || !clientSecret) {
    const errorMsg =
      "Google Sign-In is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, origin)
    );
  }

  const cookieStore = cookies();
  const secure = isCookieSecure();

  // 1. Generate CSRF state token
  const state = randomBytes(24).toString("hex");

  // 2. Generate PKCE code verifier and code challenge (RFC 7636)
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  // 3. Save state, PKCE verifier, and intended redirect in secure HTTP-only cookies
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes TTL
  });

  cookieStore.set("google_oauth_verifier", codeVerifier, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  cookieStore.set("google_oauth_redirect", redirectTo, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  // 4. Construct official Google OAuth 2.0 authorization URL
  const redirectUri = `${origin}/api/auth/google/callback`;
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("code_challenge", codeChallenge);
  googleAuthUrl.searchParams.set("code_challenge_method", "S256");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");

  // 5. Redirect user to Google's official sign-in page
  return NextResponse.redirect(googleAuthUrl.toString());
}
