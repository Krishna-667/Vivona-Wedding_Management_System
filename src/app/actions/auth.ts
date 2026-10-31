"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile, getRoleDashboardPath } from "@/lib/auth/session";
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

export async function signInAction(formData: FormData): Promise<ActionResponse<{ role: UserRole; redirectTo: string }>> {
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

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: error?.message || "Invalid email or password.",
    };
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  const role = (profile?.role as UserRole) || "client";
  const redirectTo = getRoleDashboardPath(role);

  return {
    ok: true,
    data: { role, redirectTo },
  };
}

export async function signUpAction(formData: FormData): Promise<ActionResponse<{ message: string }>> {
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

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      },
    },
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    data: {
      message: "Registration successful. You can now log into your client portal.",
    },
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function inviteEmployeeAction(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  // Ensure the requesting user is an active Admin
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

  const adminClient = createAdminClient();

  // Create auth user or invite
  const tempPassword = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
    },
  });

  if (createError || !userData.user) {
    return { ok: false, error: createError?.message || "Failed to create employee account." };
  }

  // Update profile with employee role and rate
  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userData.user.id,
    role: "employee",
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    hourly_rate_paise: parsed.data.hourlyRatePaise,
    is_active: true,
  });

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  // Log audit event
  await adminClient.from("audit_events").insert({
    actor_id: session.profile.id,
    action: "INVITE_EMPLOYEE",
    entity_type: "profiles",
    entity_id: userData.user.id,
    new_data: { email: parsed.data.email, role: "employee" },
  });

  return { ok: true, data: { id: userData.user.id } };
}
