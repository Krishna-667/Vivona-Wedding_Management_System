import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { withAuth } from "@/lib/db/with-user";
import type { Profile, UserRole } from "@/types/database";

export const SESSION_COOKIE_NAME = "vivona_session";
const SESSION_TTL_DAYS = 7;

export interface SessionProfileResult {
  user: {
    id: string;
    email?: string;
  };
  profile: Profile;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(profileId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await withAuth(async (sql) => {
    await sql`
      INSERT INTO private.sessions (token_hash, profile_id, expires_at)
      VALUES (${tokenHash}, ${profileId}, ${expiresAt})
    `;
  });

  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return rawToken;
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashToken(token);
    await withAuth(async (sql) => {
      await sql`DELETE FROM private.sessions WHERE token_hash = ${tokenHash}`;
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getSessionProfile = cache(
  async function getSessionProfile(): Promise<SessionProfileResult | null> {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const tokenHash = hashToken(token);

    const result = await withAuth(async (sql) => {
      const [session] = await sql`
        SELECT
          s.id as session_id,
          s.expires_at,
          p.id,
          p.email,
          p.role,
          p.full_name,
          p.phone,
          p.hourly_rate_paise,
          p.is_active,
          p.avatar_url,
          p.created_at,
          p.updated_at
        FROM private.sessions s
        JOIN public.profiles p ON p.id = s.profile_id
        WHERE s.token_hash = ${tokenHash}
          AND s.expires_at > NOW()
          AND p.is_active = true
      `;

      if (!session) {
        return null;
      }

      // Refresh last_seen_at asynchronously
      sql`UPDATE private.sessions SET last_seen_at = NOW() WHERE id = ${session.session_id}`.catch(
        () => {}
      );

      return session;
    });

    if (!result) {
      return null;
    }

    const profile: Profile = {
      id: result.id,
      email: result.email,
      role: result.role as UserRole,
      full_name: result.full_name,
      phone: result.phone,
      hourly_rate_paise: Number(result.hourly_rate_paise),
      is_active: result.is_active,
      avatar_url: result.avatar_url,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };

    return {
      user: {
        id: result.id,
        email: result.email,
      },
      profile,
    };
  }
);

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "employee":
      return "/employee";
    case "client":
    default:
      return "/client";
  }
}
