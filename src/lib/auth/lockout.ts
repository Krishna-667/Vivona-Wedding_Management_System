import "server-only";
import { withAuth } from "@/lib/db/with-user";

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 15;

export async function isAccountLocked(email: string): Promise<boolean> {
  return withAuth(async (sql) => {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

    const [recent] = await sql`
      SELECT COUNT(*)::int as count
      FROM private.login_attempts
      WHERE email = ${email}
        AND success = false
        AND attempted_at >= ${windowStart}
    `;

    return (recent?.count ?? 0) >= MAX_FAILURES;
  });
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string
): Promise<void> {
  await withAuth(async (sql) => {
    await sql`
      INSERT INTO private.login_attempts (email, ip_address, success)
      VALUES (${email}, ${ipAddress || null}, ${success})
    `;
  });
}
