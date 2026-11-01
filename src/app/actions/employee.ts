"use server";

import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/db/with-user";
import { getSessionProfile } from "@/lib/auth/session";
import { encryptField } from "@/lib/crypto/field-encryption";
import {
  UpdateTaskStageSchema,
  LogIncidentSchema,
  ResolveIncidentSchema,
  VendorCheckinSchema,
  ShiftScheduleSchema,
  SendMessageSchema,
  LogTimesheetSchema,
  RequestExtraChargeSchema,
} from "@/lib/validation/employee";
import type { TaskStage, IncidentSeverity } from "@/types/database";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * 1. Update task stage (Kanban moves)
 */
export async function updateTaskStageAction(
  taskId: string,
  stage: TaskStage,
  notes?: string
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || (session.profile.role !== "employee" && session.profile.role !== "admin")) {
      return { ok: false, error: "Unauthorized." };
    }

    UpdateTaskStageSchema.parse({ taskId, stage, notes });

    return withUser(session.profile.id, async (sql) => {
      const [task] = await sql`
        SELECT wedding_id, title FROM public.tasks WHERE id = ${taskId}
      `;

      if (!task) return { ok: false, error: "Task not found." };

      const completedAt = stage === "done" ? new Date().toISOString() : null;

      await sql`
        UPDATE public.tasks
        SET
          stage = ${stage},
          completed_at = ${completedAt},
          notes = COALESCE(${notes || null}, notes),
          updated_at = NOW()
        WHERE id = ${taskId}
      `;

      revalidatePath(`/employee/weddings/${task.wedding_id}/tasks`);
      revalidatePath(`/admin/weddings/${task.wedding_id}`);
      return { ok: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update task stage.";
    return { ok: false, error: message };
  }
}

/**
 * 2. Record vendor check-in on event day
 */
export async function recordCheckinAction(
  checkinId: string,
  status: "arrived" | "late" | "no_show",
  notes?: string
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || (session.profile.role !== "employee" && session.profile.role !== "admin")) {
      return { ok: false, error: "Unauthorized." };
    }

    VendorCheckinSchema.parse({ checkinId, status, notes });

    return withUser(session.profile.id, async (sql) => {
      const [checkin] = await sql`
        SELECT wedding_id, expected_at, grace_minutes
        FROM public.vendor_checkins
        WHERE id = ${checkinId}
      `;

      if (!checkin) return { ok: false, error: "Check-in entry not found." };

      const arrivedAt = status === "arrived" ? new Date().toISOString() : null;

      await sql`
        UPDATE public.vendor_checkins
        SET
          status = ${status},
          arrived_at = ${arrivedAt},
          notes = ${notes || null},
          updated_at = NOW()
        WHERE id = ${checkinId}
      `;

      revalidatePath(`/employee/weddings/${checkin.wedding_id}/live`);
      return { ok: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update vendor check-in.";
    return { ok: false, error: message };
  }
}

/**
 * 3. Log live event incident
 */
export async function logIncidentAction(
  weddingId: string,
  title: string,
  severity: IncidentSeverity,
  description: string
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || (session.profile.role !== "employee" && session.profile.role !== "admin")) {
      return { ok: false, error: "Unauthorized." };
    }

    LogIncidentSchema.parse({ weddingId, title, severity, description });

    return withUser(session.profile.id, async (sql) => {
      const [incident] = await sql`
        INSERT INTO public.incidents (
          wedding_id, title, severity, description, owner_id, status
        ) VALUES (
          ${weddingId}, ${title}, ${severity}, ${description}, ${session.profile.id}, 'open'
        )
        RETURNING id
      `;

      if (severity === "critical" || severity === "high") {
        const assignments = await sql`
          SELECT employee_id FROM public.wedding_assignments WHERE wedding_id = ${weddingId}
        `;

        for (const a of assignments) {
          await sql`
            INSERT INTO public.notifications (user_id, title, body, type, data)
            VALUES (
              ${a.employee_id},
              ${`[ALERT: ${severity.toUpperCase()}] Wedding Incident`},
              ${`${title}: ${description}`},
              'incident_alert',
              ${sql.json({ wedding_id: weddingId, incident_id: incident?.id })}
            )
          `;
        }
      }

      revalidatePath(`/employee/weddings/${weddingId}/live`);
      return { ok: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to log incident.";
    return { ok: false, error: message };
  }
}

/**
 * 4. Resolve live event incident
 */
export async function resolveIncidentAction(
  incidentId: string,
  resolution: string
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || (session.profile.role !== "employee" && session.profile.role !== "admin")) {
      return { ok: false, error: "Unauthorized." };
    }

    ResolveIncidentSchema.parse({ incidentId, resolution });

    return withUser(session.profile.id, async (sql) => {
      const [incident] = await sql`
        SELECT wedding_id FROM public.incidents WHERE id = ${incidentId}
      `;

      if (!incident) return { ok: false, error: "Incident not found." };

      await sql`
        UPDATE public.incidents
        SET
          status = 'resolved',
          resolution = ${resolution},
          resolved_at = NOW(),
          updated_at = NOW()
        WHERE id = ${incidentId}
      `;

      revalidatePath(`/employee/weddings/${incident.wedding_id}/live`);
      return { ok: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to resolve incident.";
    return { ok: false, error: message };
  }
}

/**
 * 5. Shift schedule timeline entries by +N minutes
 */
export async function shiftScheduleAction(
  weddingId: string,
  fromEntryId: string,
  shiftMinutes: number
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || (session.profile.role !== "employee" && session.profile.role !== "admin")) {
      return { ok: false, error: "Unauthorized." };
    }

    ShiftScheduleSchema.parse({ weddingId, fromEntryId, shiftMinutes });

    return withUser(session.profile.id, async (sql) => {
      const [row] = await sql`
        SELECT public.shift_schedule_entries(${weddingId}, ${fromEntryId}, ${shiftMinutes}) as res
      `;

      revalidatePath(`/employee/weddings/${weddingId}/live`);
      return { ok: true, data: row?.res };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to shift schedule.";
    return { ok: false, error: message };
  }
}

/**
 * 6. Send live chat message (Employee or Client)
 */
export async function sendMessageAction(
  weddingId: string,
  body: string
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session) return { ok: false, error: "Authentication required." };

    SendMessageSchema.parse({ weddingId, body });

    return withUser(session.profile.id, async (sql) => {
      let [thread] = await sql`
        SELECT id, client_id FROM public.message_threads WHERE wedding_id = ${weddingId}
      `;

      if (!thread) {
        const [wedding] = await sql`
          SELECT client_id FROM public.weddings WHERE id = ${weddingId}
        `;

        if (!wedding) return { ok: false, error: "Wedding not found." };

        const [newThread] = await sql`
          INSERT INTO public.message_threads (wedding_id, client_id)
          VALUES (${weddingId}, ${wedding.client_id})
          RETURNING id, client_id
        `;
        thread = newThread;
      }

      const encBody = encryptField("messages", "body", body);

      await sql`
        INSERT INTO public.messages (thread_id, sender_id, body)
        VALUES (${thread.id}, ${session.profile.id}, ${encBody})
      `;

      await sql`
        UPDATE public.message_threads
        SET updated_at = NOW()
        WHERE id = ${thread.id}
      `;

      revalidatePath(`/employee/weddings/${weddingId}/messages`);
      revalidatePath("/client/messages");
      return { ok: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send message.";
    return { ok: false, error: message };
  }
}

/**
 * 7. Log timesheet labour hours
 */
export async function logTimesheetAction(
  weddingId: string,
  date: string,
  hours: number,
  notes?: string
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || (session.profile.role !== "employee" && session.profile.role !== "admin")) {
      return { ok: false, error: "Unauthorized." };
    }

    LogTimesheetSchema.parse({ weddingId, date, hours, notes });

    return withUser(session.profile.id, async (sql) => {
      const [profile] = await sql`
        SELECT hourly_rate_paise FROM public.profiles WHERE id = ${session.profile.id}
      `;

      const hourlyRatePaise = profile?.hourly_rate_paise || 120000;

      await sql`
        INSERT INTO public.timesheets (
          wedding_id, employee_id, date, hours, hourly_rate_paise, notes
        ) VALUES (
          ${weddingId}, ${session.profile.id}, ${date}, ${hours}, ${hourlyRatePaise}, ${notes || null}
        )
      `;

      revalidatePath(`/employee/weddings/${weddingId}/timesheet`);
      return { ok: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to log timesheet.";
    return { ok: false, error: message };
  }
}

/**
 * 8. Request on-ground extra charge
 */
export async function requestExtraChargeAction(
  weddingId: string,
  title: string,
  qty: number,
  unitPriceRupees: number,
  reason: string
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || (session.profile.role !== "employee" && session.profile.role !== "admin")) {
      return { ok: false, error: "Unauthorized." };
    }

    RequestExtraChargeSchema.parse({ weddingId, title, qty, unitPriceRupees, reason });

    const unitPricePaise = Math.round(unitPriceRupees * 100);
    const totalPaise = Math.round(qty * unitPricePaise);

    return withUser(session.profile.id, async (sql) => {
      await sql`
        INSERT INTO public.extra_charges (
          wedding_id, requested_by, kind, title, qty, unit_price_paise, total_paise, reason, status
        ) VALUES (
          ${weddingId}, ${session.profile.id}, 'client_extra', ${title}, ${qty},
          ${unitPricePaise}, ${totalPaise}, ${reason}, 'requested'
        )
      `;

      revalidatePath(`/employee/weddings/${weddingId}/extras`);
      revalidatePath(`/admin/weddings/${weddingId}`);
      return { ok: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to request extra charge.";
    return { ok: false, error: message };
  }
}
