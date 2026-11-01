import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getSessionProfile } from "@/lib/auth/session";
import { signOutAction } from "@/app/actions/auth";
import { EmployeeBottomNav } from "@/components/navigation/employee-bottom-nav";
import { ChangePasswordDialog } from "@/components/features/auth/change-password-dialog";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();

  if (!session || (session.profile.role !== "employee" && session.profile.role !== "admin")) {
    redirect("/login");
  }

  const navItems = [
    { label: "My Weddings", href: "/employee", icon: "🏰" },
    { label: "Task Board", href: "/employee/tasks", icon: "📋" },
    { label: "Live Operations", href: "/employee/live", icon: "⚡" },
    { label: "Timesheets", href: "/employee/timesheets", icon: "⏱️" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground pb-20 md:pb-0 overflow-x-hidden">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex w-64 flex-col justify-between border-r border-border/80 bg-card p-6">
        <div className="space-y-8">
          <div className="space-y-2">
            <Logo size="sm" href="/employee" />
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-600">
                Staff Operations Desk
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-charcoal/80 hover:text-maroon hover:bg-ivory-300/50 transition-colors"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Card & Sign Out */}
        <div className="pt-6 border-t border-border/80 space-y-3">
          <div>
            <p className="text-xs font-semibold text-charcoal">{session.profile.full_name}</p>
            <p className="text-[11px] text-charcoal/60 capitalize">{session.profile.role} (On-Ground Lead)</p>
          </div>
          <div className="pt-1">
            <ChangePasswordDialog triggerText="Change Password" />
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
        <header className="md:hidden flex h-16 items-center justify-between border-b border-border/80 bg-background/95 px-4 sticky top-0 z-30">
          <Logo size="sm" href="/employee" />
          <span className="text-xs font-semibold text-sage-600 px-2 py-0.5 rounded-md bg-sage-50 border border-sage-200">
            Planner
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full pb-28 md:pb-8">{children}</main>
      </div>

      {/* Mobile Sticky Bottom Nav (390px Mobile Ergonomics) */}
      <EmployeeBottomNav />
    </div>
  );
}
