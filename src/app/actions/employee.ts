"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
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
 * Helper to assert employee is assigned to the wedding or is an admin
 */
async function assertEmployeeAssigned(weddingId: string) {
  const session = await getSessionProfile();
  if (!session) throw new Error("Authentication required.");

  if (session.profile.role === "admin") {
    return { session, isAdmin: true };
  }

  if (session.profile.role !== "employee") {
    throw new Error("Only employees or admins can perform this operation.");
  }

  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("wedding_assignments")
    .select("id")
    .eq("wedding_id", weddingId)
    .eq("employee_id", session.user.id)
    .maybeSingle();

  if (!assignment) {
    throw new Error("Unauthorized. You are not assigned to this wedding.");
  }

  return { session, isAdmin: false };
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

    const admin = createAdminClient();
    const { data: task, error: fetchErr } = await admin
      .from("tasks")
      .select("wedding_id, title")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) return { ok: false, error: "Task not found." };

    await assertEmployeeAssigned(task.wedding_id);

    const updateData: Record<string, unknown> = {
      stage,
      updated_at: new Date().toISOString(),
    };

    if (stage === "done") {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { error: updateErr } = await admin
      .from("tasks")
      .update(updateData)
      .eq("id", taskId);

    if (updateErr) throw updateErr;

    revalidatePath(`/employee/weddings/${task.wedding_id}/tasks`);
    revalidatePath(`/admin/weddings/${task.wedding_id}`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update task stage." };
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
    VendorCheckinSchema.parse({ checkinId, status, notes });

    const admin = createAdminClient();
    const { data: checkin, error: fetchErr } = await admin
      .from("vendor_checkins")
      .select("wedding_id, expected_at, grace_minutes")
      .eq("id", checkinId)
      .single();

    if (fetchErr || !checkin) return { ok: false, error: "Check-in entry not found." };

    await assertEmployeeAssigned(checkin.wedding_id);

    const arrivedAt = status === "arrived" ? new Date().toISOString() : null;

    const { error: updateErr } = await admin
      .from("vendor_checkins")
      .update({
        status,
        arrived_at: arrivedAt,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkinId);

    if (updateErr) throw updateErr;

    revalidatePath(`/employee/weddings/${checkin.wedding_id}/live`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update vendor check-in." };
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
    const { session } = await assertEmployeeAssigned(weddingId);

    LogIncidentSchema.parse({ weddingId, title, severity, description });

    const admin = createAdminClient();
    const { data: incident, error } = await admin
      .from("incidents")
      .insert({
        wedding_id: weddingId,
        title,
        severity,
        description,
        owner_id: session.user.id,
        status: "open",
      })
      .select("id")
      .single();

    if (error) throw error;

    // If critical alert, notify all assigned employees and admin
    if (severity === "critical" || severity === "high") {
      const { data: assignments } = await admin
        .from("wedding_assignments")
        .select("employee_id")
        .eq("wedding_id", weddingId);

      const notifyRecipients = (assignments || []).map((a) => a.employee_id);

      for (const empId of notifyRecipients) {
        await admin.from("notifications").insert({
          user_id: empId,
          title: `[ALERT: ${severity.toUpperCase()}] Wedding Incident`,
          body: `${title}: ${description}`,
          type: "incident_alert",
          data: { wedding_id: weddingId, incident_id: incident?.id },
        });
      }
    }

    revalidatePath(`/employee/weddings/${weddingId}/live`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to log incident." };
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
    ResolveIncidentSchema.parse({ incidentId, resolution });

    const admin = createAdminClient();
    const { data: incident, error: fetchErr } = await admin
      .from("incidents")
      .select("wedding_id")
      .eq("id", incidentId)
      .single();

    if (fetchErr || !incident) return { ok: false, error: "Incident not found." };

    await assertEmployeeAssigned(incident.wedding_id);

    const { error: updateErr } = await admin
      .from("incidents")
      .update({
        status: "resolved",
        resolution,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", incidentId);

    if (updateErr) throw updateErr;

    revalidatePath(`/employee/weddings/${incident.wedding_id}/live`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to resolve incident." };
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
    await assertEmployeeAssigned(weddingId);
    ShiftScheduleSchema.parse({ weddingId, fromEntryId, shiftMinutes });

    const admin = createAdminClient();

    // Call database RPC
    const { data, error } = await admin.rpc("shift_schedule_entries", {
      p_wedding_id: weddingId,
      p_from_entry_id: fromEntryId,
      p_shift_minutes: shiftMinutes,
    });

    if (error) throw error;

    revalidatePath(`/employee/weddings/${weddingId}/live`);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to shift schedule." };
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

    const admin = createAdminClient();

    // Find or create thread
    let { data: thread } = await admin
      .from("message_threads")
      .select("id, client_id")
      .eq("wedding_id", weddingId)
      .maybeSingle();

    if (!thread) {
      const { data: wedding } = await admin
        .from("weddings")
        .select("client_id")
        .eq("id", weddingId)
        .single();

      if (!wedding) return { ok: false, error: "Wedding not found." };

      const { data: newThread, error: createThreadErr } = await admin
        .from("message_threads")
        .insert({
          wedding_id: weddingId,
          client_id: wedding.client_id,
        })
        .select("id, client_id")
        .single();

      if (createThreadErr || !newThread) {
        throw new Error("Failed to initialize message thread.");
      }
      thread = newThread;
    }

    // Role guard: if employee, must be assigned
    if (session.profile.role === "employee") {
      await assertEmployeeAssigned(weddingId);
    } else if (session.profile.role === "client") {
      if (thread.client_id !== session.user.id) {
        return { ok: false, error: "Unauthorized access to thread." };
      }
    }

    // Insert message
    const { error: msgErr } = await admin.from("messages").insert({
      thread_id: thread.id,
      sender_id: session.user.id,
      body,
    });

    if (msgErr) throw msgErr;

    // Update thread updated_at
    await admin
      .from("message_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", thread.id);

    revalidatePath(`/employee/weddings/${weddingId}/messages`);
    revalidatePath("/client/messages");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to send message." };
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
    const { session } = await assertEmployeeAssigned(weddingId);
    LogTimesheetSchema.parse({ weddingId, date, hours, notes });

    const admin = createAdminClient();

    // Fetch employee hourly rate
    const { data: profile } = await admin
      .from("profiles")
      .select("hourly_rate_paise")
      .eq("id", session.user.id)
      .single();

    const hourlyRatePaise = profile?.hourly_rate_paise || 150000; // default ₹1,500/hr

    const { error: insertErr } = await admin.from("timesheets").insert({
      wedding_id: weddingId,
      employee_id: session.user.id,
      date,
      hours,
      hourly_rate_paise: hourlyRatePaise,
      notes: notes || null,
    });

    if (insertErr) throw insertErr;

    revalidatePath(`/employee/weddings/${weddingId}/timesheet`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to log timesheet." };
  }
}

/**
 * 8. Request on-ground extra charge (e.g. 60 extra guest plates)
 */
export async function requestExtraChargeAction(
  weddingId: string,
  title: string,
  qty: number,
  unitPriceRupees: number,
  reason: string
): Promise<ActionResult> {
  try {
    const { session } = await assertEmployeeAssigned(weddingId);
    RequestExtraChargeSchema.parse({ weddingId, title, qty, unitPriceRupees, reason });

    const admin = createAdminClient();
    const unitPricePaise = Math.round(unitPriceRupees * 100);
    const totalPaise = Math.round(qty * unitPricePaise);

    const { error: insertErr } = await admin.from("extra_charges").insert({
      wedding_id: weddingId,
      requested_by: session.user.id,
      kind: "client_extra",
      title,
      qty,
      unit_price_paise: unitPricePaise,
      total_paise: totalPaise,
      reason,
      status: "requested",
    });

    if (insertErr) throw insertErr;

    revalidatePath(`/employee/weddings/${weddingId}/extras`);
    revalidatePath(`/admin/weddings/${weddingId}`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to request extra charge." };
  }
}
