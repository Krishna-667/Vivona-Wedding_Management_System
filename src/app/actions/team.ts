"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Invites employee account via Supabase Auth Admin (server-side only)
 */
export async function inviteEmployeeAction(formData: {
  fullName: string;
  email: string;
  phone: string;
  hourlyRatePaise: number;
}): Promise<ActionResult<{ userId: string }>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  const admin = createAdminClient();
  const demoPass = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";

  // 1. Create auth user
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: formData.email,
    password: demoPass,
    email_confirm: true,
    user_metadata: {
      full_name: formData.fullName,
      phone: formData.phone,
    },
  });

  if (authErr || !authUser?.user) {
    return { ok: false, error: authErr?.message || "Failed to create user account." };
  }

  const userId = authUser.user.id;

  // 2. Set profile role to employee
  const { error: profileErr } = await admin.from("profiles").upsert({
    id: userId,
    role: "employee",
    full_name: formData.fullName,
    phone: formData.phone,
    hourly_rate_paise: formData.hourlyRatePaise,
    is_active: true,
  });

  if (profileErr) {
    return { ok: false, error: profileErr.message };
  }

  revalidatePath("/admin/team");
  return { ok: true, data: { userId } };
}

/**
 * Assigns an employee (lead planner or coordinator) to a wedding
 */
export async function assignWeddingTeamAction(
  weddingId: string,
  employeeId: string,
  roleOnWedding: "lead_planner" | "coordinator" | "assistant"
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  const admin = createAdminClient();

  // 1. Fetch wedding
  const { data: wedding } = await admin
    .from("weddings")
    .select("id, code, title")
    .eq("id", weddingId)
    .single();

  if (!wedding) return { ok: false, error: "Wedding not found." };

  // 2. Insert or update assignment
  const { error: assignErr } = await admin.from("wedding_assignments").upsert(
    {
      wedding_id: weddingId,
      employee_id: employeeId,
      assigned_by: session.user.id,
      role_on_wedding: roleOnWedding,
    },
    { onConflict: "wedding_id,employee_id" }
  );

  if (assignErr) {
    return { ok: false, error: assignErr.message };
  }

  // 3. Reassign tasks designated for that role if unassigned
  await admin
    .from("tasks")
    .update({ owner_id: employeeId })
    .eq("wedding_id", weddingId)
    .eq("owner_id", session.user.id);

  // 4. Notify employee
  await admin.from("notifications").insert({
    user_id: employeeId,
    title: `Assigned to ${wedding.code}`,
    body: `You have been assigned as ${roleOnWedding.replace(/_/g, " ")} for ${wedding.title}. Task board and operations console are now available.`,
    type: "wedding_assigned",
    data: { wedding_id: weddingId, role: roleOnWedding },
  });

  // 5. Audit log
  await admin.from("audit_events").insert({
    actor_id: session.user.id,
    action: "ASSIGN_EMPLOYEE",
    entity_type: "wedding_assignment",
    entity_id: weddingId,
    new_data: { employee_id: employeeId, role_on_wedding: roleOnWedding },
  });

  revalidatePath(`/admin/weddings/${weddingId}`);
  revalidatePath(`/admin/team`);
  return { ok: true };
}
