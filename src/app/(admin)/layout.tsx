import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getSessionProfile } from "@/lib/auth/session";
import { signOutAction } from "@/app/actions/auth";
import { AdminMobileNav } from "@/components/navigation/admin-mobile-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();

  if (!session || session.profile.role !== "admin") {
    redirect("/login");
  }

  const adminNav = [
    { label: "Executive Dashboard", href: "/admin", icon: "🏛️" },
    { label: "CRM & Enquiries", href: "/admin/enquiries", icon: "📬" },
    { label: "Weddings (Active)", href: "/admin/weddings", icon: "👑" },
    { label: "Vendors & RFQ Matrix", href: "/admin/vendors", icon: "⚖️" },
    { label: "Finance & Milestones", href: "/admin/finance", icon: "💰" },
    { label: "Team & Workload", href: "/admin/team", icon: "👥" },
    { label: "Founder Analytics", href: "/admin/analytics", icon: "📈" },
    { label: "Site Content CMS", href: "/admin/content", icon: "🎨" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Admin Left Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-border/80 bg-card p-6 shrink-0">
        <div className="space-y-6">
          <div className="space-y-2">
            <Logo size="md" href="/admin" />
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-maroon" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-maroon">
                Founder Command Center
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-charcoal/80 hover:text-maroon hover:bg-ivory-300/50 transition-colors"
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Founder Profile & Sign Out */}
        <div className="pt-6 border-t border-border/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-charcoal">{session.profile.full_name}</p>
              <p className="text-[10px] text-charcoal/50">Founder & CEO · Admin</p>
            </div>
            <span className="text-[10px] bg-maroon/10 text-maroon font-bold px-2 py-0.5 rounded-full">
              Full Access
            </span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full text-left text-xs text-charcoal/70 hover:text-maroon font-medium py-1.5 transition-colors"
            >
              Sign Out →
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="flex h-16 sm:h-18 items-center justify-between border-b border-border/80 bg-background/95 px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo size="sm" href="/admin" />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-charcoal/60">Season 2026 Active:</span>
            <span className="text-xs font-semibold text-maroon">Jaipur & Udaipur · 25 Planned Weddings</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/enquiries"
              className="hidden sm:inline-flex rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-ivory-300/50 transition-colors"
            >
              Pipeline Overview
            </Link>
            <Link
              href="/admin/weddings/new"
              className="rounded-xl bg-maroon px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
            >
              + Create Wedding
            </Link>
            {/* Mobile Navigation Drawer */}
            <AdminMobileNav
              userName={session.profile.full_name}
              userRole={session.profile.role}
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
