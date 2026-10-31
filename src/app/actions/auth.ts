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

  // 1. Check account lockout (5 failures in 15 min)
  if (await isAccountLocked(email)) {
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
      WHERE p.email = ${email}
    `;
    return row;
  });

  // 3. Verify argon2id password
  const isValid = await verifyPassword(password, userRecord?.password_hash);
  await recordLoginAttempt(email, isValid);

  if (!isValid || !userRecord || !userRecord.is_active) {
    return {
      ok: false,
      error: "Invalid email or password.",
    };
  }

  // 4. Create custom database session and set HTTP-only cookie
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

  try {
    const hashedPassword = await hashPassword(password);

    await withService(async (sql) => {
      // 1. Create profile (client role only)
      const [profile] = await sql`
        INSERT INTO public.profiles (full_name, email, role, phone, is_active)
        VALUES (${fullName}, ${email}, 'client', ${phone || null}, true)
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

  const employeeId = await withService(async (sql) => {
    // 1. Insert or update employee profile
    const [emp] = await sql`
      INSERT INTO public.profiles (
        email, full_name, role, phone, hourly_rate_paise, is_active
      ) VALUES (
        ${email}, ${fullName}, 'employee', ${phone || null}, ${hourlyRatePaise}, true
      )
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'employee',
        phone = EXCLUDED.phone,
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
