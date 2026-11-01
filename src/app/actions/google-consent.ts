"use server";

import { z } from "zod";
import { withService } from "@/lib/db/with-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueLocalGoogleAuthCode } from "@/lib/auth/google-local";
import type { UserRole } from "@/types/database";

export interface GoogleAccountLookupResult {
  email: string;
  exists: boolean;
  name?: string;
  role?: UserRole;
}

/**
 * Checks if a Google account is registered in Vivona and returns public account details.
 */
export async function lookupGoogleAccountAction(
  email: string
): Promise<{ ok: true; data: GoogleAccountLookupResult } | { ok: false; error: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const parsed = z.string().email().safeParse(cleanEmail);
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const profile = await withService(async (sql) => {
    const [row] = await sql`
      SELECT id, email, full_name, role
      FROM public.profiles
      WHERE LOWER(email) = LOWER(${cleanEmail})
    `;
    return row;
  });

  if (profile) {
    return {
      ok: true,
      data: {
        email: profile.email,
        exists: true,
        name: profile.full_name,
        role: profile.role as UserRole,
      },
    };
  }

  return {
    ok: true,
    data: {
      email: cleanEmail,
      exists: false,
      name: cleanEmail.split("@")[0],
      role: "client",
    },
  };
}

/**
 * Verifies credentials for the Google account and issues an authenticated OAuth code.
 * Rejects invalid passwords to ensure the email is genuine and authorized.
 */
export async function verifyAndAuthorizeGoogleAction(data: {
  email: string;
  password: string;
  name?: string;
  state: string;
  redirectUri: string;
}): Promise<{ ok: true; callbackUrl: string } | { ok: false; error: string }> {
  const cleanEmail = data.email.toLowerCase().trim();
  const password = data.password;

  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  try {
    // 1. Check if user already exists
    const userRecord = await withService(async (sql) => {
      const [row] = await sql`
        SELECT
          p.id,
          p.email,
          p.role,
          p.full_name,
          p.is_active,
          c.password_hash
        FROM public.profiles p
        LEFT JOIN private.auth_credentials c ON c.profile_id = p.id
        WHERE LOWER(p.email) = LOWER(${cleanEmail})
      `;
      return row;
    });

    let verifiedName = data.name?.trim() || cleanEmail.split("@")[0];

    if (userRecord) {
      if (!userRecord.is_active) {
        return { ok: false, error: "This account has been deactivated." };
      }

      // 2. Existing account: Strictly verify argon2id password
      const isValid = await verifyPassword(password, userRecord.password_hash);
      if (!isValid) {
        return { ok: false, error: "Wrong password. Try again or check your credentials." };
      }
      verifiedName = userRecord.full_name;
    } else {
      // 3. New account: Provisions new client account (Rule 0.3: client role only)
      const hashedPassword = await hashPassword(password);
      await withService(async (sql) => {
        const [newProfile] = await sql`
          INSERT INTO public.profiles (email, full_name, role, is_active)
          VALUES (${cleanEmail}, ${verifiedName}, 'client', true)
          RETURNING id
        `;

        await sql`
          INSERT INTO private.auth_credentials (profile_id, password_hash)
          VALUES (${newProfile.id}, ${hashedPassword})
        `;
      });
    }

    // 4. Issue HMAC-SHA256 signed OAuth authorization code with CSRF state
    const code = issueLocalGoogleAuthCode({
      email: cleanEmail,
      name: verifiedName,
      state: data.state,
    });

    const baseOrigin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const callbackUrl = new URL(data.redirectUri, baseOrigin);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", data.state);

    return { ok: true, callbackUrl: callbackUrl.toString() };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify Google account.";
    return { ok: false, error: message };
  }
}
