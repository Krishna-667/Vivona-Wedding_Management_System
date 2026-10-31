import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";
import { InviteEmployeeDialog } from "@/components/features/admin/invite-employee-dialog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team & Workload · Vivona Admin",
};

export default async function AdminTeamPage() {
  const session = await getSessionProfile();
  const userId = session?.profile.id || "00000000-0000-0000-0000-000000000000";

  const { team, assignments } = await withUser(userId, async (sql) => {
    const team = await sql`
      SELECT * FROM public.profiles
      WHERE role IN ('admin', 'employee')
      ORDER BY created_at ASC
    `;
    const assignments = await sql`
      SELECT employee_id, wedding_id FROM public.wedding_assignments
    `;
    return { team: team as any[], assignments: assignments as any[] };
  });

  // Workload mapping
  const workloadMap = new Map<string, number>();
  assignments.forEach((a) => {
    workloadMap.set(a.employee_id, (workloadMap.get(a.employee_id) || 0) + 1);
  });

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Personnel & Workload Allocation
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Planning Team & Coordinators ({team.length})
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Lead planners and on-site event day coordinators across Jaipur and Udaipur. Workload tracking ensures no planner exceeds 3 active multi-day weddings simultaneously.
          </p>
        </div>

        <InviteEmployeeDialog />
      </div>

      {/* Team Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((member) => {
          const activeWeddings = workloadMap.get(member.id) || 0;
          const isAdmin = member.role === "admin";

          return (
            <div
              key={member.id}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-4 shadow-sm hover:border-gold-400/60 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      isAdmin ? "bg-maroon text-ivory" : "bg-gold-100 text-gold-800"
                    }`}
                  >
                    {member.role.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-charcoal/60">
                    {member.is_active ? "● Active" : "○ Suspended"}
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold text-charcoal">
                    {member.full_name}
                  </h3>
                  <p className="text-xs text-charcoal/60 mt-0.5 font-mono">
                    {member.phone || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-ivory-100/60 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">Standard Hourly Rate:</span>
                    <span className="font-mono font-bold text-charcoal">
                      {formatPaise(BigInt(member.hourly_rate_paise || 0))}/hr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">Active Assigned Weddings:</span>
                    <span
                      className={`font-mono font-bold ${
                        activeWeddings > 2 ? "text-terracotta" : "text-sage-700"
                      }`}
                    >
                      {activeWeddings} Weddings
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 text-[11px] text-charcoal/50 flex justify-between">
                <span>Role: {isAdmin ? "Founder & Executive" : "Lead Wedding Planner"}</span>
                <span>{activeWeddings <= 2 ? "✓ Capacity Available" : "⚠️ High Load"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
