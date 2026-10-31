import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPaise } from "@/lib/utils";
import { fetchWithCache } from "@/lib/cache";
import type { Wedding } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Weddings Command · Vivona Admin",
};

export default async function AdminWeddingsPage() {
  const weddingList = await fetchWithCache("admin_weddings_list", 30000, async () => {
    const admin = createAdminClient();
    const { data: weddings } = await admin
      .from("weddings")
      .select("*, profiles!weddings_client_id_fkey(full_name, phone), wedding_assignments(employee_id, role_on_wedding, profiles(full_name))")
      .order("start_date", { ascending: true });

    return (weddings || []) as Array<
      Wedding & {
        profiles?: { full_name: string; phone: string } | null;
        wedding_assignments?: Array<{ employee_id: string; role_on_wedding: string; profiles?: { full_name: string } | null }>;
      }
    >;
  });

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Operational Portfolio
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Confirmed Luxury Weddings ({weddingList.length})
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Active luxury destination weddings. Every wedding features 30+ auto-generated tasks, staged payment milestones, and dedicated coordination.
          </p>
        </div>

        <Link
          href="/admin/enquiries"
          className="rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-xs"
        >
          + Confirm New Wedding via CRM →
        </Link>
      </div>

      {/* Wedding Cards Grid */}
      {weddingList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <span className="text-3xl">🏰</span>
          <h3 className="font-serif text-lg font-semibold text-charcoal">No Confirmed Weddings Yet</h3>
          <p className="text-xs text-charcoal/60 max-w-md mx-auto">
            Once a client accepts their proposal and deposits are recorded, click &quot;Confirm Wedding&quot; in the CRM pipeline to generate the full 30+ task plan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {weddingList.map((w) => {
            const leadPlanner = w.wedding_assignments?.find((a) => a.role_on_wedding === "lead_planner")?.profiles?.full_name || "Devraj Rathore (Admin)";
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
                    <span className="text-xs font-semibold bg-gold-50 text-gold-700 px-2.5 py-0.5 rounded-full">
                      {daysToGo > 0 ? `${daysToGo} Days to Event` : "Event In Progress"}
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
