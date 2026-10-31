"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";

interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/" },
  { label: "Curated Packages", href: "/packages" },
  { label: "Real Weddings & Citations", href: "/social-proof" },
  { label: "The Agency", href: "/about" },
];

function useSafePathname() {
  try {
    return usePathname() || "";
  } catch {
    return "";
  }
}

export function MarketingMobileNav() {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = useSafePathname();

  // Close drawer when path changes
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* Mobile Hamburger Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        className="p-2 rounded-xl text-charcoal hover:text-maroon hover:bg-ivory-300/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 top-20 z-50 flex flex-col bg-background/98 backdrop-blur-xl border-t border-border/80 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
            {/* Navigation Links */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal/50 px-2 block">
                Navigation
              </span>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
                        isActive
                          ? "bg-maroon/10 text-maroon font-semibold"
                          : "text-charcoal hover:bg-ivory-300/60 hover:text-maroon"
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-charcoal/40" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-border/80 space-y-3">
              <Link
                href="/book"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center rounded-xl bg-maroon py-3.5 text-base font-semibold text-ivory shadow-sm hover:bg-maroon-600 transition-colors"
              >
                Plan Your Wedding
              </Link>
              <Link
                href="/login"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center rounded-xl border border-charcoal/20 bg-card py-3.5 text-base font-medium text-charcoal hover:bg-ivory-300/50 transition-colors"
              >
                Sign In (Demo Roles)
              </Link>
            </div>

            {/* Micro Agency Trust Note */}
            <div className="pt-4 text-center">
              <p className="text-xs text-charcoal/60">
                Exclusive 25 Weddings / Season · High-Stakes Operations
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
