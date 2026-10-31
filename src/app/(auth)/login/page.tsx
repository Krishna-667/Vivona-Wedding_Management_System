"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signInAction } from "@/app/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Check query params for demo shortcuts
  React.useEffect(() => {
    const demoParam = searchParams.get("demo");
    const demoPass = "ChangeMe-Demo#2026";
    if (demoParam === "admin") {
      setEmail("admin@vivona.demo");
      setPassword(demoPass);
    } else if (demoParam === "employee") {
      setEmail("planner1@vivona.demo");
      setPassword(demoPass);
    } else if (demoParam === "client") {
      setEmail("couple1@vivona.demo");
      setPassword(demoPass);
    }
  }, [searchParams]);

  const handleQuickFill = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword("ChangeMe-Demo#2026");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const res = await signInAction(formData);
      if (!res.ok) {
        setErrorMsg(res.error);
        toast.error(res.error);
        setLoading(false);
        return;
      }

      toast.success(`Welcome back. Redirecting to ${res.data.role} portal...`);
      router.push(res.data.redirectTo);
      router.refresh();
    } catch {
      setErrorMsg("An unexpected connection error occurred.");
      toast.error("Failed to authenticate.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-serif text-3xl font-semibold text-maroon">Sign In</h1>
        <p className="text-xs text-charcoal/70 font-sans">
          Access your wedding portal or team operations workspace
        </p>
      </div>

      {/* One-Click Demo Role Selectors */}
      <div className="space-y-2 p-3.5 bg-ivory-200/60 rounded-xl border border-gold-400/30">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-charcoal/70 block text-center">
          Quick Demo Credentials (One Click)
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill("admin@vivona.demo")}
            className="px-2 py-1.5 rounded-lg border border-maroon/30 bg-card text-xs font-medium text-maroon hover:bg-maroon hover:text-ivory transition-colors text-center"
          >
            Founder (Admin)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill("planner1@vivona.demo")}
            className="px-2 py-1.5 rounded-lg border border-sage-500/40 bg-card text-xs font-medium text-sage-600 hover:bg-sage-500 hover:text-white transition-colors text-center"
          >
            Lead Planner
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill("couple1@vivona.demo")}
            className="px-2 py-1.5 rounded-lg border border-gold-400/40 bg-card text-xs font-medium text-gold-600 hover:bg-gold-500 hover:text-white transition-colors text-center"
          >
            Client Couple
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="e.g. admin@vivona.demo"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-charcoal/80">
              Password
            </label>
            <span className="text-[11px] text-charcoal/50">Demo: ChangeMe-Demo#2026</span>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••••••"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-maroon px-4 py-3 text-sm font-medium text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="inline-block animate-pulse">Authenticating...</span>
          ) : (
            <span>Sign In to Vivona</span>
          )}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-border/60">
        <p className="text-xs text-charcoal/70">
          First time booking a wedding?{" "}
          <Link href="/register" className="text-maroon font-semibold hover:underline">
            Create Client Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-charcoal/60 animate-pulse">
          Loading Vivona secure sign-in...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
