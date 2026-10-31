"use server";

import { getSessionProfile } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export interface CronActionResult {
  ok: boolean;
  data?: {
    summary: {
      staleEnquiriesProcessed: number;
      milestonesProcessed: number;
      tasksProcessed: number;
    };
    timestamp: string;
  };
  error?: string;
}

/**
 * Triggers the reminders cron on-demand from the Admin dashboard.
 * Enforces admin authorization check.
 */
export async function triggerRemindersNowAction(): Promise<CronActionResult> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required to run reminders." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET || "dev-cron-secret-key-2026";

  try {
    const res = await fetch(`${siteUrl}/api/cron/reminders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Failed to execute reminders cron." };
    }

    revalidatePath("/admin");
    return {
      ok: true,
      data: {
        summary: data.summary,
        timestamp: data.timestamp,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing cron";
    return { ok: false, error: message };
  }
}
