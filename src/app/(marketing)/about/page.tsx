import Link from "next/link";
import { GoldKnotIcon } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: "About Our Agency · Vivona Luxury Weddings",
  description:
    "Learn about Vivona's operational philosophy, luxury wedding management standards, and dedicated agency team.",
};

export default function AboutPage() {
  return (
    <div className="container py-12 md:py-20 space-y-20 max-w-5xl">
      {/* Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-50/60 px-4 py-1 text-xs font-semibold text-charcoal">
          <GoldKnotIcon className="w-3.5 h-3.5 text-gold-500" />
          <span>Luxury Destination Wedding Architecture</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-6xl font-semibold text-maroon">
          About Vivona
        </h1>
        <p className="text-sm sm:text-base text-charcoal/70 leading-relaxed font-sans">
          Born from the recognition that luxury multi-day celebrations demand the rigorous discipline of an operations center paired with warm, royal hospitality.
        </p>
      </div>

      {/* The Origin & Philosophy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <span className="text-xs uppercase tracking-widest text-maroon font-bold">
            Our Purpose
          </span>
          <h2 className="font-serif text-3xl font-semibold text-charcoal">
            The Digital Backbone of High-Stakes Celebrations
          </h2>
          <p className="text-xs sm:text-sm text-charcoal/75 leading-relaxed font-sans">
            A typical three-day celebration involves 400+ guests traveling from across the globe, 18+ independent luxury vendors (caterers, florists, percussionists, luxury chauffeur fleets), and budgets spanning multiple crores.
          </p>
          <p className="text-xs sm:text-sm text-charcoal/75 leading-relaxed font-sans">
            For years, the industry relied on fragmented WhatsApp groups, lost paper checklists, and unitemized invoices discovered months after the wedding. Vivona was built to replace that chaos with an integrated digital command center.
          </p>
        </div>

        <div className="rounded-2xl border border-gold-400/40 bg-ivory-200/60 p-8 space-y-6">
          <h3 className="font-serif text-2xl font-semibold text-maroon">
            The Three Inviolable Tenets
          </h3>
          <div className="space-y-4 text-xs text-charcoal/80">
            <div>
              <p className="font-semibold text-charcoal">1. True Recognized Profit & Reconciled Ledgers</p>
              <p className="text-charcoal/60 mt-0.5">Every vendor payment, client advance, and extra plate count is audited down to the integer paise.</p>
            </div>
            <div>
              <p className="font-semibold text-charcoal">2. Live Big-Day Arrival Enforcement</p>
              <p className="text-charcoal/60 mt-0.5">Minute-by-minute timelines with automated late-arrival flags past grace periods ensure the Baraat and ceremonies never suffer delays.</p>
            </div>
            <div>
              <p className="font-semibold text-charcoal">3. Exclusive Capacity</p>
              <p className="text-charcoal/60 mt-0.5">We strictly limit our season to 25 luxury weddings, providing white-glove focus to every family.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Team Roster */}
      <div className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="font-serif text-3xl font-semibold text-charcoal">
            Our Operational Leadership
          </h2>
          <p className="text-xs text-charcoal/60">
            Experienced palace planners, logistical commanders, and culinary directors.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-maroon/10 text-maroon font-serif text-xl font-bold flex items-center justify-center mx-auto">
              DR
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-charcoal">Devraj Rathore</h3>
              <p className="text-xs text-maroon font-medium">Founder & Managing Director</p>
            </div>
            <p className="text-[11px] text-charcoal/60 leading-relaxed">
              15 years curating palace heritage weddings at Rambagh and Pichola.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-700 font-serif text-xl font-bold flex items-center justify-center mx-auto">
              AS
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-charcoal">Ananya Sharma</h3>
              <p className="text-xs text-sage-600 font-medium">Lead Wedding Planner</p>
            </div>
            <p className="text-[11px] text-charcoal/60 leading-relaxed">
              Specialist in theme design, couple consultations, and vendor RFQ comparisons.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-gold-100 text-gold-700 font-serif text-xl font-bold flex items-center justify-center mx-auto">
              VS
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-charcoal">Vikramaditya Singh</h3>
              <p className="text-xs text-gold-600 font-medium">Head of Live Operations</p>
            </div>
            <p className="text-[11px] text-charcoal/60 leading-relaxed">
              Controls loading docks, sound engineering riders, and Baraat processions.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-terracotta/10 text-terracotta font-serif text-xl font-bold flex items-center justify-center mx-auto">
              MS
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-charcoal">Meera Shekhawat</h3>
              <p className="text-xs text-terracotta font-medium">Guest Hospitality Lead</p>
            </div>
            <p className="text-[11px] text-charcoal/60 leading-relaxed">
              Oversees luxury airport chauffeur transfers, room drops, and ritual priests.
            </p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="text-center pt-8 border-t border-border/80">
        <Link
          href="/book"
          className="inline-flex items-center justify-center rounded-xl bg-maroon px-8 py-3.5 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
        >
          Schedule a Consultation →
        </Link>
      </div>
    </div>
  );
}
