"use client";

import * as React from "react";
import { toast } from "sonner";
import { requestExtraChargeAction } from "@/app/actions/employee";

export function ExtrasForm({ weddingId }: { weddingId: string }) {
  const [title, setTitle] = React.useState("");
  const [qty, setQty] = React.useState(60);
  const [unitPriceRupees, setUnitPriceRupees] = React.useState(3200);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const totalRupees = qty * unitPriceRupees;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || qty <= 0 || unitPriceRupees <= 0 || !reason) {
      toast.error("Please fill in all extra charge fields.");
      return;
    }

    setSubmitting(true);
    const res = await requestExtraChargeAction(
      weddingId,
      title,
      qty,
      unitPriceRupees,
      reason
    );
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to submit extra charge.");
    } else {
      toast.success("Extra charge submitted for executive approval!");
      setTitle("");
      setReason("");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
      <h2 className="font-serif text-xl font-semibold text-charcoal">
        Submit On-Ground Scope Addition
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">Charge Title / Item</label>
          <input
            type="text"
            required
            placeholder="e.g. 60 Extra Guest Dinner Plates or 2 Extra DJ Overtime Hours"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Unit Price (INR ₹)</label>
            <input
              type="number"
              min="1"
              required
              value={unitPriceRupees}
              onChange={(e) => setUnitPriceRupees(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal/60 mb-1">Total Calculated</label>
            <div className="p-2 rounded-xl bg-ivory-100 font-mono font-bold text-maroon text-sm border border-border">
              ₹{totalRupees.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">Operational Justification / Reason</label>
          <textarea
            required
            rows={2}
            placeholder="Explain client request or incident reason (e.g. Client added 60 extended family guests during live reception dinner)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-maroon text-ivory px-5 py-2 text-xs font-semibold hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-xs"
          >
            {submitting ? "Submitting..." : "Submit Extra Charge Request →"}
          </button>
        </div>
      </form>
    </div>
  );
}
