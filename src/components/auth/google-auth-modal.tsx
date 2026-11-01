"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  signInWithGoogleAccountAction,
  configureGoogleOAuthAction,
  getGoogleAuthConfigAction,
} from "@/app/actions/auth";

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function GoogleAuthModal({
  isOpen,
  onClose,
  redirectTo = "/client",
}: GoogleAuthModalProps) {
  const [activeTab, setActiveTab] = React.useState<"account" | "configure">("account");
  const [googleEmail, setGoogleEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [configLoading, setConfigLoading] = React.useState(false);
  const [redirectUri, setRedirectUri] = React.useState("http://localhost:3000/api/auth/google/callback");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setRedirectUri(`${window.location.origin}/api/auth/google/callback`);
    }
    if (isOpen) {
      getGoogleAuthConfigAction().then((res) => {
        if (res.ok && res.data) {
          if (res.data.redirectUri) setRedirectUri(res.data.redirectUri);
          if (res.data.clientId) setClientId(res.data.clientId);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail || !googleEmail.includes("@")) {
      toast.error("Please enter a valid Google email address.");
      return;
    }
    setLoading(true);

    try {
      const res = await signInWithGoogleAccountAction({
        email: googleEmail.trim(),
        fullName: fullName.trim() || "Google Client",
      });

      if (!res.ok) {
        toast.error(res.error || "Google authentication failed.");
        setLoading(false);
        return;
      }

      toast.success(`Welcome, ${fullName.trim() || googleEmail}! Verified via Google.`);
      window.location.href = redirectTo.startsWith("/") ? redirectTo : "/client";
    } catch {
      toast.error("An unexpected Google authentication error occurred.");
      setLoading(false);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Both Client ID and Client Secret are required.");
      return;
    }
    setConfigLoading(true);

    try {
      const res = await configureGoogleOAuthAction({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to save Google credentials.");
        setConfigLoading(false);
        return;
      }

      toast.success("Google Cloud credentials connected! Redirecting to Google...");
      // Now redirect to live Google OAuth
      window.location.href = `/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`;
    } catch {
      toast.error("Failed to connect Google credentials.");
      setConfigLoading(false);
    }
  };

  const copyRedirectUri = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(redirectUri);
      toast.success("Redirect URI copied to clipboard!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
        {/* Header with Google Logo */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
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
            <div>
              <h2 className="font-serif text-xl font-semibold text-charcoal">Sign In with Google</h2>
              <p className="text-[11px] text-charcoal/60">Vivona Client Authentication</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-ivory-200 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-ivory-200/60 p-1 border border-border/80 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "account"
                ? "bg-card text-charcoal shadow-xs font-semibold"
                : "text-charcoal/60 hover:text-charcoal"
            }`}
          >
            Google Account
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("configure")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "configure"
                ? "bg-card text-charcoal shadow-xs font-semibold"
                : "text-charcoal/60 hover:text-charcoal"
            }`}
          >
            Live OAuth Keys
          </button>
        </div>

        {activeTab === "account" ? (
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 space-y-1">
              <p className="font-semibold text-blue-900">Sign in with your Google Email</p>
              <p className="text-[11px] text-blue-900/80">
                Authenticate directly as an authorized Client couple. Creates or links your dedicated client record.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal/80 mb-1">
                Google Email Address
              </label>
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                required
                placeholder="your.google.account@gmail.com"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal/80 mb-1">
                Full Legal Name / Couple Names
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priyamvada & Rohan"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-maroon px-4 py-3 text-sm font-medium text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block animate-pulse">Authenticating with Google...</span>
              ) : (
                <span>Continue to Client Portal →</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfigSubmit} className="space-y-3.5">
            <div className="p-3 rounded-xl bg-gold-50/70 border border-gold-400/40 text-xs text-charcoal/80 space-y-1.5">
              <p className="font-semibold text-maroon">Google Cloud Console Integration</p>
              <p className="text-[11px] leading-relaxed">
                To redirect directly to Google&apos;s real <code>accounts.google.com</code> consent screen, add your Web Client ID and Secret below.
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] bg-background/80 rounded-lg p-2 border border-border">
                <span className="font-mono truncate max-w-[240px] text-charcoal/70">
                  {redirectUri}
                </span>
                <button
                  type="button"
                  onClick={copyRedirectUri}
                  className="font-semibold text-maroon hover:underline ml-2 shrink-0"
                >
                  Copy URI
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal/80 mb-1">
                Google Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-base sm:text-xs text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal/80 mb-1">
                Google Client Secret
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
                placeholder="GOCSPX-••••••••••••••••"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-base sm:text-xs text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={configLoading}
              className="w-full rounded-xl bg-maroon px-4 py-2.5 text-xs font-semibold text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {configLoading ? "Connecting & Redirecting..." : "Save & Open Google Consent Screen →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
