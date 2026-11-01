import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Operations Desk · Vivona",
};

export default async function EmployeeLiveOverviewPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const weddings = await withUser(session.profile.id, async (sql) => {
    if (session.profile.role === "admin") {
      return sql`
        SELECT 
          w.id, w.code, w.title, w.city, w.venue, w.start_date, w.end_date, w.status,
          COALESCE((
            SELECT count(*)::int FROM public.schedule_entries se WHERE se.wedding_id = w.id
          ), 0) as schedule_count,
          COALESCE((
            SELECT count(*)::int FROM public.vendor_checkins vc WHERE vc.wedding_id = w.id AND vc.status = 'late'
          ), 0) as late_checkins,
          COALESCE((
            SELECT count(*)::int FROM public.incidents inc WHERE inc.wedding_id = w.id AND inc.status <> 'resolved'
          ), 0) as open_incidents
        FROM public.weddings w
        ORDER BY w.start_date ASC
      `;
    }

    return sql`
      SELECT 
        w.id, w.code, w.title, w.city, w.venue, w.start_date, w.end_date, w.status,
        COALESCE((
          SELECT count(*)::int FROM public.schedule_entries se WHERE se.wedding_id = w.id
        ), 0) as schedule_count,
        COALESCE((
          SELECT count(*)::int FROM public.vendor_checkins vc WHERE vc.wedding_id = w.id AND vc.status = 'late'
        ), 0) as late_checkins,
        COALESCE((
          SELECT count(*)::int FROM public.incidents inc WHERE inc.wedding_id = w.id AND inc.status <> 'resolved'
        ), 0) as open_incidents
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
          Live Day Control Center
        </span>
        <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
          Realtime Celebration Operations ({weddings.length})
        </h1>
        <p className="text-xs text-charcoal/70 mt-1">
          Access the real-time minute-by-minute cue sheet, vendor arrival check-in radar, and critical on-site incident log.
        </p>
      </div>

      {weddings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-charcoal/60">
          No live celebrations currently assigned.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weddings.map((w: any) => {
            const isLive = w.status === "live";

            return (
              <div
                key={w.id}
                className={`rounded-2xl border bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs transition-all ${
                  isLive ? "border-sage-500 bg-sage-50/20" : "border-border hover:border-maroon"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold bg-maroon/10 text-maroon px-2 py-0.5 rounded">
                      {w.code}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        isLive
                          ? "bg-sage-600 text-ivory animate-pulse"
                          : w.status === "settled"
                          ? "bg-charcoal/10 text-charcoal/60"
                          : "bg-gold-100 text-gold-700"
                      }`}
                    >
                      {isLive ? "● LIVE TODAY" : w.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-semibold text-charcoal">{w.title}</h3>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      📍 {w.venue} ({w.city})
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                    <div className="rounded-xl bg-ivory-100/70 p-2">
                      <span className="text-[10px] text-charcoal/60 block">Timeline Cues</span>
                      <strong className="text-charcoal">{w.schedule_count}</strong>
                    </div>
                    <div className={`rounded-xl p-2 ${w.late_checkins > 0 ? "bg-terracotta/10 text-terracotta" : "bg-ivory-100/70 text-charcoal"}`}>
                      <span className="text-[10px] block opacity-70">Late Vendors</span>
                      <strong>{w.late_checkins}</strong>
                    </div>
                    <div className={`rounded-xl p-2 ${w.open_incidents > 0 ? "bg-amber-100/70 text-amber-800" : "bg-ivory-100/70 text-charcoal"}`}>
                      <span className="text-[10px] block opacity-70">Incidents</span>
                      <strong>{w.open_incidents}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-charcoal/50">
                    {w.start_date} → {w.end_date}
                  </span>
                  <Link
                    href={`/employee/weddings/${w.id}/live`}
                    className="rounded-lg bg-maroon px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-xs"
                  >
                    Launch Live Console →
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
