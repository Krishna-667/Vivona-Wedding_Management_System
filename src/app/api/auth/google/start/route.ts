import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isCookieSecure } from "@/lib/auth/session";
import {
  createGoogleAuthTransaction,
  OAUTH_COOKIE_NAME,
} from "@/lib/auth/google-oauth-service";

export const dynamic = "force-dynamic";

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * GET /api/auth/google/start
 * Rate-limits, creates PKCE verifier, stores state & nonce in single-use DB row,
 * sets HttpOnly, Secure, SameSite=Lax cookie holding row ID, and redirects to Google.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || url.searchParams.get("redirectTo");
  const ip = getClientIp(request);

  try {
    const { url: googleAuthUrl, transactionId } = await createGoogleAuthTransaction(ip, returnTo);

    const cookieStore = cookies();
    // SameSite=Lax is strictly required so cookie is sent when Google redirects back
    cookieStore.set(OAUTH_COOKIE_NAME, transactionId, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
    });

    return NextResponse.redirect(googleAuthUrl);
  } catch (err: unknown) {
    console.error("Google OAuth start error:", err);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return NextResponse.redirect(
      new URL("/login?error=provider_error", origin)
    );
  }
}
