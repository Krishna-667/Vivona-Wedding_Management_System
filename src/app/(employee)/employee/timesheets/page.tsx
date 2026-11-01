import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Timesheets Overview · Vivona Operations",
};

export default async function EmployeeTimesheetsOverviewPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const { weddings, recentLogs, totalHoursAll, totalCostPaiseAll } = await withUser(session.profile.id, async (sql) => {
    // 1. Assigned Weddings
    const wRows = await sql`
      SELECT w.id, w.code, w.title, w.city, w.venue, w.start_date, w.status
      FROM public.wedding_assignments wa
      JOIN public.weddings w ON w.id = wa.wedding_id
      WHERE wa.employee_id = ${session.profile.id}
      ORDER BY w.start_date ASC
    `;

    // 2. Recent Timesheet Logs for this staff member
    const logs = await sql`
      SELECT 
        ts.*,
        w.code as wedding_code,
        w.title as wedding_title
      FROM public.timesheets ts
      JOIN public.weddings w ON w.id = ts.wedding_id
      WHERE ts.employee_id = ${session.profile.id}
      ORDER BY ts.date DESC
      LIMIT 25
    `;

    // 3. Totals
    const [tot] = await sql`
      SELECT 
        COALESCE(SUM(hours), 0)::numeric as total_hours,
        COALESCE(SUM(hours * hourly_rate_paise), 0)::bigint as total_cost_paise
      FROM public.timesheets
      WHERE employee_id = ${session.profile.id}
    `;

    return {
      weddings: wRows,
      recentLogs: logs,
      totalHoursAll: Number(tot?.total_hours || 0),
      totalCostPaiseAll: BigInt(tot?.total_cost_paise || 0),
    };
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-border/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-sage-600 font-semibold">
            Operational Labour Tracking
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Timesheets & Billable Hours
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Logged hours across all assigned luxury celebrations. All recorded hours directly feed financial profit calculation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card border border-border p-3 text-right">
            <span className="text-[11px] text-charcoal/60 block">Lifetime Logged Hours</span>
            <span className="text-xl font-bold font-mono text-charcoal">{totalHoursAll.toFixed(1)} hrs</span>
          </div>
          <div className="rounded-xl bg-gold-50/60 border border-gold-300 p-3 text-right">
            <span className="text-[11px] text-gold-700 block">Attributable Cost</span>
            <span className="text-xl font-bold font-mono text-gold-800">{formatPaise(totalCostPaiseAll)}</span>
          </div>
        </div>
      </div>

      {/* Quick Log per Wedding */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg font-semibold text-charcoal">
          Log Hours for Assigned Celebrations
        </h2>
        {weddings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-charcoal/60">
            No celebrations currently assigned.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {weddings.map((w: any) => (
              <div
                key={w.id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between space-y-2 hover:border-maroon transition-colors"
              >
                <div>
                  <span className="font-mono text-[11px] font-bold bg-maroon/10 text-maroon px-2 py-0.5 rounded">
                    {w.code}
                  </span>
                  <h3 className="font-medium text-xs text-charcoal mt-1 line-clamp-1">{w.title}</h3>
                </div>
                <Link
                  href={`/employee/weddings/${w.id}/timesheet`}
                  className="inline-block text-center rounded-lg bg-maroon px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-xs"
                >
                  Log Hours →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Timesheet Logs Table */}
      <div className="space-y-3 pt-4">
        <h2 className="font-serif text-lg font-semibold text-charcoal">
          Recent Timesheet Entries ({recentLogs.length})
        </h2>
        {recentLogs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-charcoal/60">
            No timesheet logs recorded yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory-100/80 border-b border-border/80 text-charcoal/60">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold">Wedding</th>
                  <th className="py-2.5 px-4 font-semibold">Hours</th>
                  <th className="py-2.5 px-4 font-semibold">Rate</th>
                  <th className="py-2.5 px-4 font-semibold">Total Cost</th>
                  <th className="py-2.5 px-4 font-semibold">Notes / Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-ivory-50/50">
                    <td className="py-2.5 px-4 font-mono">{log.date}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-semibold text-maroon">{log.wedding_code}</span>
                      <span className="text-charcoal/60 block text-[11px] truncate max-w-xs">{log.wedding_title}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-charcoal">{log.hours}h</td>
                    <td className="py-2.5 px-4 font-mono text-charcoal/70">{formatPaise(BigInt(log.hourly_rate_paise))}/hr</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-gold-700">
                      {formatPaise(BigInt(Math.round(Number(log.hours) * Number(log.hourly_rate_paise))))}
                    </td>
                    <td className="py-2.5 px-4 text-charcoal/70 max-w-xs truncate">{log.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
