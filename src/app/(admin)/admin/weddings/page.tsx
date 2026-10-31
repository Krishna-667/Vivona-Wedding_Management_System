import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";
import type { Wedding } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Weddings Command · Vivona Admin",
};

export default async function AdminWeddingsPage({
  searchParams,
}: {
  searchParams?: { status?: string; q?: string };
}) {
  const session = await getSessionProfile();
  const userId = session?.profile.id || "00000000-0000-0000-0000-000000000000";

  const activeStatus = searchParams?.status || "all";
  const searchQuery = searchParams?.q?.trim() || "";

  const { weddingList, statusCounts } = await withUser(userId, async (sql) => {
    // Counts
    const countsRaw = await sql`
      SELECT status, count(*)::int as count
      FROM public.weddings
      GROUP BY status
    `;
    const countMap: Record<string, number> = {};
    let totalAll = 0;
    for (const r of countsRaw) {
      countMap[r.status] = r.count;
      totalAll += r.count;
    }

    let statusSql = sql``;
    if (activeStatus !== "all") {
      statusSql = sql`AND w.status = ${activeStatus}`;
    }

    let searchSql = sql``;
    if (searchQuery) {
      searchSql = sql`AND (
        w.code ILIKE ${'%' + searchQuery + '%'}
        OR w.title ILIKE ${'%' + searchQuery + '%'}
        OR w.city ILIKE ${'%' + searchQuery + '%'}
        OR w.venue ILIKE ${'%' + searchQuery + '%'}
      )`;
    }

    const rows = await sql`
      SELECT 
        w.*,
        row_to_json(cp.*) as profiles,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'employee_id', wa.employee_id,
              'role_on_wedding', wa.role_on_wedding,
              'profiles', json_build_object('full_name', ep.full_name)
            )
          )
          FROM public.wedding_assignments wa
          LEFT JOIN public.profiles ep ON ep.id = wa.employee_id
          WHERE wa.wedding_id = w.id
        ), '[]') as wedding_assignments
      FROM public.weddings w
      LEFT JOIN public.profiles cp ON cp.id = w.client_id
      WHERE 1=1
        ${statusSql}
        ${searchSql}
      ORDER BY w.start_date ASC
    `;

    return {
      weddingList: (rows || []) as unknown as Array<
        Wedding & {
          profiles?: { full_name: string; phone: string } | null;
          wedding_assignments?: Array<{ employee_id: string; role_on_wedding: string; profiles?: { full_name: string } | null }>;
        }
      >,
      statusCounts: { ...countMap, all: totalAll } as Record<string, number>,
    };
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Operational Portfolio · Season Command
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Confirmed Luxury Weddings ({weddingList.length})
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Active luxury destination weddings across Jaipur & Udaipur. Every wedding features 30+ operational tasks, staged payment milestones, and dedicated coordination.
          </p>
        </div>

        <Link
          href="/admin/enquiries"
          className="rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-xs"
        >
          + Confirm New Wedding via CRM →
        </Link>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Link
            href={`/admin/weddings${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeStatus === "all"
                ? "bg-maroon text-ivory"
                : "border border-border bg-card text-charcoal/70 hover:border-maroon"
            }`}
          >
            All Weddings ({statusCounts.all || 0})
          </Link>
          <Link
            href={`/admin/weddings?status=live${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeStatus === "live"
                ? "bg-sage-600 text-ivory"
                : "border border-border bg-card text-charcoal/70 hover:border-sage-600"
            }`}
          >
            Live Ops ({statusCounts.live || 0})
          </Link>
          <Link
            href={`/admin/weddings?status=planning${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeStatus === "planning"
                ? "bg-gold-600 text-ivory"
                : "border border-border bg-card text-charcoal/70 hover:border-gold-600"
            }`}
          >
            In Planning ({statusCounts.planning || 0})
          </Link>
          <Link
            href={`/admin/weddings?status=settled${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeStatus === "settled"
                ? "bg-charcoal text-ivory"
                : "border border-border bg-card text-charcoal/70 hover:border-charcoal"
            }`}
          >
            Settled ({statusCounts.settled || 0})
          </Link>
        </div>

        <form method="GET" action="/admin/weddings" className="flex items-center gap-2 max-w-xs w-full">
          {activeStatus !== "all" && <input type="hidden" name="status" value={activeStatus} />}
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search code, title, venue..."
            className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-charcoal placeholder:text-charcoal/40 focus:border-maroon focus:outline-hidden"
          />
          <button
            type="submit"
            className="rounded-xl bg-maroon px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Wedding Cards Grid */}
      {weddingList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <span className="text-3xl">🏰</span>
          <h3 className="font-serif text-lg font-semibold text-charcoal">No Weddings Found</h3>
          <p className="text-xs text-charcoal/60 max-w-md mx-auto">
            {searchQuery
              ? `No weddings matched "${searchQuery}".`
              : "No weddings currently match this status filter."}
          </p>
          {searchQuery && (
            <Link href="/admin/weddings" className="inline-block mt-2 text-xs font-semibold text-maroon hover:underline">
              Clear search filter
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {weddingList.map((w) => {
            const leadPlanner =
              w.wedding_assignments?.find((a) => a.role_on_wedding === "lead_planner")?.profiles?.full_name ||
              "Devraj Rathore (Admin)";
            const now = new Date().getTime();
            const startMs = new Date(w.start_date).getTime();
            const daysToGo = Math.ceil((startMs - now) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={w.id}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-5 shadow-sm hover:border-maroon transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold bg-maroon/10 text-maroon px-2.5 py-1 rounded">
                      {w.code}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        w.status === "settled"
                          ? "bg-charcoal/10 text-charcoal/70"
                          : w.status === "live"
                          ? "bg-sage-100 text-sage-800"
                          : "bg-gold-50 text-gold-700"
                      }`}
                    >
                      {w.status === "settled"
                        ? "Settled & Audited"
                        : daysToGo > 0
                        ? `${daysToGo} Days to Event`
                        : "Event In Progress"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl font-semibold text-charcoal leading-snug">
                      {w.title}
                    </h3>
                    <p className="text-xs text-charcoal/60 mt-1">
                      📍 {w.venue} ({w.city})
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="rounded-xl bg-ivory-100/60 p-3">
                      <span className="text-[11px] text-charcoal/60 block">Planned Guests</span>
                      <span className="font-semibold text-charcoal">{w.guest_count_planned} Guests</span>
                    </div>
                    <div className="rounded-xl bg-ivory-100/60 p-3">
                      <span className="text-[11px] text-charcoal/60 block">Budget Total</span>
                      <span className="font-mono font-bold text-gold-700">
                        {formatPaise(BigInt(w.budget_paise))}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-charcoal/70 flex items-center justify-between pt-1">
                    <span>Lead Planner: <strong>{leadPlanner}</strong></span>
                    <span>Client: <strong>{w.profiles?.full_name || "Royal Couple"}</strong></span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-charcoal/50">
                    {w.start_date} → {w.end_date}
                  </span>
                  <Link
                    href={`/admin/weddings/${w.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-xs"
                  >
                    Manage Operations Plan →
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
