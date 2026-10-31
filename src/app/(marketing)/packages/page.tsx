import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPaise } from "@/lib/utils";
import { GoldKnotIcon } from "@/components/ui/logo";
import type { Package } from "@/types/database";

export const metadata = {
  title: "Luxury Wedding Packages & Staged Plans · Vivona",
  description:
    "Explore Vivona's Full-Service Royal Wedding Architecture and Partial Big-Day Orchestration packages across Jaipur and Udaipur.",
};

const DEFAULT_PACKAGES: Partial<Package>[] = [
  {
    slug: "full-service",
    name: "Full-Service Royal Wedding",
    type: "full_service",
    tagline: "Complete 3-Day Wedding Architecture & White-Glove Production in Rajasthan",
    description:
      "End-to-end management spanning bespoke heritage theme design, palace venue curation, 18+ vendor RFQ negotiations, 400+ guest logistics, rehearsal orchestration, and minute-by-minute live day operations.",
    starting_price_paise: 350000000,
    inclusions: [
      "Full wedding concept, mood boards and palace decor styling",
      "Comprehensive vendor curation, RFQ bidding and contract management",
      "Staged 3-day guest hospitality, luxury airport transfers and room drops",
      "Dedicated lead planner + 3 on-site coordinators throughout the season",
      "Minute-by-minute live digital console and vendor check-in tracking",
      "Post-wedding itemized settlement and audit reconciliation",
    ],
  },
  {
    slug: "day-of",
    name: "Partial & Big-Day Orchestration",
    type: "day_of",
    tagline: "Precision On-Site Operations, Vendor Check-in & Live Flow Management",
    description:
      "Designed for couples who have booked key vendors but require a rigorous operations team to take over 4 weeks prior: vendor synchronization, arrival enforcement, incident mitigation, and seamless day-of execution.",
    starting_price_paise: 120000000,
    inclusions: [
      "Handover and vendor synchronization 30 days prior to event",
      "Master minute-by-minute event schedule and procession cues",
      "Live on-site check-in board with automated late detection",
      "On-ground lead coordinator and rapid incident response team",
      "Guest reception coordination and family procession timing",
      "Post-event vendor clear-up and asset return supervision",
    ],
  },
];

async function getPackages(): Promise<Partial<Package>[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (data && data.length > 0) return data;
  } catch {
    // Fall back to defaults
  }
  return DEFAULT_PACKAGES;
}

export default async function PackagesPage() {
  const packages = await getPackages();

  const comparisonFeatures = [
    { title: "Planning Horizon", full: "6 to 12 months ahead", dayOf: "4 to 6 weeks ahead" },
    { title: "Palace Venue & Tendering", full: "Included (Full Negotiation)", dayOf: "Client Sourced" },
    { title: "Structured Vendor RFQs (18+ categories)", full: "Full Curation & Selection", dayOf: "Timeline Alignment Only" },
    { title: "Side-by-Side 3-Caterer Comparison", full: "Included (Per-Plate Math)", dayOf: "Execution Only" },
    { title: "Dedicated Lead Planner", full: "Continuous Lead Planner", dayOf: "Dedicated Lead Coordinator" },
    { title: "On-Ground Coordinators on Day", full: "3 Dedicated Staff", dayOf: "2 Dedicated Staff" },
    { title: "Minute-by-Minute Live Event Console", full: "Included (Realtime)", dayOf: "Included (Realtime)" },
    { title: "Vendor Arrival Late Detection Board", full: "Included", dayOf: "Included" },
    { title: "Financial Ledger & Reconciled Settlement", full: "Full Traceability", dayOf: "Day-of Timesheet Only" },
  ];

  return (
    <div className="container py-12 md:py-20 space-y-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-50/60 px-4 py-1 text-xs font-semibold text-charcoal">
          <GoldKnotIcon className="w-3.5 h-3.5 text-gold-500" />
          <span>Tailored Rajasthan Wedding Architecture</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-6xl font-semibold text-maroon">
          Curated Experiences & Transparent Pricing
        </h1>
        <p className="text-sm sm:text-base text-charcoal/70 leading-relaxed font-sans">
          Whether you require a complete multi-day palace production from inception or seasoned on-ground commanders to take over final execution, every Vivona package is built on operational precision.
        </p>
      </div>

      {/* Side-by-side Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {packages.map((pkg, idx) => {
          const isFullService = pkg.slug === "full-service" || pkg.type === "full_service";

          return (
            <div
              key={pkg.slug}
              className={`rounded-2xl border p-8 flex flex-col justify-between transition-all shadow-sm ${
                isFullService
                  ? "border-maroon/30 bg-card shadow-maroon/5 ring-1 ring-maroon/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      isFullService
                        ? "bg-maroon/10 text-maroon border border-maroon/20"
                        : "bg-sage-100 text-sage-700 border border-sage-300"
                    }`}
                  >
                    {isFullService ? "Most Selected · Complete" : "Operational Mastery"}
                  </span>
                  <span className="text-xs text-charcoal/50 font-mono">Tier {idx + 1}</span>
                </div>

                <div>
                  <h2 className="font-serif text-3xl font-semibold text-charcoal">
                    {pkg.name}
                  </h2>
                  <p className="text-xs text-charcoal/70 mt-2 font-sans leading-relaxed">
                    {pkg.tagline || pkg.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/80">
                  <span className="text-xs uppercase tracking-wider text-charcoal/60 font-semibold block">
                    Starting Agency Fee
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-serif text-4xl font-bold text-maroon">
                      {formatPaise(pkg.starting_price_paise || 0n, { showCompact: true })}
                    </span>
                    <span className="text-xs text-charcoal/60">
                      ({formatPaise(pkg.starting_price_paise || 0n)}) + GST
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal/50 mt-1">
                    Excludes attributable 3rd-party vendor costs (Catering, Venue, Decor).
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/80">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                    What is Included:
                  </h3>
                  <ul className="space-y-2.5 text-xs text-charcoal/80">
                    {(pkg.inclusions || []).map((inc, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="text-maroon font-bold shrink-0 mt-0.5">✓</span>
                        <span className="leading-relaxed">{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href={`/book?package=${pkg.slug}`}
                  className={`w-full inline-flex items-center justify-center rounded-xl py-3.5 text-xs font-semibold uppercase tracking-wider transition-all shadow-sm ${
                    isFullService
                      ? "bg-maroon text-ivory hover:bg-maroon-600"
                      : "bg-charcoal text-ivory hover:bg-charcoal/90"
                  }`}
                >
                  Select {pkg.name} →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inclusions Comparison Matrix */}
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-semibold text-charcoal">
            Feature & Capability Matrix
          </h2>
          <p className="text-xs text-charcoal/70 mt-1">
            Detailed breakdown between full-service architecture and day-of execution.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory-200/80 border-b border-border/80 text-charcoal font-semibold">
                <tr>
                  <th className="py-4 px-6 w-1/2">Operational Capability</th>
                  <th className="py-4 px-6 text-maroon font-serif text-sm">Full-Service Royal</th>
                  <th className="py-4 px-6 text-charcoal/80 font-serif text-sm">Partial & Day-Of</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-charcoal/80">
                {comparisonFeatures.map((row) => (
                  <tr key={row.title} className="hover:bg-ivory-100/40 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-charcoal">{row.title}</td>
                    <td className="py-3.5 px-6 text-maroon font-medium">{row.full}</td>
                    <td className="py-3.5 px-6 text-charcoal/70">{row.dayOf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staged Payment Plan Explanation */}
      <div className="max-w-5xl mx-auto rounded-2xl border border-gold-400/40 bg-ivory-200/60 p-8 sm:p-12 space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs uppercase tracking-widest text-maroon font-bold">
            Transparent Cashflow
          </span>
          <h2 className="font-serif text-3xl font-semibold text-charcoal">
            Standard 3-Stage Payment Plan
          </h2>
          <p className="text-xs sm:text-sm text-charcoal/70 leading-relaxed font-sans">
            We never demand 100% upfront. Every Vivona contract is divided into 3 predictable milestones summing exactly to 100%, protecting your liquidity throughout the wedding cycle.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-maroon uppercase">Milestone 1</span>
              <span className="text-sm font-serif font-bold text-maroon bg-maroon/10 px-2.5 py-0.5 rounded-full">
                20%
              </span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-charcoal">Booking Deposit</h3>
            <p className="text-xs text-charcoal/70 leading-relaxed">
              Paid upon contract execution. Locks your wedding dates in Jaipur/Udaipur and instantly generates the 30+ task plan.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gold-600 uppercase">Milestone 2</span>
              <span className="text-sm font-serif font-bold text-gold-700 bg-gold-100 px-2.5 py-0.5 rounded-full">
                30%
              </span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-charcoal">30-Day Advance</h3>
            <p className="text-xs text-charcoal/70 leading-relaxed">
              Due approximately 30 days prior to event. Funds final vendor retainers, palace permits, and custom stage carpentry.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sage-600 uppercase">Milestone 3</span>
              <span className="text-sm font-serif font-bold text-sage-700 bg-sage-100 px-2.5 py-0.5 rounded-full">
                50%
              </span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-charcoal">Post-Event Settlement</h3>
            <p className="text-xs text-charcoal/70 leading-relaxed">
              Settled within 7 days after the wedding upon itemized audit review, actual guest cover reconciliation, and vendor clearance.
            </p>
          </div>
        </div>

        <div className="text-center pt-4">
          <Link
            href="/book"
            className="inline-flex items-center justify-center rounded-xl bg-maroon px-8 py-3 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
          >
            Request Your Tailored Quote →
          </Link>
        </div>
      </div>
    </div>
  );
}
