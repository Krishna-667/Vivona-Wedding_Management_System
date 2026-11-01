"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  getAuthChallengeAction,
  signInSealedAction,
  signInAction,
} from "@/app/actions/auth";
import { sealCredentialsInBrowser } from "@/lib/auth/client-seal";

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled or access was denied.",
  state_mismatch: "Authentication session expired or security verification failed. Please try again.",
  email_unverified: "Your Google email address is not verified. Please verify your email with Google first.",
  account_disabled: "This account has been deactivated. Please contact support.",
  identity_conflict: "This email is already associated with a different Google account.",
  provider_error: "Google authentication service encountered a temporary error. Please try again.",
  unauthorized: "You do not have permission to access that area. Please sign in.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const redirectTo = searchParams.get("redirectTo") || "/client";
  const [email, setEmail] = React.useState("");
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(
    urlError ? (ERROR_MESSAGES[urlError] || urlError) : null
  );

  React.useEffect(() => {
    if (urlError) {
      setErrorMsg(ERROR_MESSAGES[urlError] || urlError);
    }
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const password = passwordRef.current?.value || "";

    try {
      let res;
      const cleanEmail = email.trim();

      // Check if WebCrypto subtle is available (HTTPS or localhost)
      if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
        // 1. Fetch one-time challenge nonce & RSA public key from server
        const challengeRes = await getAuthChallengeAction();
        if (!challengeRes.ok) {
          throw new Error(challengeRes.error || "Unable to acquire security challenge.");
        }

        // 2. Encrypt credentials in browser using WebCrypto (RSA-OAEP-256 + AES-256-GCM)
        // Plaintext password NEVER travels over the network or appears in DevTools Network tab
        const sealed = await sealCredentialsInBrowser(
          { email: cleanEmail, password },
          challengeRes.data
        );

        // Wipe plaintext password from DOM element immediately after encryption
        if (passwordRef.current) {
          passwordRef.current.value = "";
        }

        // 3. Submit sealed payload
        res = await signInSealedAction(sealed);
      } else {
        // Graceful fallback for non-secure HTTP contexts (e.g. mobile LAN IP testing)
        const formData = new FormData();
        formData.append("email", cleanEmail);
        formData.append("password", password);
        if (passwordRef.current) {
          passwordRef.current.value = "";
        }
        res = await signInAction(formData);
      }

      if (!res.ok) {
        const errorText = res.error || "Invalid email or password.";
        setErrorMsg(errorText);
        toast.error(errorText);
        setLoading(false);
        return;
      }

      toast.success(`Welcome back! Redirecting to ${res.data.role} portal...`);
      window.location.href = res.data.redirectTo;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected connection error occurred.";
      setErrorMsg(message);
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-sage-50 text-sage-800 border border-sage-300">
          <span className="w-2 h-2 rounded-full bg-sage-600 animate-pulse" />
          <span>🔒 256-Bit Sealed Encrypted Login</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-maroon">Sign In</h1>
        <p className="text-xs text-charcoal/70 font-sans">
          Access your wedding portal or team operations workspace
        </p>
      </div>

      {/* Google Sign-In Option (Plain GET link, full width at 390px, standard Google mark) */}
      <div>
        <a
          href={`/api/auth/google/start?returnTo=${encodeURIComponent(redirectTo)}`}
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
            <span className="bg-background px-3">Or sign in with password</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium animate-in fade-in flex items-start justify-between gap-2">
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

      {/* Form Credentials */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            required
            autoComplete="email"
            placeholder="e.g. devraj@vivona.in"
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-charcoal focus:border-maroon focus:ring-1 focus:ring-maroon outline-none transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-charcoal">
              Password
            </label>
            <span className="text-[10px] text-charcoal/50 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              RSA-OAEP Sealed
            </span>
          </div>
          <input
            ref={passwordRef}
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-charcoal focus:border-maroon focus:ring-1 focus:ring-maroon outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full rounded-xl bg-maroon py-3 text-xs sm:text-sm font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Decrypting Security Challenge & Verifying..." : "Sign In to Vivona"}
        </button>
      </form>

      <div className="text-center text-xs text-charcoal/60 pt-2 border-t border-border/80">
        New couple or client?{" "}
        <Link href="/register" className="font-semibold text-maroon hover:underline">
          Register client account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-charcoal/50">
          Loading sign in portal...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
