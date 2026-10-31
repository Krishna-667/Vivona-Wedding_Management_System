"use client";

import * as React from "react";
import { toast } from "sonner";

export function RunRemindersButton() {
  const [running, setRunning] = React.useState(false);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/cron/reminders", {
        headers: {
          Authorization: `Bearer vivona-secure-cron-secret-2026`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Failed to trigger reminders.");
      } else {
        toast.success(
          `Reminders processed: ${json.summary?.overdueMilestonesFound || 0} overdue milestones checked, ${json.summary?.staleEnquiriesCount || 0} stale enquiries audited.`
        );
      }
    } catch {
      toast.error("Error communicating with cron endpoint.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      onClick={handleRun}
      disabled={running}
      className="rounded-xl bg-maroon text-ivory px-4 py-2 text-xs font-semibold hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-2xs"
    >
      {running ? "Auditing..." : "⚡ Run Milestone Reminders Now"}
    </button>
  );
}
