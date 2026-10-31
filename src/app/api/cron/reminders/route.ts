import { NextRequest, NextResponse } from "next/server";
import { withService } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

  if (providedSecret !== cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized. Invalid CRON_SECRET." }, { status: 401 });
  }

  try {
    return await withService(async (sql) => {
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // 1. Stale Enquiries Check (>48h without follow-up)
      const staleEnquiries = await sql`
        SELECT id, code, contact_name, city, created_at
        FROM public.enquiries
        WHERE status = 'new' AND created_at < ${fortyEightHoursAgo}
      `;

      let staleCount = staleEnquiries.length;
      if (staleCount > 0) {
        const adminUsers = await sql`
          SELECT id FROM public.profiles WHERE role = 'admin' AND is_active = true
        `;

        for (const enq of staleEnquiries) {
          for (const u of adminUsers) {
            await sql`
              INSERT INTO public.notifications (user_id, title, body, type, data)
              VALUES (
                ${u.id},
                ${`⚠️ Overdue Follow-up: ${enq.code}`},
                ${`Enquiry from ${enq.contact_name} (${enq.city}) has been waiting over 48 hours without contact. SLA breach imminent.`},
                'stale_enquiry_alert',
                ${sql.json({ enquiry_id: enq.id, code: enq.code })}
              )
            `;
          }
        }
      }

      // 2. Upcoming / Overdue Payment Milestones
      const dueMilestones = await sql`
        SELECT m.id, m.wedding_id, m.title, m.amount_paise, m.due_date, w.code, w.client_id
        FROM public.payment_milestones m
        JOIN public.weddings w ON w.id = m.wedding_id
        WHERE m.status = 'pending' AND m.due_date <= ${sevenDaysFromNow}::date
      `;

      let milestoneCount = dueMilestones.length;
      for (const m of dueMilestones) {
        if (m.client_id) {
          await sql`
            INSERT INTO public.notifications (user_id, title, body, type, data)
            VALUES (
              ${m.client_id},
              ${`Payment Milestone Reminder: ${m.title}`},
              ${`A milestone payment of ${formatPaise(BigInt(m.amount_paise))} for wedding ${m.code} is due on ${m.due_date}.`},
              'payment_reminder',
              ${sql.json({ milestone_id: m.id, wedding_code: m.code })}
            )
          `;
        }
      }

      // 3. Upcoming / Overdue Tasks
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const overdueTasks = await sql`
        SELECT id, title, owner_id, due_date, stage
        FROM public.tasks
        WHERE stage != 'done' AND due_date <= ${twoDaysFromNow}::date
      `;

      let taskCount = overdueTasks.length;
      for (const t of overdueTasks) {
        if (t.owner_id) {
          await sql`
            INSERT INTO public.notifications (user_id, title, body, type, data)
            VALUES (
              ${t.owner_id},
              ${`Upcoming Task Due: ${t.title}`},
              ${`Task "${t.title}" is due on ${t.due_date}. Priority action required.`},
              'task_due_reminder',
              ${sql.json({ task_id: t.id, due_date: t.due_date })}
            )
          `;
        }
      }

      return NextResponse.json({
        ok: true,
        summary: {
          staleEnquiriesProcessed: staleCount,
          milestonesProcessed: milestoneCount,
          tasksProcessed: taskCount,
        },
        timestamp: new Date().toISOString(),
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing reminders cron";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
