"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  lookupGoogleAccountAction,
  verifyAndAuthorizeGoogleAction,
  type GoogleAccountLookupResult,
} from "@/app/actions/google-consent";

function GoogleConsentForm() {
  const searchParams = useSearchParams();
  const state = searchParams.get("state") || "";
  const redirectUri = searchParams.get("redirect_uri") || "/api/auth/google/callback";

  // Step flow: "select" -> "custom_email" -> "password"
  const [step, setStep] = React.useState<"select" | "custom_email" | "password">("select");
  const [selectedAccount, setSelectedAccount] = React.useState<GoogleAccountLookupResult | null>(null);
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [customEmail, setCustomEmail] = React.useState("");
  const [forgotPasswordTip, setForgotPasswordTip] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Pre-configured accounts across all three Vivona roles
  const accounts = [
    {
      name: "Prithith",
      email: "prithitha24it@psnacet.edu.in",
      role: "Client (Couple)",
      badge: "bg-blue-50 text-blue-800 border-blue-200",
      avatarBg: "bg-[#1A73E8] text-white",
      initials: "P",
    },
    {
      name: "Rohan & Priyamvada",
      email: "rohan.priyamvada@gmail.com",
      role: "Client (Couple)",
      badge: "bg-amber-50 text-amber-900 border-amber-300",
      avatarBg: "bg-amber-600 text-white",
      initials: "RP",
    },
    {
      name: "Devraj Rathore",
      email: "devraj@vivona.in",
      role: "Admin (Executive)",
      badge: "bg-rose-50 text-rose-900 border-rose-300",
      avatarBg: "bg-[#6B1D2A] text-[#FBF7F0]",
      initials: "DR",
    },
    {
      name: "Ananya Sharma",
      email: "ananya@vivona.in",
      role: "Employee (Lead Planner)",
      badge: "bg-emerald-50 text-emerald-900 border-emerald-300",
      avatarBg: "bg-emerald-700 text-white",
      initials: "AS",
    },
  ];

  const handleChooseAccount = (email: string, name: string) => {
    setErrorMsg(null);
    setPassword("");
    setForgotPasswordTip(false);
    setSelectedAccount({
      email,
      name,
      exists: true,
      role: "client",
    });
    setFullName(name);
    setStep("password");
  };

  const handleCustomEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await lookupGoogleAccountAction(customEmail.trim());
      if (!res.ok) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }
      setSelectedAccount(res.data);
      setFullName(res.data.name || "");
      setPassword("");
      setForgotPasswordTip(false);
      setStep("password");
      setLoading(false);
    } catch {
      setErrorMsg("Failed to verify account identity. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !password) return;

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await verifyAndAuthorizeGoogleAction({
        email: selectedAccount.email,
        password,
        name: fullName || selectedAccount.name,
        state,
        redirectUri,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Wrong password. Try again.");
        setLoading(false);
        return;
      }

      // Navigate to callback route with cryptographically signed OAuth code
      window.location.href = res.callbackUrl;
    } catch {
      setErrorMsg("Authentication failed. Please verify your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F9] flex flex-col items-center justify-center p-3 sm:p-6 antialiased font-sans">
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-[#E0E2EC] transition-all">
        {/* Google Header Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24" aria-hidden="true">
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

          {step === "select" && (
            <>
              <h1 className="text-[22px] font-medium text-[#1F1F1F]">Choose an account</h1>
              <p className="text-xs text-[#444746] mt-1">
                to continue to <strong className="text-[#1F1F1F] font-semibold">Vivona</strong>
              </p>
            </>
          )}

          {step === "custom_email" && (
            <>
              <h1 className="text-[22px] font-medium text-[#1F1F1F]">Sign in with Google</h1>
              <p className="text-xs text-[#444746] mt-1">
                to continue to <strong className="text-[#1F1F1F] font-semibold">Vivona</strong>
              </p>
            </>
          )}

          {step === "password" && (
            <>
              <h1 className="text-[22px] font-medium text-[#1F1F1F]">
                {selectedAccount?.name ? `Welcome, ${selectedAccount.name}` : "Welcome"}
              </h1>
              <button
                type="button"
                onClick={() => setStep("select")}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#747775]/40 text-xs font-medium text-[#1F1F1F] hover:bg-[#F2F6FC] transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="max-w-[200px] truncate">{selectedAccount?.email}</span>
                <span className="text-[10px] text-[#0B57D0] font-semibold">Change</span>
              </button>
            </>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start justify-between gap-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* STEP 1: Account Selection */}
        {step === "select" && (
          <div className="space-y-2 mb-6">
            <div className="divide-y divide-[#E0E2EC]/80 border border-[#E0E2EC] rounded-2xl overflow-hidden shadow-2xs">
              {accounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleChooseAccount(acc.email, acc.name)}
                  className="w-full text-left py-3 px-3.5 hover:bg-[#F2F6FC] transition-colors flex items-center gap-3 group cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 rounded-full ${acc.avatarBg} flex items-center justify-center text-xs font-semibold shrink-0 shadow-2xs`}
                  >
                    {acc.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#1F1F1F] group-hover:text-[#0B57D0] truncate">
                        {acc.name}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${acc.badge}`}>
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-xs text-[#5E5E5E] truncate">{acc.email}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-[#747775] group-hover:text-[#0B57D0] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}

              {/* Use Another Account Button */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setCustomEmail("");
                  setStep("custom_email");
                }}
                className="w-full text-left py-3 px-3.5 hover:bg-[#F2F6FC] transition-colors flex items-center gap-3 group cursor-pointer bg-slate-50/50"
              >
                <div className="w-9 h-9 rounded-full bg-[#E8EAED] text-[#444746] flex items-center justify-center text-xs shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1F1F1F] group-hover:text-[#0B57D0]">
                    Use another Google account
                  </p>
                  <p className="text-[11px] text-[#5E5E5E]">Add any new or existing Gmail account</p>
                </div>
                <svg
                  className="w-4 h-4 text-[#747775] group-hover:text-[#0B57D0] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1b: Enter Custom Google Email */}
        {step === "custom_email" && (
          <form onSubmit={handleCustomEmailNext} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-[#444746] mb-1.5">
                Email or phone
              </label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => {
                  setCustomEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                required
                placeholder="name@gmail.com"
                className="w-full rounded-xl border border-[#747775] bg-white px-3.5 py-2.5 text-sm text-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] outline-none transition-colors"
                autoFocus
              />
              <p className="text-[11px] text-[#5E5E5E] mt-1.5">
                Enter your Gmail or Google-managed workplace email address.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep("select");
                }}
                className="text-xs font-medium text-[#0B57D0] hover:underline cursor-pointer"
              >
                Back to accounts
              </button>

              <button
                type="submit"
                disabled={loading || !customEmail.trim()}
                className="px-6 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-full shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Checking..." : "Next"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Password Verification */}
        {step === "password" && selectedAccount && (
          <form onSubmit={handleVerifyPassword} className="space-y-4 mb-6">
            <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-950 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <span>🔒 Google Account Verification</span>
              </p>
              <p className="text-[11px] text-blue-900 leading-relaxed">
                To continue, enter your Google password for <strong>{selectedAccount.email}</strong>.
              </p>
            </div>

            {/* If new account being added, prompt for contact name */}
            {!selectedAccount.exists && (
              <div>
                <label className="block text-xs font-medium text-[#444746] mb-1">
                  Full Name / Contact Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-[#747775] px-3.5 py-2.5 text-sm text-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#444746]">
                  Enter your password
                </label>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#747775] px-3.5 py-2.5 text-sm text-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] outline-none transition-colors"
                autoFocus
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPasswordToggle"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded border-[#747775] text-[#0B57D0] focus:ring-[#0B57D0]"
                  />
                  <label htmlFor="showPasswordToggle" className="text-xs text-[#444746] cursor-pointer select-none">
                    Show password
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setForgotPasswordTip(!forgotPasswordTip)}
                  className="text-xs text-[#0B57D0] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {forgotPasswordTip && (
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-[#444746] animate-in fade-in">
                  Enter your personal password (minimum 6 characters) to verify ownership and sign in to Vivona.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="text-xs font-medium text-[#0B57D0] hover:underline cursor-pointer"
              >
                Back to accounts
              </button>

              <button
                type="submit"
                disabled={loading || !password}
                className="px-6 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-full shadow-2xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Verifying..." : "Sign In with Google"}
              </button>
            </div>
          </form>
        )}

        {/* Google Legal Footer */}
        <p className="text-[11px] text-[#444746] leading-relaxed border-t border-[#E0E2EC] pt-4">
          To continue, Google will share your name, email address, and profile with Vivona. Before using this app, review Vivona&apos;s privacy policy and terms of service.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#5E5E5E]">
        <span>English (United States)</span>
        <span className="text-[#E0E2EC]">|</span>
        <a href="#" className="hover:underline">Help</a>
        <a href="#" className="hover:underline">Privacy</a>
        <a href="#" className="hover:underline">Terms</a>
      </div>
    </div>
  );
}

export default function GoogleConsentPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F4F9] flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-[#1A73E8] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleConsentForm />
    </React.Suspense>
  );
}
