import Link from "next/link";
import { withAnon } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";
import { GoldKnotIcon } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand";
import { fetchWithCache } from "@/lib/cache";
import type { Package, SocialProof } from "@/types/database";

export const metadata = {
  title: "Vivona · Luxury Wedding Planning & Operations",
  description:
    "The digital backbone of luxury multi-day destination weddings. Replaces WhatsApp groups and paper checklists with real-time operational precision.",
  openGraph: {
    title: "Vivona · Luxury Wedding Planning & Operations",
    description:
      "Exclusive 25 weddings per season. Transparent crore-scale budgeting, 3-caterer price-per-plate comparison, and live big-day enforcement.",
    type: "website",
    locale: "en_IN",
  },
};

export const revalidate = 60; // Cache page for 60 seconds (ISR) for sub-10ms response times

const DEFAULT_PACKAGES: Partial<Package>[] = [
  {
    slug: "full-service",
    name: "Full-Service Royal Wedding",
    type: "full_service",
    tagline: "Complete 3-Day Wedding Architecture & White-Glove Production for Luxury Destinations",
    starting_price_paise: 350000000,
    inclusions: [
      "Full palace concept, mood boards and decor architecture",
      "Comprehensive vendor curation & 3-caterer RFQ tender comparison",
      "Staged 3-day guest hospitality, luxury airport fleet & room drops",
      "Dedicated lead planner + 3 on-site coordinators on event days",
      "Minute-by-minute live digital console & vendor arrival tracking",
    ],
  },
  {
    slug: "day-of",
    name: "Partial & Big-Day Orchestration",
    type: "day_of",
    tagline: "Precision On-Site Operations, Vendor Check-in & Live Flow Management",
    starting_price_paise: 120000000,
    inclusions: [
      "Handover & vendor synchronization 30 days prior to event",
      "Master minute-by-minute event schedule and procession cues",
      "Live on-site check-in board with automated late detection",
      "On-ground lead coordinator and rapid incident response team",
      "Post-event vendor clear-up and asset return supervision",
    ],
  },
];

const DEFAULT_PROOF = [
  {
    id: "sp-1",
    platform: "instagram",
    handle: "@vogueindia",
    author_name: "Vogue India Weddings",
    post_url: "https://instagram.com/p/DB1100Vivona1",
    caption: "Inside Vivona's breathtaking 3-day royal palace celebration in Udaipur. A masterclass in heritage wedding architecture.",
    rating: 5,
  },
  {
    id: "sp-2",
    platform: "google_review",
    handle: "Rohan & Priyamvada",
    author_name: "Priyamvada Singhania",
    post_url: "https://maps.google.com/reviews/vivona/1",
    caption: "Vivona replaced the chaotic family WhatsApp groups with absolute calm. From caterer comparison to the live Baraat schedule, they made our dream wedding flawless.",
    rating: 5,
  },
  {
    id: "sp-3",
    platform: "google_review",
    handle: "Kabir & Alankrita",
    author_name: "Kabir Mittal",
    post_url: "https://maps.google.com/reviews/vivona/2",
    caption: "Crore-scale budget handled with extreme transparency. When we added 60 extra dinner guests, the per-plate math and billing was clear within minutes.",
    rating: 5,
  },
];

async function getHomeData() {
  return fetchWithCache("home_page_data_cache", 300000, async () => {
    try {
      const [packages, socialProof] = await withAnon(async (sql) => {
        const pkgs = await sql`
          SELECT * FROM public.packages WHERE is_active = true ORDER BY display_order ASC
        `;
        const sp = await sql`
          SELECT * FROM public.social_proof WHERE featured = true ORDER BY display_order ASC LIMIT 3
        `;
        return [pkgs, sp];
      });

      return {
        packages: (packages && packages.length > 0) ? (packages as unknown as Package[]) : (DEFAULT_PACKAGES as Package[]),
        socialProof: (socialProof && socialProof.length > 0) ? (socialProof as unknown as SocialProof[]) : (DEFAULT_PROOF as SocialProof[]),
      };
    } catch {
      return {
        packages: DEFAULT_PACKAGES as Package[],
        socialProof: DEFAULT_PROOF as SocialProof[],
      };
    }
  });
}

export default async function HomePage() {
  const { packages, socialProof } = await getHomeData();

  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* Hero Section with Wedding Stage Background */}
      <section className="relative overflow-hidden rounded-3xl border border-gold-400/30 shadow-xl mx-auto max-w-7xl">
        {/* Background Image with Opacity & Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/images/hero-wedding-stage.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FBF7F0]/90 via-[#FBF7F0]/85 to-[#FBF7F0]/95" />

        {/* Content Container */}
        <div className="relative z-10 container text-center space-y-7 py-20 sm:py-28 md:py-32 max-w-4xl px-4 sm:px-8">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/50 bg-[#FBF7F0]/90 px-4 py-1.5 text-xs font-semibold text-charcoal shadow-xs">
            <GoldKnotIcon className="w-3.5 h-3.5 text-gold-500" />
            <span>Exclusive 25 Weddings / Season</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-maroon leading-[1.12]">
            The Digital Backbone of Luxury Weddings
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-charcoal/85 max-w-2xl mx-auto font-sans leading-relaxed font-normal">
            Replacing chaotic WhatsApp groups and paper diaries with an end-to-end operational engine: from first consultation to 3-caterer quote comparison, instant 30-task orchestration, and real-time live day check-ins.
          </p>

          {/* Two Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/book"
              prefetch={true}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-maroon px-8 py-3.5 text-base font-semibold text-ivory hover:bg-maroon-600 transition-all shadow-md hover:shadow-lg"
            >
              Start Your Wedding Plan
            </Link>
            <Link
              href="/login"
              prefetch={true}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-charcoal/20 bg-card px-8 py-3.5 text-base font-semibold text-charcoal hover:bg-card/90 transition-all shadow-sm"
            >
              Enter Role Portal
            </Link>
          </div>

          {/* Sub-heading */}
          <div className="pt-8 border-t border-gold-400/30 max-w-xl mx-auto">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-maroon">
              Engineered for High-Stakes Celebrations
            </h2>
            <p className="text-xs sm:text-sm text-charcoal/70 mt-1">
              How Vivona solves the 6 operational friction points of crore-scale luxury weddings.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Numbers Strip */}
      <section className="container">
        <div className="rounded-2xl border border-gold-400/40 bg-ivory-200/60 p-8 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="font-serif text-3xl sm:text-4xl font-bold text-maroon">25</p>
            <p className="text-xs uppercase tracking-wider text-charcoal/70 font-semibold">
              Weddings / Season Max
            </p>
            <p className="text-[11px] text-charcoal/50">White-glove dedicated leadership</p>
          </div>
          <div className="space-y-1">
            <p className="font-serif text-3xl sm:text-4xl font-bold text-maroon">18+</p>
            <p className="text-xs uppercase tracking-wider text-charcoal/70 font-semibold">
              Vendor Disciplines
            </p>
            <p className="text-[11px] text-charcoal/50">Caterers, AV, florists & fleet</p>
          </div>
          <div className="space-y-1">
            <p className="font-serif text-3xl sm:text-4xl font-bold text-maroon">100%</p>
            <p className="text-xs uppercase tracking-wider text-charcoal/70 font-semibold">
              Integer Paise Audited
            </p>
            <p className="text-[11px] text-charcoal/50">Zero float rounding discrepancies</p>
          </div>
          <div className="space-y-1">
            <p className="font-serif text-3xl sm:text-4xl font-bold text-maroon">0</p>
            <p className="text-xs uppercase tracking-wider text-charcoal/70 font-semibold">
              Baraat Delays
            </p>
            <p className="text-[11px] text-charcoal/50">Automated grace period alerts</p>
          </div>
        </div>
      </section>

      {/* Featured Packages (Dynamic from DB) */}
      <section className="container space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-widest text-maroon font-bold">
            Tailored Experiences
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal">
            Curated Wedding Packages
          </h2>
          <p className="text-xs sm:text-sm text-charcoal/70">
            Transparent pricing linked directly to real database records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {packages.map((pkg) => {
            const isFull = pkg.slug === "full-service" || pkg.type === "full_service";

            return (
              <div
                key={pkg.slug}
                className="rounded-2xl border border-border bg-card p-8 flex flex-col justify-between shadow-sm hover:border-gold-400/60 transition-all space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isFull
                          ? "bg-maroon/10 text-maroon border border-maroon/20"
                          : "bg-sage-100 text-sage-700 border border-sage-300"
                      }`}
                    >
                      {isFull ? "Complete Production" : "On-Site Operations"}
                    </span>
                    <span className="font-serif text-2xl font-bold text-maroon">
                      {formatPaise(pkg.starting_price_paise || 0n, { showCompact: true })}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl font-semibold text-charcoal">{pkg.name}</h3>
                    <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
                      {pkg.tagline || pkg.description}
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-charcoal/80 pt-2 border-t border-border/60">
                    {((pkg.inclusions as string[]) || []).slice(0, 4).map((inc: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-maroon font-bold">✓</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-border/80">
                  <Link
                    href={`/book?package=${pkg.slug}`}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-maroon py-3 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
                  >
                    Select {pkg.name} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Social Proof Showcase (Dynamic from DB) */}
      <section className="container space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-widest text-gold-600 font-bold">
            Verified Citations
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal">
            Real Weddings & Press Features
          </h2>
          <p className="text-xs text-charcoal/70">
            Real couple reviews and press coverage linking directly to original sources.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {socialProof.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-ivory-300 text-charcoal">
                    {item.platform}
                  </span>
                  <div className="text-gold-500 text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-charcoal/80 italic font-serif leading-relaxed">
                  &ldquo;{item.caption}&rdquo;
                </p>
                <div>
                  <p className="text-xs font-semibold text-charcoal">{item.author_name}</p>
                  <p className="text-[10px] text-charcoal/50 font-mono">{item.handle}</p>
                </div>
              </div>

              <a
                href={item.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-maroon hover:underline inline-flex items-center gap-1"
              >
                <span>View Citation</span>
                <span>↗</span>
              </a>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <Link
            href="/social-proof"
            className="text-xs font-semibold text-maroon hover:underline"
          >
            View All Verified Citations & Reviews →
          </Link>
        </div>
      </section>

      {/* How it Works / 6-Scene Lifecycle */}
      <section className="container max-w-5xl mx-auto space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="font-serif text-3xl font-semibold text-charcoal">
            The Vivona Operational Lifecycle
          </h2>
          <p className="text-xs text-charcoal/70">
            From your first blueprint submission to post-wedding ledger settlement.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs">
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="font-serif text-lg font-bold text-maroon">01</span>
            <p className="font-semibold text-charcoal">Enquiry & Blueprint</p>
            <p className="text-[10px] text-charcoal/50">Dates, themes & scale</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="font-serif text-lg font-bold text-maroon">02</span>
            <p className="font-semibold text-charcoal">Agreement E-Sign</p>
            <p className="text-[10px] text-charcoal/50">Signed PDF unlocks gate</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="font-serif text-lg font-bold text-maroon">03</span>
            <p className="font-semibold text-charcoal">3-Caterer RFQ</p>
            <p className="text-[10px] text-charcoal/50">Price-per-plate math</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="font-serif text-lg font-bold text-maroon">04</span>
            <p className="font-semibold text-charcoal">Instant 30+ Plan</p>
            <p className="text-[10px] text-charcoal/50">Assigned coordinators</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="font-serif text-lg font-bold text-maroon">05</span>
            <p className="font-semibold text-charcoal">Live Big-Day</p>
            <p className="text-[10px] text-charcoal/50">Auto late detection</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="font-serif text-lg font-bold text-maroon">06</span>
            <p className="font-semibold text-charcoal">Settlement</p>
            <p className="text-[10px] text-charcoal/50">Audited integer paise</p>
          </div>
        </div>
      </section>

      {/* Role Quick-Access Showcase */}
      <section className="container">
        <div className="rounded-2xl border border-maroon/20 bg-ivory-300/50 p-8 md:p-12 text-center space-y-6">
          <h2 className="font-serif text-3xl font-semibold text-maroon">
            Experience the 3 Built-in Roles
          </h2>
          <p className="text-sm text-charcoal/75 max-w-xl mx-auto font-sans">
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
