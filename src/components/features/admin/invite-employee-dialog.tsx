"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { inviteEmployeeAction } from "@/app/actions/team";

export function InviteEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 98290 ");
  const [hourlyRateRupees, setHourlyRateRupees] = useState(1500); // ₹1,500/hr default

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await inviteEmployeeAction({
      fullName,
      email,
      phone,
      hourlyRatePaise: hourlyRateRupees * 100,
    });
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to invite employee.");
    } else {
      toast.success(`Account created for ${fullName}! Initial password set from DEMO_PASSWORD.`);
      setOpen(false);
      setFullName("");
      setEmail("");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-xs"
      >
        + Invite Team Planner
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
            <h3 className="font-serif text-xl font-semibold text-charcoal">Invite Wedding Coordinator / Planner</h3>
            <p className="text-charcoal/60">
              Creates a secure employee account using the server-side service role.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-charcoal/70 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Vikramaditya Singh"
                  className="w-full rounded-xl border border-input bg-background p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-charcoal/70 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. vikram@vivona.demo"
                  className="w-full rounded-xl border border-input bg-background p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-charcoal/70 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-charcoal/70 mb-1">Standard Hourly Rate (₹ INR)</label>
                <input
                  type="number"
                  value={hourlyRateRupees}
                  onChange={(e) => setHourlyRateRupees(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background p-2 font-mono text-sm"
                  required
                />
                <span className="text-[10px] text-charcoal/50 block mt-0.5">Used for timesheet labour cost attribution.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 hover:bg-ivory-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-maroon px-4 py-2 text-ivory font-semibold hover:bg-maroon-600"
                >
                  {loading ? "Creating..." : "Send Invite & Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
