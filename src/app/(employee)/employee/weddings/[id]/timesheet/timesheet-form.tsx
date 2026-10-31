"use client";

import * as React from "react";
import { toast } from "sonner";
import { logTimesheetAction } from "@/app/actions/employee";

export function TimesheetForm({ weddingId }: { weddingId: string }) {
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = React.useState(8);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hours <= 0) {
      toast.error("Please enter a valid number of hours.");
      return;
    }

    setSubmitting(true);
    const res = await logTimesheetAction(weddingId, date, hours, notes);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to log timesheet.");
    } else {
      toast.success("Timesheet hours logged successfully.");
      setNotes("");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
      <h2 className="font-serif text-xl font-semibold text-charcoal">
        Log Coordinator Working Hours
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">Hours Worked</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            required
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">Operational Notes</label>
          <input
            type="text"
            placeholder="e.g. Stage AV soundcheck and Baraat assembly"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
          />
        </div>

        <div className="sm:col-span-3 flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-maroon text-ivory px-5 py-2 text-xs font-semibold hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-xs"
          >
            {submitting ? "Logging..." : "Submit Timesheet Entry →"}
          </button>
        </div>
      </form>
    </div>
  );
}
