import Link from "next/link";
import { GoldKnotIcon } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand";

export default function HomePage() {
  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* Hero Section */}
      <section className="container text-center space-y-6 max-w-4xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-50/60 px-4 py-1.5 text-xs font-medium text-charcoal">
          <GoldKnotIcon className="w-3.5 h-3.5 text-gold-400" />
          <span>Jaipur & Udaipur · Exclusive 25 Weddings / Season</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-maroon leading-[1.1]">
          The Digital Backbone of Luxury Weddings in Rajasthan
        </h1>

        <p className="text-base sm:text-lg text-charcoal/80 max-w-2xl mx-auto font-sans leading-relaxed">
          Replacing chaotic WhatsApp groups and paper diaries with an end-to-end operational engine: from first consultation to 3-caterer quote comparison, instant 30-task orchestration, and real-time live day check-ins.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/book"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-maroon px-8 py-3.5 text-base font-medium text-ivory hover:bg-maroon-600 transition-colors shadow-md"
          >
            Start Your Wedding Plan
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border bg-card px-8 py-3.5 text-base font-medium text-charcoal hover:bg-ivory-300/50 transition-colors"
          >
            Enter Role Portal
          </Link>
        </div>
      </section>

      {/* Six Scenes Value Grid */}
      <section className="container">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="font-serif text-3xl font-semibold text-maroon">
            Engineered for High-Stakes Rajasthan Celebrations
          </h2>
          <p className="text-sm text-charcoal/70">
            How Vivona solves the 6 operational friction points of crore-scale palace weddings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center text-gold-600 font-serif font-bold">
              01
            </div>
            <h3 className="font-serif text-xl font-semibold text-maroon">First Consultation to E-Sign</h3>
            <p className="text-sm text-charcoal/75 leading-relaxed">
              Enquiry capture with theme, guest counts, and dates. Service agreements signed directly on phone with stored cryptographic PDFs.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center text-gold-600 font-serif font-bold">
              02
            </div>
            <h3 className="font-serif text-xl font-semibold text-maroon">3-Caterer RFQ Comparison</h3>
            <p className="text-sm text-charcoal/75 leading-relaxed">
              Structured side-by-side bids with calculated price-per-plate and inclusions. Awarding a winner automatically closes losing tenders with full audit preservation.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center text-gold-600 font-serif font-bold">
              03
            </div>
            <h3 className="font-serif text-xl font-semibold text-maroon">Instant 30+ Task Blueprint</h3>
            <p className="text-sm text-charcoal/75 leading-relaxed">
              Booking deposit instantly spawns a 30+ task operational roadmap with assigned team members, date offsets, and staged payment plans.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center text-gold-600 font-serif font-bold">
              04
            </div>
            <h3 className="font-serif text-xl font-semibold text-maroon">Live Big-Day Console</h3>
            <p className="text-sm text-charcoal/75 leading-relaxed">
              Minute-by-minute timeline, automated vendor late-flags past grace minutes, rapid incident logging, and real-time coordinator dispatch.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center text-gold-600 font-serif font-bold">
              05
            </div>
            <h3 className="font-serif text-xl font-semibold text-maroon">Idempotent Settlement</h3>
            <p className="text-sm text-charcoal/75 leading-relaxed">
              Single-transaction ledger with duplicate payment prevention, vendor advance deductions, and transparent approved extra guest rebilling.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center text-gold-600 font-serif font-bold">
              06
            </div>
            <h3 className="font-serif text-xl font-semibold text-maroon">Founder Season Analytics</h3>
            <p className="text-sm text-charcoal/75 leading-relaxed">
              True recognized profit per wedding across 25 celebrations, vendor punctuality scorecards, and 30-day cash forecast charts.
            </p>
          </div>
        </div>
      </section>

      {/* Role Quick-Access Showcase */}
      <section className="container">
        <div className="rounded-2xl border border-maroon/20 bg-ivory-300/50 p-8 md:p-12 text-center space-y-6">
          <h2 className="font-serif text-3xl font-semibold text-maroon">
            Experience the 3 Built-in Roles
          </h2>
          <p className="text-sm text-charcoal/75 max-w-xl mx-auto">
            Log in directly using pre-configured local demo credentials to review the role-gated UI and security boundary.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <Link
              href="/login?demo=admin"
              className="group block rounded-xl border border-border bg-card p-5 hover:border-maroon transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-maroon">Admin</span>
                <span className="text-xs bg-maroon/10 text-maroon px-2 py-0.5 rounded-full">Founder</span>
              </div>
              <p className="text-sm font-medium text-charcoal group-hover:text-maroon">Devraj Rathore</p>
              <p className="text-xs text-charcoal/60 mt-1 font-mono">admin@vivona.demo</p>
              <p className="text-xs text-charcoal/70 mt-3">Full pipeline, quotes, finance & season analytics</p>
            </Link>

            <Link
              href="/login?demo=employee"
              className="group block rounded-xl border border-border bg-card p-5 hover:border-maroon transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sage-500">Employee</span>
                <span className="text-xs bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full">Lead Planner</span>
              </div>
              <p className="text-sm font-medium text-charcoal group-hover:text-maroon">Ananya Sharma</p>
              <p className="text-xs text-charcoal/60 mt-1 font-mono">planner1@vivona.demo</p>
              <p className="text-xs text-charcoal/70 mt-3">Task board, client chat, and live big-day console</p>
            </Link>

            <Link
              href="/login?demo=client"
              className="group block rounded-xl border border-border bg-card p-5 hover:border-maroon transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gold-500">Client</span>
                <span className="text-xs bg-gold-100 text-gold-600 px-2 py-0.5 rounded-full">Couple</span>
              </div>
              <p className="text-sm font-medium text-charcoal group-hover:text-maroon">Rohan & Priyamvada</p>
              <p className="text-xs text-charcoal/60 mt-1 font-mono">couple1@vivona.demo</p>
              <p className="text-xs text-charcoal/70 mt-3">Milestone view, proposal acceptance & e-sign</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
