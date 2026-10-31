import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const session = await getSessionProfile();

  const metrics = [
    {
      title: "New Enquiries Today",
      value: "4",
      subtext: "2 Package · 2 Custom Blueprint",
      highlight: "text-maroon",
      badge: "Inbound Active",
      badgeColor: "bg-maroon/10 text-maroon",
    },
    {
      title: "Stale Enquiries (>48h)",
      value: "1",
      subtext: "Action needed: Follow-up required",
      highlight: "text-terracotta",
      badge: "Alert",
      badgeColor: "bg-terracotta/10 text-terracotta",
    },
    {
      title: "Active Weddings",
      value: "25",
      subtext: "Jaipur (15) · Udaipur (10)",
      highlight: "text-charcoal",
      badge: "Season 2026",
      badgeColor: "bg-gold-100 text-gold-700",
    },
    {
      title: "Pending Approvals",
      value: "3",
      subtext: "1 Extra Charge · 2 RFQ Quotes",
      highlight: "text-gold-600",
      badge: "Action Required",
      badgeColor: "bg-gold-50 text-gold-700",
    },
  ];

  const upcomingWeddings = [
    {
      code: "VIV-2026-001",
      couple: "Rohan & Priyamvada",
      venue: "Rambagh Palace, Jaipur",
      date: "Nov 14 – 16, 2026",
      guests: 450,
      leadPlanner: "Ananya Sharma",
      status: "planning",
      budgetPaise: 450000000n, // ₹4.5 Crore
    },
    {
      code: "VIV-2026-002",
      couple: "Kabir & Alankrita",
      venue: "City Palace, Udaipur",
      date: "Dec 02 – 04, 2026",
      guests: 500,
      leadPlanner: "Vikramaditya Singh",
      status: "planning",
      budgetPaise: 520000000n, // ₹5.2 Crore
    },
    {
      code: "VIV-2026-003",
      couple: "Siddharth & Radhika",
      venue: "Fateh Garh Palace, Udaipur",
      date: "Dec 18 – 20, 2026",
      guests: 350,
      leadPlanner: "Meera Shekhawat",
      status: "planning",
      budgetPaise: 380000000n, // ₹3.8 Crore
    },
  ];

  return (
    <div className="space-y-8">
      {/* Executive Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-500 font-semibold">
            Founder & Operations Command
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Executive Command Center: {session?.profile.full_name || "Founder"}
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Real-time control tower across all 25 luxury weddings, vendor bids, and season finances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/enquiries"
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-ivory-300/40 transition-colors"
          >
            Open CRM Pipeline
          </Link>
          <Link
            href="/admin/vendors"
            className="rounded-xl bg-maroon px-4 py-2 text-xs font-medium text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
          >
            RFQ Matrix & Comparison
          </Link>
        </div>
      </div>

      {/* Metrics Row (4 Core Cards per 3.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal/70">{m.title}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badgeColor}`}>
                {m.badge}
              </span>
            </div>
            <p className={`font-serif text-3xl font-bold ${m.highlight}`}>
              {m.value}
            </p>
            <p className="text-[11px] text-charcoal/60">{m.subtext}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Weddings Season Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-charcoal">
              Upcoming Season Weddings
            </h2>
            <p className="text-xs text-charcoal/60">
              High-value celebrations entering final 60-day operational windows.
            </p>
          </div>
          <Link
            href="/admin/weddings"
            className="text-xs font-semibold text-maroon hover:underline"
          >
            View All 25 Weddings →
          </Link>
        </div>

        {/* Responsive Table to Cards */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory-200/60 border-b border-border/80 text-charcoal font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Couple</th>
                  <th className="py-3.5 px-4">Venue & City</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Guests</th>
                  <th className="py-3.5 px-4">Lead Planner</th>
                  <th className="py-3.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-charcoal/80">
                {upcomingWeddings.map((w) => (
                  <tr key={w.code} className="hover:bg-ivory-100/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-maroon">
                      {w.code}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-charcoal">
                      {w.couple}
                    </td>
                    <td className="py-3.5 px-4">{w.venue}</td>
                    <td className="py-3.5 px-4">{w.date}</td>
                    <td className="py-3.5 px-4">{w.guests} Guests</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-sage-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                        {w.leadPlanner}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/weddings/${w.code}`}
                        className="text-xs font-semibold text-maroon hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
