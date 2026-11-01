import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  processGoogleOAuthCallback,
  OAUTH_COOKIE_NAME,
} from "@/lib/auth/google-oauth-service";

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
 * GET /api/auth/google/callback
 * Handles OAuth callback, state verification, token exchange, ID token validation,
 * identity linking according to Step 3 rules, session creation, and role redirection.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = cookies();
  const transactionId = cookieStore.get(OAUTH_COOKIE_NAME)?.value || null;

  // Always delete ephemeral OAuth transaction cookie
  cookieStore.delete(OAUTH_COOKIE_NAME);

  const result = await processGoogleOAuthCallback({
    code,
    state,
    error,
    transactionId,
  });

  if (!result.ok) {
    const errorParam = encodeURIComponent(result.error);
    return NextResponse.redirect(new URL(`/login?error=${errorParam}`, origin));
  }

  // Redirect strictly to the role-determined portal (never public home /)
  return NextResponse.redirect(new URL(result.resolution.redirectTo, origin));
}
