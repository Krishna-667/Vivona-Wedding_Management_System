import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { RunRemindersButton } from "@/components/features/admin/run-reminders-button";
import { formatPaise } from "@/lib/utils";
import { fetchWithCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Command Center · Vivona",
};

export default async function AdminDashboardPage() {
  const session = await getSessionProfile();
  const userId = session?.profile.id || "00000000-0000-0000-0000-000000000000";

  // 1. Cached Database Queries (30s TTL)
  const {
    newTodayCount,
    staleCount,
    activeWeddingsCount,
    pendingMilestonesCount,
    staleEnquiries,
    upcomingWeddings,
  } = await fetchWithCache("admin_dashboard_metrics_cache", 30000, async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    return withUser(userId, async (sql) => {
      const [counts] = await sql`
        SELECT 
          (SELECT count(*) FROM public.enquiries WHERE created_at >= ${todayStart}) as new_today,
          (SELECT count(*) FROM public.enquiries WHERE status = 'new' AND created_at < ${fortyEightHoursAgo}) as stale_count,
          (SELECT count(*) FROM public.weddings WHERE status = 'planning') as active_weddings,
          (SELECT count(*) FROM public.payment_milestones WHERE status = 'pending') as pending_milestones
      `;

      const staleList = await sql`
        SELECT id, code, contact_name, contact_phone, city, guest_count, created_at, status
        FROM public.enquiries
        WHERE status = 'new' AND created_at < ${fortyEightHoursAgo}
        ORDER BY created_at ASC
        LIMIT 5
      `;

      const upcoming = await sql`
        SELECT id, code, title, venue, city, start_date, end_date, guest_count_planned, status, budget_paise
        FROM public.weddings
        ORDER BY start_date ASC
        LIMIT 5
      `;

      return {
        newTodayCount: Number(counts.new_today ?? 0),
        staleCount: Number(counts.stale_count ?? 0),
        activeWeddingsCount: Number(counts.active_weddings ?? 0),
        pendingMilestonesCount: Number(counts.pending_milestones ?? 0),
        staleEnquiries: staleList as any[],
        upcomingWeddings: upcoming as any[],
      };
    });
  });

  const metrics = [
    {
      title: "New Enquiries Today",
      value: newTodayCount.toString(),
      subtext: "Inbound via Booking Wizard",
      highlight: "text-maroon",
      badge: newTodayCount > 0 ? "Active Inbound" : "Calm",
      badgeColor: "bg-maroon/10 text-maroon",
    },
    {
      title: "Stale Enquiries (>48h)",
      value: staleCount.toString(),
      subtext: staleCount > 0 ? "SLA Alert: Follow-up required" : "All Leads Handled On-Time",
      highlight: staleCount > 0 ? "text-terracotta" : "text-sage-600",
      badge: staleCount > 0 ? "Action Required" : "SLA Healthy",
      badgeColor: staleCount > 0 ? "bg-terracotta/10 text-terracotta" : "bg-sage-50 text-sage-700",
    },
    {
      title: "Active Weddings",
      value: activeWeddingsCount.toString(),
      subtext: "Jaipur & Udaipur Operations",
      highlight: "text-charcoal",
      badge: "Season 2026",
      badgeColor: "bg-gold-100 text-gold-700",
    },
    {
      title: "Pending Milestones",
      value: pendingMilestonesCount.toString(),
      subtext: "Awaiting Client Payment",
      highlight: "text-gold-600",
      badge: "Cash Flow Watch",
      badgeColor: "bg-gold-50 text-gold-700",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Header & Watchdog Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Central Command Center
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Agency Operations Dashboard
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Welcome back, {session?.profile.full_name || "Devraj Rathore"}. Live pipeline, vendor procurement, and 25-wedding season capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RunRemindersButton />
          <Link
            href="/admin/enquiries"
            className="rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
          >
            Open CRM Pipeline →
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.title}
            className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm hover:border-gold-400/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-charcoal/70">{m.title}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badgeColor}`}>
                {m.badge}
              </span>
            </div>
            <div className={`font-serif text-3xl font-bold ${m.highlight}`}>
              {m.value}
            </div>
            <p className="text-[11px] text-charcoal/60">{m.subtext}</p>
          </div>
        ))}
      </div>

      {/* "Never Lose an Enquiry" SLA Section */}
      {staleEnquiries.length > 0 && (
        <div className="rounded-2xl border border-terracotta/40 bg-terracotta/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="font-serif text-lg font-semibold text-terracotta">
                  Never Lose an Enquiry — Stale Inbound SLA Alert ({staleEnquiries.length})
                </h3>
                <p className="text-xs text-charcoal/70">
                  These potential royal weddings have waited over 48 hours without coordinator contact. Reach out immediately.
                </p>
              </div>
            </div>
            <Link
              href="/admin/enquiries"
              className="text-xs font-semibold text-terracotta underline hover:text-terracotta-700"
            >
              View All Enquiries →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {staleEnquiries.map((enq) => (
              <div
                key={enq.id}
                className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-maroon">{enq.code}</span>
                    <span className="text-xs font-semibold text-charcoal">{enq.contact_name}</span>
                  </div>
                  <p className="text-[11px] text-charcoal/60 mt-0.5">
                    {enq.city} · {enq.guest_count} Guests · Phone: {enq.contact_phone}
                  </p>
                </div>
                <Link
                  href={`/admin/enquiries/${enq.id}`}
                  className="rounded-lg bg-terracotta/10 px-3 py-1.5 text-xs font-semibold text-terracotta hover:bg-terracotta hover:text-ivory transition-colors"
                >
                  Contact Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Grid: Upcoming Weddings & Operational Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upcoming Weddings (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-charcoal">
                Active & Upcoming Luxury Weddings
              </h2>
              <p className="text-xs text-charcoal/60 mt-0.5">
                Current season calendar & operational execution
              </p>
            </div>
            <Link
              href="/admin/weddings"
              className="text-xs font-semibold text-maroon hover:underline"
            >
              All Weddings ({activeWeddingsCount}) →
            </Link>
          </div>

          {upcomingWeddings.length === 0 ? (
            <div className="py-12 text-center text-charcoal/50 text-xs">
              No confirmed weddings in the system yet. Convert an accepted enquiry in the CRM pipeline to generate instant operational plans.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {upcomingWeddings.map((w) => (
                <div key={w.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-maroon/10 text-maroon px-2 py-0.5 rounded">
                        {w.code}
                      </span>
                      <h4 className="font-semibold text-sm text-charcoal">{w.title}</h4>
                    </div>
                    <p className="text-xs text-charcoal/60 mt-1">
                      📍 {w.venue} ({w.city}) · 👥 {w.guest_count_planned} Guests · 📅 {w.start_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-gold-700">
                      {formatPaise(BigInt(w.budget_paise))}
                    </span>
                    <Link
                      href={`/admin/weddings/${w.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-maroon transition-colors"
                    >
                      View Operations
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Management Links */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-charcoal border-b border-border/60 pb-3">
            Command Modules
          </h2>

          <div className="space-y-3">
            <Link
              href="/admin/enquiries"
              className="block p-3.5 rounded-xl border border-border hover:border-gold-400 bg-background transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal group-hover:text-maroon">
                  📋 CRM Pipeline Board
                </span>
                <span className="text-xs text-charcoal/40">→</span>
              </div>
              <p className="text-[11px] text-charcoal/60 mt-1">
                Move leads from New → Consultation → Agreement → Proposal → Confirmed.
              </p>
            </Link>

            <Link
              href="/admin/vendors"
              className="block p-3.5 rounded-xl border border-border hover:border-gold-400 bg-background transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal group-hover:text-maroon">
                  🍽️ Vendor Directory & RFQs
                </span>
                <span className="text-xs text-charcoal/40">→</span>
              </div>
              <p className="text-[11px] text-charcoal/60 mt-1">
                Compare 3 caterers with per-plate math, inclusions matrix, and select winner.
              </p>
            </Link>

            <Link
              href="/admin/team"
              className="block p-3.5 rounded-xl border border-border hover:border-gold-400 bg-background transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal group-hover:text-maroon">
                  👥 Team & Workload
                </span>
                <span className="text-xs text-charcoal/40">→</span>
              </div>
              <p className="text-[11px] text-charcoal/60 mt-1">
                Assign Lead Planners & Coordinators; invite employee accounts.
              </p>
            </Link>

            <Link
              href="/admin/content"
              className="block p-3.5 rounded-xl border border-border hover:border-gold-400 bg-background transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal group-hover:text-maroon">
                  🌐 Public Website CMS
                </span>
                <span className="text-xs text-charcoal/40">→</span>
              </div>
              <p className="text-[11px] text-charcoal/60 mt-1">
                Edit luxury packages, paise starting prices, and social proof citations.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
