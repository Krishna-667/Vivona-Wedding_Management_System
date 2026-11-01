import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Task Boards · Vivona Operations",
};

export default async function EmployeeTasksOverviewPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const weddings = await withUser(session.profile.id, async (sql) => {
    if (session.profile.role === "admin") {
      return sql`
        SELECT 
          w.id, w.code, w.title, w.city, w.venue, w.start_date, w.status,
          COALESCE((
            SELECT json_agg(json_build_object('id', t.id, 'title', t.title, 'stage', t.stage, 'priority', t.priority))
            FROM public.tasks t WHERE t.wedding_id = w.id
          ), '[]') as tasks
        FROM public.weddings w
        ORDER BY w.start_date ASC
      `;
    }

    return sql`
      SELECT 
        w.id, w.code, w.title, w.city, w.venue, w.start_date, w.status,
        COALESCE((
          SELECT json_agg(json_build_object('id', t.id, 'title', t.title, 'stage', t.stage, 'priority', t.priority))
          FROM public.tasks t WHERE t.wedding_id = w.id
        ), '[]') as tasks
      FROM public.wedding_assignments wa
      JOIN public.weddings w ON w.id = wa.wedding_id
      WHERE wa.employee_id = ${session.profile.id}
      ORDER BY w.start_date ASC
    `;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-border/80 pb-6">
        <span className="text-xs uppercase tracking-wider text-sage-600 font-semibold">
          Task Management Directory
        </span>
        <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
          Assigned Celebration Task Boards ({weddings.length})
        </h1>
        <p className="text-xs text-charcoal/70 mt-1">
          Select an active celebration to open its staged 30+ task Kanban board, manage staging cues, and update milestones.
        </p>
      </div>

      {weddings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-charcoal/60">
          No celebrations currently assigned to your profile.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weddings.map((w: any) => {
            const taskList = (w.tasks || []) as Array<{ id: string; stage: string; priority: string }>;
            const total = taskList.length;
            const done = taskList.filter((t) => t.stage === "done").length;
            const inProgress = taskList.filter((t) => t.stage === "in_progress").length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <div
                key={w.id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-maroon transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold bg-maroon/10 text-maroon px-2 py-0.5 rounded">
                      {w.code}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sage-100 text-sage-800">
                      {pct}% Completed
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-semibold text-charcoal">{w.title}</h3>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      📍 {w.venue} ({w.city}) · 📅 Starts: {w.start_date}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full bg-ivory-300 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-sage-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-charcoal/60">
                      <span>Done: <strong>{done}</strong></span>
                      <span>In Progress: <strong>{inProgress}</strong></span>
                      <span>Total Tasks: <strong>{total}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-charcoal/50">Status: {w.status}</span>
                  <Link
                    href={`/employee/weddings/${w.id}/tasks`}
                    className="rounded-lg bg-maroon px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-xs"
                  >
                    Open Task Board →
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
