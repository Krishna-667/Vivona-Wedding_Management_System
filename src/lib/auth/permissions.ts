import "server-only";

import { redirect } from "next/navigation";
import { getSessionProfile, type SessionProfileResult } from "@/lib/auth/session";
import type { UserRole } from "@/types/database";

/**
 * Server-side role guard for layouts and server components.
 * Validates active session token, checks that profile is active,
 * and asserts that the profile role is included in allowedRoles.
 * If unauthorized or unauthenticated, redirects to /login.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionProfileResult> {
  const session = await getSessionProfile();
  if (!session || !session.profile.is_active) {
    redirect("/login");
  }
  if (!allowedRoles.includes(session.profile.role)) {
    redirect("/login?error=unauthorized");
  }
  return session;
}

/**
 * Server action guard that returns an error result rather than throwing Next.js redirect.
 */
export async function assertRoleAction(
  allowedRoles: UserRole[]
): Promise<{ ok: true; session: SessionProfileResult } | { ok: false; error: string }> {
  const session = await getSessionProfile();
  if (!session || !session.profile.is_active) {
    return { ok: false, error: "Authentication required." };
  }
  if (!allowedRoles.includes(session.profile.role)) {
    return { ok: false, error: "Unauthorized. Insufficient role permissions." };
  }
  return { ok: true, session };
}
