import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { withService } from "@/lib/db/with-user";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${url.protocol}//${url.host}`;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // 1. If Google Client ID is configured, initiate actual Google OAuth 2.0 flow
  if (clientId) {
    const state = randomBytes(24).toString("hex");
    const redirectUri = `${siteUrl}/api/auth/google/callback`;

    const cookieStore = cookies();
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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

  // 2. Seamless local / offline fallback when GOOGLE_CLIENT_ID is not yet configured
  const demoEmail = "google.couple@vivona.demo";
  const demoName = "Priyamvada & Rohan (Google Auth)";

  const profile = await withService(async (sql) => {
    let [row] = await sql`
      SELECT id, email, role FROM public.profiles WHERE email = ${demoEmail}
    `;
    if (!row) {
      [row] = await sql`
        INSERT INTO public.profiles (email, full_name, role, is_active)
        VALUES (${demoEmail}, ${demoName}, 'client', true)
        RETURNING id, email, role
      `;
    }
    return row;
  });

  await createSession(profile.id);
  return NextResponse.redirect(new URL("/client?auth=google_local", siteUrl));
}
