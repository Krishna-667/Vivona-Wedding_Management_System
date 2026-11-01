"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signUpAction } from "@/app/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const password = passwordRef.current?.value || "";

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("password", password);

    // Immediately clear password input from memory
    if (passwordRef.current) {
      passwordRef.current.value = "";
    }

    try {
      const res = await signUpAction(formData);
      if (!res.ok) {
        setErrorMsg(res.error);
        toast.error(res.error);
        setLoading(false);
        return;
      }

      toast.success("Account created successfully! Please sign in.");
      router.push("/login");
    } catch {
      setErrorMsg("An unexpected registration error occurred.");
      toast.error("Failed to register account.");
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    // Standard OAuth 2.0 flow: navigates to server auth route, which redirects to accounts.google.com
    window.location.href = "/api/auth/google?redirectTo=/client";
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-serif text-3xl font-semibold text-maroon">Create Client Account</h1>
        <p className="text-xs text-charcoal/70 font-sans">
          Register to review quotes, sign agreements, and view your live wedding timeline
        </p>
      </div>

      <div className="p-3 bg-gold-50/70 border border-gold-400/40 rounded-xl text-xs text-charcoal/80 space-y-1">
        <p className="font-medium text-maroon">Role Access Note</p>
        <p>Public sign-ups grant <strong>Client</strong> access. Planner and Admin accounts are assigned strictly by invitation.</p>
      </div>

      {/* Continue with Google (Plain GET Link) */}
      <div>
        <a
          href="/api/auth/google/start?returnTo=/client"
          onClick={() => {
            setGoogleLoading(true);
            setErrorMsg(null);
          }}
          className="w-full min-h-[48px] flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs sm:text-sm font-semibold text-charcoal hover:bg-ivory-200/50 hover:border-gold-400/50 transition-all shadow-xs active:scale-[0.99] cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
        </a>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/80" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-semibold text-charcoal/50">
            <span className="bg-background px-3">Or create password account</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium animate-in fade-in flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-destructive/70 hover:text-destructive p-1 -mr-1 -mt-1 rounded-md cursor-pointer"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">
            Couple / Contact Names
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="e.g. Priyamvada & Rohan"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-base sm:text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="e.g. couple@example.com"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-base sm:text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-base sm:text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">
            Password (Min 8 Characters)
          </label>
          <input
            ref={passwordRef}
            type="password"
            required
            minLength={8}
            placeholder="••••••••••••"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-base sm:text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
          />
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full min-h-[48px] rounded-xl bg-maroon px-4 py-3 text-sm font-semibold text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-border/60">
        <p className="text-xs text-charcoal/70">
          Already have an account?{" "}
          <Link href="/login" className="text-maroon font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
