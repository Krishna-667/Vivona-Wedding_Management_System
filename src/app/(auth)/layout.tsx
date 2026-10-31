import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-ivory-100/80 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header with Logo */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <Logo size="md" showTagline />
        <Link
          href="/"
          className="text-xs font-medium text-charcoal/70 hover:text-maroon transition-colors"
        >
          ← Return to site
        </Link>
      </div>

      {/* Auth Card */}
      <div className="flex-1 flex items-center justify-center my-6">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border/80 shadow-md p-8 sm:p-10 space-y-6">
          {children}
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="text-center text-xs text-charcoal/50 max-w-md mx-auto">
        <p>Vivona Luxury Wedding Operations · Role-Gated Access</p>
      </div>
    </div>
  );
}
