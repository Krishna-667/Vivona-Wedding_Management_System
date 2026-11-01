"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { withAuth, withService } from "@/lib/db/with-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isAccountLocked, recordLoginAttempt } from "@/lib/auth/lockout";
import {
  createSession,
  destroySession,
  getSessionProfile,
  getRoleDashboardPath,
} from "@/lib/auth/session";
import {
  createAuthChallenge,
  unsealCredentials,
  type AuthChallenge,
  type SealedPayload,
} from "@/lib/auth/seal";
import { encryptField, computeBlindIndex } from "@/lib/crypto/field-encryption";
import type { UserRole } from "@/types/database";

const SignInSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const SignUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  phone: z.string().optional(),
});

const InviteEmployeeSchema = z.object({
  email: z.string().email("Valid email required."),
  fullName: z.string().min(2, "Full name required."),
  phone: z.string().optional(),
  hourlyRatePaise: z.number().int().nonnegative().default(100000), // Default ₹1000/hr
});

export type ActionResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Generates an ephemeral challenge nonce and returns the RSA public key
 * for client-side hybrid credential sealing (Requirement R5 / Phase 2).
 */
export async function getAuthChallengeAction(): Promise<ActionResponse<AuthChallenge>> {
  try {
    const challenge = await createAuthChallenge();
    return { ok: true, data: challenge };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate security challenge.";
    return { ok: false, error: message };
  }
}

/**
 * Sealed (Encrypted) Sign In Action
 * The client browser encrypts the credentials using RSA-OAEP-256 + AES-256-GCM.
 * The plaintext password NEVER travels in transit or appears in DevTools Network tab.
 */
export async function signInSealedAction(
  sealed: SealedPayload
): Promise<ActionResponse<{ role: UserRole; redirectTo: string }>> {
  try {
    // 1. Unseal and decrypt credentials on server
    const { email, password } = await unsealCredentials(sealed);
    const cleanEmail = email.toLowerCase().trim();

    // 2. Check account lockout (5 failures in 15 min)
    if (await isAccountLocked(cleanEmail)) {
      return {
        ok: false,
        error: "Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.",
      };
    }

    // 3. Query profile and credential
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

    // 4. Verify argon2id password
    const isValid = await verifyPassword(password, userRecord?.password_hash);
    await recordLoginAttempt(cleanEmail, isValid);

    if (!isValid || !userRecord || !userRecord.is_active) {
      await destroySession();
      return {
        ok: false,
        error: "Invalid email or password.",
      };
    }

    // 5. Reset previous sessions, create new database session and set HTTP-only cookie
    await destroySession();
    await createSession(userRecord.id);

    const role = userRecord.role as UserRole;
    const redirectTo = getRoleDashboardPath(role);

    return {
      ok: true,
      data: { role, redirectTo },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to authenticate.";
    return { ok: false, error: message };
  }
}

/**
 * Inspect Google OAuth 2.0 configuration status
 */
export async function getGoogleAuthConfigAction(): Promise<
  ActionResponse<{
    isConfigured: boolean;
    clientId?: string;
    redirectUri: string;
  }>
> {
  const isConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID.trim().length > 0 &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_SECRET.trim().length > 0
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    ok: true,
    data: {
      isConfigured,
      clientId: isConfigured ? process.env.GOOGLE_CLIENT_ID : undefined,
      redirectUri: `${siteUrl}/api/auth/google/callback`,
    },
  };
}

export async function signInWithGoogleAction(): Promise<
  ActionResponse<{ role: UserRole; redirectTo: string }>
> {
  return { ok: true, data: { role: "client", redirectTo: "/api/auth/google" } };
}

export async function signInAction(
  formData: FormData
): Promise<ActionResponse<{ role: UserRole; redirectTo: string }>> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = SignInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input values.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();

  // 1. Check account lockout (5 failures in 15 min)
  if (await isAccountLocked(cleanEmail)) {
    return {
      ok: false,
      error: "Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.",
    };
  }

  // 2. Query profile and credential
  const userRecord = await withAuth(async (sql) => {
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

  // 3. Verify argon2id password
  const isValid = await verifyPassword(password, userRecord?.password_hash);
  await recordLoginAttempt(cleanEmail, isValid);

  if (!isValid || !userRecord || !userRecord.is_active) {
    await destroySession();
    return {
      ok: false,
      error: "Invalid email or password.",
    };
  }

  // 4. Create custom database session and set HTTP-only cookie
  await destroySession();
  await createSession(userRecord.id);

  const role = userRecord.role as UserRole;
  const redirectTo = getRoleDashboardPath(role);

  return {
    ok: true,
    data: { role, redirectTo },
  };
}

export async function signUpAction(
  formData: FormData
): Promise<ActionResponse<{ message: string }>> {
  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
  };

  const parsed = SignUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the errors in the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { fullName, email, password, phone } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();

  try {
    const existing = await withService(async (sql) => {
      const [row] = await sql`
        SELECT id FROM public.profiles WHERE LOWER(email) = LOWER(${cleanEmail})
      `;
      return row;
    });

    if (existing) {
      return {
        ok: false,
        error: "An account with this email address already exists. Please sign in instead.",
      };
    }

    const hashedPassword = await hashPassword(password);
    const encPhone = encryptField("profiles", "phone", phone);
    const phoneBidx = computeBlindIndex(phone);

    await withService(async (sql) => {
      // 1. Create profile (client role only)
      const [profile] = await sql`
        INSERT INTO public.profiles (full_name, email, role, phone, phone_bidx, is_active)
        VALUES (${fullName}, ${cleanEmail}, 'client', ${encPhone}, ${phoneBidx}, true)
        RETURNING id
      `;

      // 2. Store argon2id password in private.auth_credentials
      await sql`
        INSERT INTO private.auth_credentials (profile_id, password_hash)
        VALUES (${profile.id}, ${hashedPassword})
      `;
    });

    return {
      ok: true,
      data: {
        message: "Registration successful. You can now log into your client portal.",
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed.";
    if (message.includes("profiles_email_key") || message.includes("duplicate key")) {
      return { ok: false, error: "An account with this email address already exists." };
    }
    return { ok: false, error: "Registration failed. Please try again." };
  }
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function inviteEmployeeAction(
  formData: FormData
): Promise<ActionResponse<{ id: string }>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized: Only administrators can invite employees." };
  }

  const raw = {
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    hourlyRatePaise: Number(formData.get("hourlyRatePaise")) || 100000,
  };

  const parsed = InviteEmployeeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid employee invitation details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, fullName, phone, hourlyRatePaise } = parsed.data;
  const tempPassword = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";
  const hashedPassword = await hashPassword(tempPassword);
  const encPhone = encryptField("profiles", "phone", phone);
  const phoneBidx = computeBlindIndex(phone);

  const employeeId = await withService(async (sql) => {
    // 1. Insert or update employee profile
    const [emp] = await sql`
      INSERT INTO public.profiles (
        email, full_name, role, phone, phone_bidx, hourly_rate_paise, is_active
      ) VALUES (
        ${email}, ${fullName}, 'employee', ${encPhone}, ${phoneBidx}, ${hourlyRatePaise}, true
      )
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'employee',
        phone = EXCLUDED.phone,
        phone_bidx = EXCLUDED.phone_bidx,
        hourly_rate_paise = EXCLUDED.hourly_rate_paise,
        is_active = true
      RETURNING id
    `;

    // 2. Set credentials
    await sql`
      INSERT INTO private.auth_credentials (profile_id, password_hash)
      VALUES (${emp.id}, ${hashedPassword})
      ON CONFLICT (profile_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash
    `;

    // 3. Record audit event
    await sql`
      INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, new_data)
      VALUES (
        ${session.profile.id},
        'INVITE_EMPLOYEE',
        'profiles',
        ${emp.id},
        ${sql.json({ email, role: "employee" })}
      )
    `;

    return emp.id;
  });

  return { ok: true, data: { id: employeeId } };
}

/**
 * Updates the user's password securely with argon2id.
 * Verifies current password if provided, and enforces minimum 8 characters.
 */
export async function updatePasswordAction(data: {
  currentPassword?: string;
  newPassword: string;
}): Promise<ActionResponse<{ message: string }>> {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return { ok: false, error: "Unauthorized: Please sign in to change your password." };
    }

    if (!data.newPassword || data.newPassword.length < 8) {
      return { ok: false, error: "New password must be at least 8 characters long." };
    }

    const userId = session.profile.id;

    if (data.currentPassword) {
      const cred = await withService(async (sql) => {
        const [row] = await sql`
          SELECT password_hash FROM private.auth_credentials WHERE profile_id = ${userId}
        `;
        return row;
      });

      if (cred?.password_hash) {
        const isValid = await verifyPassword(data.currentPassword, cred.password_hash);
        if (!isValid) {
          return { ok: false, error: "Current password does not match." };
        }
      }
    }

    const newHash = await hashPassword(data.newPassword);

    await withService(async (sql) => {
      await sql`
        INSERT INTO private.auth_credentials (profile_id, password_hash)
        VALUES (${userId}, ${newHash})
        ON CONFLICT (profile_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
      `;

      await sql`
        INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, new_data)
        VALUES (${userId}, 'CHANGE_PASSWORD', 'profiles', ${userId}, ${sql.json({ changed: true })})
      `;
    });

    return { ok: true, data: { message: "Password updated successfully!" } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update password.";
    return { ok: false, error: message };
  }
}
