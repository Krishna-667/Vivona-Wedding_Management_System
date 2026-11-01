import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withService } from "@/lib/db/with-user";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email?: boolean;
  email_verified?: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

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
 * Handles the OAuth 2.0 callback from Google.
 * Verifies state, exchanges code for tokens with PKCE verifier,
 * cryptographically validates Google user identity, and establishes a secure DB session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Google OAuth returned error:", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google Sign-In was cancelled or denied.")}`, origin)
    );
  }

  const cookieStore = cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;
  const savedVerifier = cookieStore.get("google_oauth_verifier")?.value;
  const savedRedirect = cookieStore.get("google_oauth_redirect")?.value || "/client";

  // Cleanup temporary OAuth cookies
  cookieStore.delete("google_oauth_state");
  cookieStore.delete("google_oauth_verifier");
  cookieStore.delete("google_oauth_redirect");

  // Validate state against CSRF
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Invalid OAuth state token. Please try again.")}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("No authorization code returned from Google.")}`, origin)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google OAuth credentials not configured on server.")}`, origin)
    );
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code with PKCE verifier for access & ID tokens
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    if (savedVerifier) {
      tokenParams.set("code_verifier", savedVerifier);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Failed to exchange Google OAuth code:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            tokenData.error_description || "Failed to exchange authentication code with Google."
          )}`,
          origin
        )
      );
    }

    // 2. Fetch authenticated and verified user profile from Google UserInfo
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = (await userinfoRes.json()) as GoogleUserInfo;

    if (!userinfoRes.ok || !googleUser.email) {
      console.error("Failed to fetch Google user profile:", googleUser);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("Failed to fetch verified profile from Google.")}`, origin)
      );
    }

    // 3. Ensure the Google email has been verified by Google
    const isEmailVerified = googleUser.verified_email ?? googleUser.email_verified ?? false;
    if (!isEmailVerified) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            "Your Google email is not verified. Please verify your Google account first."
          )}`,
          origin
        )
      );
    }

    // 4. Provision or link client account in database
    const email = googleUser.email.toLowerCase().trim();
    const fullName = googleUser.name || "Client (Google Auth)";
    const avatarUrl = googleUser.picture || null;

    const profile = await withService(async (sql) => {
      let [existing] = await sql`
        SELECT id, email, role, full_name, avatar_url, is_active
        FROM public.profiles
        WHERE LOWER(email) = LOWER(${email})
      `;

      if (!existing) {
        // Enforce Rule 0.3: Public/Google registration provisions client role only
        [existing] = await sql`
          INSERT INTO public.profiles (email, full_name, avatar_url, role, is_active)
          VALUES (${email}, ${fullName}, ${avatarUrl}, 'client', true)
          RETURNING id, email, role, full_name, avatar_url, is_active
        `;
      } else if (avatarUrl && !existing.avatar_url) {
        // Update avatar if not already present
        await sql`
          UPDATE public.profiles
          SET avatar_url = ${avatarUrl}, updated_at = NOW()
          WHERE id = ${existing.id}
        `;
      }

      return existing;
    });

    if (!profile.is_active) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("This account has been deactivated.")}`, origin)
      );
    }

    // 5. Establish authenticated database-backed session
    await createSession(profile.id);

    // 6. Route to role-specific dashboard
    let targetPath = savedRedirect.startsWith("/") ? savedRedirect : "/client";
    if (profile.role === "admin") {
      targetPath = "/admin";
    } else if (profile.role === "employee") {
      targetPath = "/employee";
    }

    return NextResponse.redirect(new URL(targetPath, origin));
  } catch (err) {
    console.error("Unexpected Google OAuth callback exception:", err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("An unexpected error occurred during Google Sign-In.")}`, origin)
    );
  }
}
