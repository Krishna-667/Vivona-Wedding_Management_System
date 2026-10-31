import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { formatPaise } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Scheduled Cron Handler: Reminders & SLA Guard
 * Executed periodically by any scheduler (Vercel Cron, GitHub Actions, cron-job.org)
 * or triggered on-demand via the Admin Dashboard.
 *
 * Security: Protected by Bearer token matching CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  return handleCronReminders(req);
}

export async function POST(req: NextRequest) {
  return handleCronReminders(req);
}

async function handleCronReminders(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "dev-cron-secret-key-2026";
  const providedSecret = authHeader?.replace("Bearer ", "") || req.headers.get("x-cron-secret");

  // Validate Secret (allow in dev with fallback secret)
  if (providedSecret !== cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized. Invalid CRON_SECRET." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 1. Stale Enquiries Check (>48h without follow-up)
    const { data: staleEnquiries } = await admin
      .from("enquiries")
      .select("id, code, contact_name, city, created_at")
      .eq("status", "new")
      .lt("created_at", fortyEightHoursAgo);

    let staleCount = 0;
    if (staleEnquiries && staleEnquiries.length > 0) {
      staleCount = staleEnquiries.length;
      const { data: adminUsers } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", true);

      if (adminUsers && adminUsers.length > 0) {
        for (const enq of staleEnquiries) {
          const notifications = adminUsers.map((u) => ({
            user_id: u.id,
            title: `⚠️ Overdue Follow-up: ${enq.code}`,
            body: `Enquiry from ${enq.contact_name} (${enq.city}) has been waiting over 48 hours without contact. SLA breach imminent.`,
            type: "stale_enquiry_alert",
            data: { enquiry_id: enq.id, code: enq.code },
          }));
          await admin.from("notifications").insert(notifications);
        }
      }
    }

    // 2. Upcoming / Overdue Payment Milestones
    const { data: dueMilestones } = await admin
      .from("payment_milestones")
      .select("id, wedding_id, title, amount_paise, due_date, weddings(code, client_id)")
      .eq("status", "pending")
      .lte("due_date", sevenDaysFromNow);

    let milestoneCount = 0;
    if (dueMilestones && dueMilestones.length > 0) {
      milestoneCount = dueMilestones.length;
      for (const m of dueMilestones) {
        const wedding = m.weddings as unknown as { code: string; client_id: string } | null;
        if (wedding?.client_id) {
          await admin.from("notifications").insert({
            user_id: wedding.client_id,
            title: `Payment Milestone Reminder: ${m.title}`,
            body: `A milestone payment of ${formatPaise(BigInt(m.amount_paise))} for wedding ${wedding.code} is due on ${m.due_date}.`,
            type: "payment_reminder",
            data: { milestone_id: m.id, wedding_code: wedding.code },
          });
        }
      }
    }

    // 3. Upcoming / Overdue Tasks
    const { data: overdueTasks } = await admin
      .from("tasks")
      .select("id, title, owner_id, due_date, stage")
      .neq("stage", "done")
      .lte("due_date", new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

    let taskCount = 0;
    if (overdueTasks && overdueTasks.length > 0) {
      taskCount = overdueTasks.length;
      for (const t of overdueTasks) {
        await admin.from("notifications").insert({
          user_id: t.owner_id,
          title: `Task Reminder: ${t.title}`,
          body: `Task is due on ${t.due_date} (Current status: ${t.stage}).`,
          type: "task_reminder",
          data: { task_id: t.id },
        });
      }
    }

    // Optional: Email digest to Admin if items require attention
    if (staleCount > 0 || milestoneCount > 0 || taskCount > 0) {
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || "admin@vivona.demo";
      await sendEmail({
        to: adminEmail,
        subject: `[Daily Operations Digest] ${staleCount} Stale Enquiries · ${milestoneCount} Milestones Due`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Daily Operations Reminder Digest</h2>
            <p>The automated reminders job just completed execution:</p>
            <ul>
              <li><strong>Stale Enquiries (>48h SLA):</strong> ${staleCount}</li>
              <li><strong>Pending Milestones (Due ≤7 days):</strong> ${milestoneCount}</li>
              <li><strong>Tasks Due / Overdue (Due ≤2 days):</strong> ${taskCount}</li>
            </ul>
            <p>All affected coordinators and clients have been alerted via in-app notifications.</p>
          </div>
        `,
        text: `Daily Digest: ${staleCount} stale enquiries, ${milestoneCount} due milestones, ${taskCount} tasks due.`,
      });
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      summary: {
        staleEnquiriesProcessed: staleCount,
        milestonesProcessed: milestoneCount,
        tasksProcessed: taskCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
