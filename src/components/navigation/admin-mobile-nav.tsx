"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { signOutAction } from "@/app/actions/auth";

interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
}

const ADMIN_NAV: AdminNavItem[] = [
  { label: "Executive Dashboard", href: "/admin", icon: "🏛️" },
  { label: "CRM & Enquiries", href: "/admin/enquiries", icon: "📬" },
  { label: "Weddings (Active)", href: "/admin/weddings", icon: "👑" },
  { label: "Vendors & RFQ Matrix", href: "/admin/vendors", icon: "⚖️" },
  { label: "Finance & Milestones", href: "/admin/finance", icon: "💰" },
  { label: "Team & Workload", href: "/admin/team", icon: "👥" },
  { label: "Founder Analytics", href: "/admin/analytics", icon: "📈" },
  { label: "Site Content CMS", href: "/admin/content", icon: "🎨" },
];

function useSafePathname() {
  try {
    return usePathname() || "";
  } catch {
    return "";
  }
}

export function AdminMobileNav({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = useSafePathname();

  // Close when pathname changes
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll
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
    <div className="lg:hidden">
      {/* Hamburger Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
        className="p-2 rounded-xl text-charcoal hover:text-maroon hover:bg-ivory-300/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 top-16 sm:top-18 z-50 flex flex-col bg-background/98 backdrop-blur-xl border-t border-border/80 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div>
                <p className="text-xs font-semibold text-charcoal">{userName}</p>
                <p className="text-[10px] text-charcoal/60 capitalize">
                  {userRole} · Founder Command Center
                </p>
              </div>
              <span className="text-[10px] bg-maroon/10 text-maroon font-bold px-2.5 py-0.5 rounded-full">
                Full Access
              </span>
            </div>

            <nav className="space-y-1">
              {ADMIN_NAV.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-maroon/10 text-maroon font-semibold"
                        : "text-charcoal hover:bg-ivory-300/60 hover:text-maroon"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-charcoal/40" />
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-border/80">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center rounded-xl border border-charcoal/20 bg-card py-3 text-xs font-semibold text-charcoal hover:text-maroon hover:bg-ivory-300/50 transition-colors"
                >
                  Sign Out of Founder Center →
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
