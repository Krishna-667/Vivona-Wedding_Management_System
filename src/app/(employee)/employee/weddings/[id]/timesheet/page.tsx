import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { formatPaise } from "@/lib/utils";
import { TimesheetForm } from "./timesheet-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Labour Timesheet & Cost Logging · Vivona",
};

export default async function EmployeeWeddingTimesheetPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionProfile();
  const admin = createAdminClient();

  const [weddingRes, timesheetsRes] = await Promise.all([
    admin.from("weddings").select("id, code, title").eq("id", params.id).single(),
    admin
      .from("timesheets")
      .select("*, profiles(full_name, role)")
      .eq("wedding_id", params.id)
      .order("date", { ascending: false }),
  ]);

  if (weddingRes.error || !weddingRes.data) notFound();

  const wedding = weddingRes.data;
  const timesheets = timesheetsRes.data || [];

  const totalHours = timesheets.reduce((acc, t) => acc + Number(t.hours), 0);
  const totalCostPaise = timesheets.reduce(
    (acc, t) => acc + Number(t.hours) * Number(t.hourly_rate_paise),
    0
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-border/80 pb-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-maroon bg-maroon/10 px-2.5 py-1 rounded">
            {wedding.code}
          </span>
          <span className="text-xs font-semibold uppercase text-gold-600">
            Internal Labour Costing
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
          {wedding.title} Timesheets
        </h1>
        <p className="text-xs text-charcoal/70 mt-1">
          Log operational coordinator hours. Automatically links with employee rates for internal profit calculation.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">Total Logged Hours</span>
          <p className="font-mono text-2xl font-bold text-charcoal mt-1">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">Attributable Labour Cost</span>
          <p className="font-mono text-2xl font-bold text-maroon mt-1">
            {formatPaise(BigInt(Math.round(totalCostPaise)))}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">Your Base Rate</span>
          <p className="font-mono text-xl font-bold text-sage-700 mt-1">
            {formatPaise(BigInt(Number(session?.profile.hourly_rate_paise || 150000)))} / hr
          </p>
        </div>
      </div>

      {/* Interactive Form */}
      <TimesheetForm weddingId={wedding.id} />

      {/* History Table */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-charcoal border-b border-border/80 pb-3">
          Logged Timesheet History
        </h2>

        {timesheets.length === 0 ? (
          <p className="text-xs text-charcoal/50">No hours logged for this celebration yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 text-charcoal/60 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Planner</th>
                  <th className="py-2.5 px-3">Hours</th>
                  <th className="py-2.5 px-3">Hourly Rate</th>
                  <th className="py-2.5 px-3">Cost</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {timesheets.map((t) => {
                  const entryCost = Number(t.hours) * Number(t.hourly_rate_paise);
                  return (
                    <tr key={t.id} className="hover:bg-ivory-100/30">
                      <td className="py-3 px-3 font-mono">{t.date}</td>
                      <td className="py-3 px-3 font-medium text-charcoal">
                        {t.profiles?.full_name || "Team Member"}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-charcoal">{t.hours}h</td>
                      <td className="py-3 px-3 font-mono text-charcoal/70">
                        {formatPaise(BigInt(t.hourly_rate_paise))}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-maroon">
                        {formatPaise(BigInt(Math.round(entryCost)))}
                      </td>
                      <td className="py-3 px-3 text-charcoal/70">{t.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
