import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchWithCache } from "@/lib/cache";
import type { Wedding } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Assigned Weddings · Vivona Planner Desk",
};

export default async function EmployeeDashboardPage() {
  const session = await getSessionProfile();

  let weddings: any[] = [];

  if (session?.profile.role === "admin") {
    weddings = await fetchWithCache("employee_dash_admin_weddings", 30000, async () => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("weddings")
        .select("*, tasks(id, stage), incidents(id, status), payment_milestones(id, title, status)")
        .order("start_date", { ascending: true })
        .limit(10);
      return data || [];
    });
  } else if (session) {
    weddings = await fetchWithCache(`employee_dash_weddings_${session.user.id}`, 30000, async () => {
      const admin = createAdminClient();
      const { data: assignments } = await admin
        .from("wedding_assignments")
        .select("wedding_id, role_on_wedding, weddings(*, tasks(id, stage), incidents(id, status), payment_milestones(id, title, status))")
        .eq("employee_id", session.user.id);

      return (assignments || []).map((a) => ({
        ...a.weddings,
        role_on_wedding: a.role_on_wedding,
      }));
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-sage-600 font-semibold">
            On-Ground Operations Command
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Planner Workspace: {session?.profile.full_name}
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Displaying celebrations assigned to your operational team (RLS Enforced).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sage-100 text-sage-700 border border-sage-300">
            <span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" />
            Live Realtime Active
          </span>
        </div>
      </div>

      {/* Weddings Grid */}
      {weddings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-charcoal/60">
          No celebrations assigned yet. Once confirmed in the CRM, assignments will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {weddings.map((w) => {
            const tasks = w.tasks || [];
            const doneTasks = tasks.filter((t: any) => t.stage === "done").length;
            const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
            const openIncidents = (w.incidents || []).filter((i: any) => i.status !== "resolved").length;

            return (
              <div
                key={w.id}
                className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xs hover:border-gold-400 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-maroon bg-maroon/10 px-2.5 py-1 rounded">
                        {w.code}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gold-600 bg-gold-100 px-2 py-0.5 rounded">
                        {w.role_on_wedding ? w.role_on_wedding.replace("_", " ") : "Lead"}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-charcoal mt-2">
                      {w.title}
                    </h3>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      📍 {w.venue} ({w.city}) · 👥 {w.guest_count_planned} Guests
                    </p>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ivory-200 text-charcoal/70">
                    {w.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-charcoal/70">
                    <span>Task Execution</span>
                    <span className="font-mono font-bold text-maroon">{progress}% ({doneTasks}/{tasks.length})</span>
                  </div>
                  <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-maroon h-full rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Quick Action Matrix */}
                <div className="pt-2 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <Link
                    href={`/employee/weddings/${w.id}/live`}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-terracotta/30 bg-terracotta/5 hover:bg-terracotta/10 text-terracotta transition-all text-center"
                  >
                    <span className="text-base">⚡</span>
                    <span className="font-bold text-[11px] mt-0.5">Live Console</span>
                  </Link>

                  <Link
                    href={`/employee/weddings/${w.id}/tasks`}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-ivory-100/50 hover:bg-ivory-200 text-charcoal transition-all text-center"
                  >
                    <span className="text-base">📋</span>
                    <span className="font-semibold text-[11px] mt-0.5">Task Board</span>
                  </Link>

                  <Link
                    href={`/employee/weddings/${w.id}/messages`}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-ivory-100/50 hover:bg-ivory-200 text-charcoal transition-all text-center"
                  >
                    <span className="text-base">💬</span>
                    <span className="font-semibold text-[11px] mt-0.5">Client Chat</span>
                  </Link>

                  <Link
                    href={`/employee/weddings/${w.id}/timesheet`}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-ivory-100/50 hover:bg-ivory-200 text-charcoal transition-all text-center"
                  >
                    <span className="text-base">⏱️</span>
                    <span className="font-semibold text-[11px] mt-0.5">Timesheet</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
