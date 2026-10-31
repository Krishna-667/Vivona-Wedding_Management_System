import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withService } from "@/lib/db/with-user";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${url.protocol}//${url.host}`;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Google OAuth returned error:", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google Sign-In was cancelled or denied.")}`, siteUrl)
    );
  }

  const cookieStore = cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  // Validate state to prevent CSRF attacks
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Invalid OAuth state token. Please try again.")}`, siteUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("No authorization code returned from Google.")}`, siteUrl)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google OAuth credentials not configured on server.")}`, siteUrl)
    );
  }

  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Failed to exchange Google OAuth code:", tokenData);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("Failed to exchange authentication code with Google.")}`, siteUrl)
      );
    }

    // 2. Fetch user profile from Google UserInfo endpoint
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = (await userinfoRes.json()) as GoogleUserInfo;

    if (!userinfoRes.ok || !googleUser.email) {
      console.error("Failed to fetch Google user profile:", googleUser);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("Failed to fetch verified profile from Google.")}`, siteUrl)
      );
    }

    // 3. Provision or link client account in database
    const email = googleUser.email.toLowerCase().trim();
    const fullName = googleUser.name || "Client (Google Auth)";
    const avatarUrl = googleUser.picture || null;

    const profile = await withService(async (sql) => {
      let [existing] = await sql`
        SELECT id, email, role, full_name FROM public.profiles WHERE email = ${email}
      `;

      if (!existing) {
        // Enforce 0.3: Public/Google registration provisions client role only
        [existing] = await sql`
          INSERT INTO public.profiles (email, full_name, avatar_url, role, is_active)
          VALUES (${email}, ${fullName}, ${avatarUrl}, 'client', true)
          RETURNING id, email, role, full_name
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

    // 4. Establish authenticated session
    await createSession(profile.id);

    return NextResponse.redirect(new URL("/client", siteUrl));
  } catch (err) {
    console.error("Unexpected Google OAuth callback exception:", err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("An unexpected error occurred during Google Sign-In.")}`, siteUrl)
    );
  }
}
