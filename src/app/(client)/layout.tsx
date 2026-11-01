import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { requireRole } from "@/lib/auth/permissions";
import { signOutAction } from "@/app/actions/auth";
import { ClientBottomNav } from "@/components/navigation/client-bottom-nav";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["client", "admin", "employee"]);

  const clientNav = [
    { label: "Overview", href: "/client", icon: "🏰" },
    { label: "Requests", href: "/client/requests", icon: "📝" },
    { label: "Proposal", href: "/client/proposal", icon: "📋" },
    { label: "Agreement", href: "/client/agreement", icon: "✍️" },
    { label: "Messages", href: "/client/messages", icon: "💬" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 md:pb-0 overflow-x-hidden">
      {/* Client Portal Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container flex h-16 sm:h-18 items-center justify-between py-2 sm:py-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <Logo size="sm" href="/client" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gold-400/20 text-charcoal border border-gold-400/40">
              Client Portal
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-charcoal/80">
            {clientNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2.5 py-1.5 rounded-lg hover:text-maroon hover:bg-ivory-300/40 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Profile & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-charcoal truncate max-w-[140px] sm:max-w-none">
                {session.profile.full_name}
              </p>
              <p className="hidden sm:block text-[10px] text-charcoal/60 truncate max-w-[180px]">
                {session.user.email}
              </p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs text-charcoal/70 hover:text-maroon font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-ivory-300/50 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container py-6 sm:py-8 px-4 sm:px-6 pb-28 md:pb-8">{children}</main>

      {/* Mobile Sticky Bottom Nav Bar (390px Native App Experience) */}
      <ClientBottomNav />

      <footer className="hidden md:block border-t border-border/60 py-6 text-center text-xs text-charcoal/50">
        Vivona Wedding Planning · Client Concierge Desk
      </footer>
    </div>
  );
}
