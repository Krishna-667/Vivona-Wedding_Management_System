import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between">
          <Logo size="md" showTagline />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-charcoal/80">
            <Link
              href="/"
              className="hover:text-maroon transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/packages"
              className="hover:text-maroon transition-colors"
            >
              Packages
            </Link>
            <Link
              href="/social-proof"
              className="hover:text-maroon transition-colors"
            >
              Real Weddings & Citations
            </Link>
            <Link
              href="/about"
              className="hover:text-maroon transition-colors"
            >
              The Agency
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-maroon hover:text-maroon-600 transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-xl bg-maroon px-5 py-2.5 text-sm font-medium text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
            >
              Plan Your Wedding
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      {/* Luxury Rajasthani Heritage Footer */}
      <footer className="border-t border-border/80 bg-ivory-300/40 py-14 text-charcoal">
        <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <Logo size="md" showTagline />
            <p className="text-sm text-charcoal/70 max-w-md font-sans">
              Vivona is the high-performance digital backbone for premier palace weddings across Jaipur and Udaipur. Delivering precision operations, transparent crore-scale budgeting, and live day-of orchestration.
            </p>
            <p className="text-xs text-charcoal/50">
              Operating at Rambagh Palace, City Palace Udaipur, Jagmandir Island, and Fairmont Jaipur.
            </p>
          </div>

          <div>
            <h4 className="font-serif text-lg font-semibold text-maroon mb-3">
              Experiences
            </h4>
            <ul className="space-y-2 text-sm text-charcoal/80">
              <li>
                <Link href="/packages" className="hover:text-maroon">
                  Full-Service Royal Wedding
                </Link>
              </li>
              <li>
                <Link href="/packages" className="hover:text-maroon">
                  Partial & Day-Of Orchestration
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-maroon">
                  Bespoke Custom Plan Builder
                </Link>
              </li>
              <li>
                <Link href="/social-proof" className="hover:text-maroon">
                  Verified Social Proof & Press
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg font-semibold text-maroon mb-3">
              Agency Concierge
            </h4>
            <div className="space-y-2 text-sm text-charcoal/80">
              <p>Jaipur HQ: C-Scheme, Ashok Nagar</p>
              <p>Udaipur Office: Haridas Ji Ki Magri</p>
              <p className="text-maroon font-medium">{BRAND.supportEmail}</p>
              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-gold-400/20 text-charcoal font-medium border border-gold-400/40">
                  25 Weddings / Season
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal/60">
          <p>© {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.</p>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <Link href="/login" className="hover:text-maroon">Staff & Client Portal</Link>
            <span>·</span>
            <span>Jaipur · Udaipur Luxury Wedding Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
