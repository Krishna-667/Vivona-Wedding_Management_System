import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getSessionProfile } from "@/lib/auth/session";
import { signOutAction } from "@/app/actions/auth";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login?redirectTo=/client");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Client Portal Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container flex h-18 items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <Logo size="sm" href="/client" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gold-400/20 text-charcoal border border-gold-400/40">
              Client Portal
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-6 text-xs sm:text-sm font-medium text-charcoal/80">
            <Link
              href="/client"
              className="px-2.5 py-1.5 rounded-lg hover:text-maroon hover:bg-ivory-300/40 transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/client/requests"
              className="px-2.5 py-1.5 rounded-lg hover:text-maroon hover:bg-ivory-300/40 transition-colors"
            >
              My Requests
            </Link>
            <Link
              href="/client/agreement"
              className="px-2.5 py-1.5 rounded-lg hover:text-maroon hover:bg-ivory-300/40 transition-colors"
            >
              Agreement & E-Sign
            </Link>
            <Link
              href="/client/messages"
              className="px-2.5 py-1.5 rounded-lg hover:text-maroon hover:bg-ivory-300/40 transition-colors"
            >
              Messages
            </Link>
          </nav>

          {/* Profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold text-charcoal">{session.profile.full_name}</p>
              <p className="text-[10px] text-charcoal/60">{session.user.email}</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs text-charcoal/70 hover:text-maroon font-medium px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-ivory-300/50 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container py-8">{children}</main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-charcoal/50">
        Vivona Wedding Planning · Client Concierge Desk
      </footer>
    </div>
  );
}
