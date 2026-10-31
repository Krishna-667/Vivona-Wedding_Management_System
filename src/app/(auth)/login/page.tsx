"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  getAuthChallengeAction,
  signInSealedAction,
  signInWithGoogleAction,
} from "@/app/actions/auth";
import { sealCredentialsInBrowser } from "@/lib/auth/client-seal";

function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Fetch one-time challenge nonce & RSA public key from server
      const challengeRes = await getAuthChallengeAction();
      if (!challengeRes.ok) {
        throw new Error(challengeRes.error || "Unable to acquire security challenge.");
      }

      // 2. Encrypt credentials in browser using WebCrypto (RSA-OAEP-256 + AES-256-GCM)
      // Plaintext password NEVER travels over the network or appears in DevTools Network tab
      const sealed = await sealCredentialsInBrowser(
        { email: email.trim(), password },
        challengeRes.data
      );

      // 3. Submit sealed payload
      const res = await signInSealedAction(sealed);
      if (!res.ok) {
        setErrorMsg(res.error || "Authentication failed.");
        toast.error(res.error || "Authentication failed.");
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogleAction();
      if (!res.ok) {
        toast.error(res.error || "Google Sign-In failed.");
        setGoogleLoading(false);
        return;
      }
      toast.success("Signed in with Google! Redirecting...");
      window.location.href = res.data.redirectTo;
    } catch {
      toast.error("Failed to authenticate with Google.");
      setGoogleLoading(false);
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

      {/* Google Sign-In Option */}
      <div>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-charcoal hover:bg-ivory-200/50 hover:border-gold-400/50 transition-all shadow-xs disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
        </button>

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
        <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      {/* Encrypted Password Form */}
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
            autoComplete="username"
            placeholder="e.g. admin@vivona.demo"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-charcoal/80">
              Password
            </label>
            <span className="text-[10px] text-sage-700 font-mono">
              🛡️ RSA-OAEP Sealed
            </span>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full rounded-xl bg-maroon px-4 py-3 text-sm font-medium text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="inline-block animate-pulse">Sealing & Authenticating...</span>
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
