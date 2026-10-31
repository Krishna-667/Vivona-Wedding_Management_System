import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";

export default async function EmployeeDashboardPage() {
  const session = await getSessionProfile();

  const assignedWeddings = [
    {
      code: "VIV-2026-001",
      couple: "Rohan & Priyamvada",
      venue: "Rambagh Palace Grounds, Jaipur",
      dateRange: "Nov 14 – Nov 16, 2026",
      daysToGo: 14,
      roleOnWedding: "Lead Planner",
      tasksCompletedPct: 78,
      activeIncidents: 0,
      nextMilestone: "Sangeet Technical AV Run-Through",
    },
    {
      code: "VIV-2026-002",
      couple: "Kabir & Alankrita",
      venue: "City Palace Zenana Lawns, Udaipur",
      dateRange: "Dec 02 – Dec 04, 2026",
      daysToGo: 32,
      roleOnWedding: "On-Site Coordinator",
      tasksCompletedPct: 45,
      activeIncidents: 1,
      nextMilestone: "3-Caterer Tasting & Final Menu Lock",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header with status pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-sage-600 font-semibold">
            On-Ground Operations
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Planner Workspace: {session?.profile.full_name}
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Displaying only weddings assigned to your user account (RLS Enforced).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sage-100 text-sage-700 border border-sage-300">
            <span className="w-2 h-2 rounded-full bg-sage-500" />
            Live Realtime Active
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">Assigned Weddings</span>
          <p className="font-serif text-2xl font-bold text-maroon mt-1">2</p>
          <span className="text-[10px] text-charcoal/50">Jaipur & Udaipur</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">My Open Tasks</span>
          <p className="font-serif text-2xl font-bold text-charcoal mt-1">11</p>
          <span className="text-[10px] text-sage-600 font-medium">3 due this week</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">Live Incidents</span>
          <p className="font-serif text-2xl font-bold text-terracotta mt-1">1</p>
          <span className="text-[10px] text-terracotta font-medium">Pending resolution</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">Hours Logged</span>
          <p className="font-serif text-2xl font-bold text-charcoal mt-1">28.5 hrs</p>
          <span className="text-[10px] text-charcoal/50">Current week timesheet</span>
        </div>
      </div>

      {/* Assigned Weddings Cards */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-charcoal">
          Active Assigned Weddings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignedWeddings.map((w) => (
            <div
              key={w.code}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-gold-400/60 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-maroon bg-maroon/10 px-2 py-0.5 rounded">
                    {w.code}
                  </span>
                  <h3 className="font-serif text-2xl font-semibold text-charcoal mt-2">
                    {w.couple}
                  </h3>
                  <p className="text-xs text-charcoal/70 mt-0.5">{w.venue}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gold-100 text-gold-700 border border-gold-300">
                    {w.daysToGo} Days to Go
                  </span>
                  <p className="text-[10px] text-charcoal/50 mt-1">{w.dateRange}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex justify-between text-xs">
                  <span className="text-charcoal/70 font-medium">Task Completion</span>
                  <span className="font-semibold text-charcoal">{w.tasksCompletedPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-ivory-300 overflow-hidden">
                  <div
                    className="h-full bg-sage-500 rounded-full transition-all"
                    style={{ width: `${w.tasksCompletedPct}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/employee/live"
                  className="w-full sm:w-auto flex-1 rounded-xl bg-maroon px-4 py-2.5 text-xs font-medium text-ivory hover:bg-maroon-600 transition-colors text-center shadow-sm"
                >
                  Open Live Day Console ⚡
                </Link>
                <Link
                  href="/employee/tasks"
                  className="w-full sm:w-auto rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-charcoal hover:bg-ivory-300/40 transition-colors text-center"
                >
                  View Tasks 📋
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
