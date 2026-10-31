"use server";

import { revalidatePath } from "next/cache";
import { withService, withUser } from "@/lib/db/with-user";
import { getSessionProfile } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Invites employee account
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

  const demoPass = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";
  const hashedPassword = await hashPassword(demoPass);

  return withService(async (sql) => {
    const [emp] = await sql`
      INSERT INTO public.profiles (
        email, full_name, role, phone, hourly_rate_paise, is_active
      ) VALUES (
        ${formData.email}, ${formData.fullName}, 'employee',
        ${formData.phone || null}, ${formData.hourlyRatePaise}, true
      )
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'employee',
        phone = EXCLUDED.phone,
        hourly_rate_paise = EXCLUDED.hourly_rate_paise,
        is_active = true
      RETURNING id
    `;

    await sql`
      INSERT INTO private.auth_credentials (profile_id, password_hash)
      VALUES (${emp.id}, ${hashedPassword})
      ON CONFLICT (profile_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash
    `;

    revalidatePath("/admin/team");
    return { ok: true, data: { userId: emp.id } };
  });
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

  return withUser(session.profile.id, async (sql) => {
    const [wedding] = await sql`
      SELECT id, code, title FROM public.weddings WHERE id = ${weddingId}
    `;

    if (!wedding) return { ok: false, error: "Wedding not found." };

    await sql`
      INSERT INTO public.wedding_assignments (
        wedding_id, employee_id, assigned_by, role_on_wedding
      ) VALUES (
        ${weddingId}, ${employeeId}, ${session.profile.id}, ${roleOnWedding}
      )
      ON CONFLICT (wedding_id, employee_id) DO UPDATE SET
        role_on_wedding = EXCLUDED.role_on_wedding,
        assigned_by = EXCLUDED.assigned_by
    `;

    await sql`
      INSERT INTO public.notifications (user_id, title, body, type, data)
      VALUES (
        ${employeeId},
        'Assigned to Wedding Operations',
        ${`You have been assigned as ${roleOnWedding.replace(/_/g, " ")} for wedding ${wedding.code} (${wedding.title}).`},
        'wedding_assigned',
        ${sql.json({ wedding_id: weddingId, role: roleOnWedding })}
      )
    `;

    await sql`
      INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, new_data)
      VALUES (
        ${session.profile.id},
        'ASSIGN_EMPLOYEE',
        'wedding_assignments',
        ${weddingId},
        ${sql.json({ employee_id: employeeId, role: roleOnWedding })}
      )
    `;

    revalidatePath(`/admin/weddings/${weddingId}`);
    revalidatePath(`/admin/team`);
    revalidatePath(`/employee`);
    return { ok: true };
  });
}
