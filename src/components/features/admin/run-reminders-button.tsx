"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { triggerRemindersNowAction } from "@/app/actions/cron";

export function RunRemindersButton() {
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    toast.info("Scanning database for overdue tasks, milestones, and stale enquiries...");
    try {
      const res = await triggerRemindersNowAction();
      if (!res.ok) {
        toast.error(res.error || "Failed to execute reminders check.");
      } else {
        const s = res.data?.summary;
        toast.success(
          `Reminders complete! Stale enquiries: ${s?.staleEnquiriesProcessed ?? 0}, Milestones: ${
            s?.milestonesProcessed ?? 0
          }, Tasks: ${s?.tasksProcessed ?? 0}`
        );
      }
    } catch {
      toast.error("Network error triggering reminders.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      onClick={handleRun}
      disabled={running}
      className="inline-flex items-center gap-2 rounded-xl border border-gold-400/50 bg-gold-50/80 px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-gold-100 transition-colors shadow-sm disabled:opacity-50"
    >
      <span className={`w-2 h-2 rounded-full ${running ? "bg-gold-500 animate-ping" : "bg-sage-600"}`} />
      <span>{running ? "Running Watchdog..." : "Run Reminders Now"}</span>
    </button>
  );
}
