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

  // Navigation state: "select" -> "password"
  const [step, setStep] = React.useState<"select" | "password">("select");
  const [selectedAccount, setSelectedAccount] = React.useState<GoogleAccountLookupResult | null>(null);
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [customEmail, setCustomEmail] = React.useState("");
  const [showCustomInput, setShowCustomInput] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Pre-configured accounts across all three Vivona roles
  const accounts = [
    {
      name: "Devraj Rathore",
      email: "devraj@vivona.in",
      role: "Admin (Executive)",
      badge: "bg-maroon/10 text-maroon border-maroon/20",
      avatarBg: "bg-maroon text-ivory",
      initials: "DR",
    },
    {
      name: "Ananya Sharma",
      email: "ananya@vivona.in",
      role: "Employee (Lead Planner)",
      badge: "bg-sage-100 text-sage-900 border-sage-300",
      avatarBg: "bg-sage-700 text-ivory",
      initials: "AS",
    },
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
      badge: "bg-gold-50 text-gold-900 border-gold-300",
      avatarBg: "bg-gold-600 text-white",
      initials: "RP",
    },
  ];

  const handleChooseAccount = (email: string, name: string) => {
    setErrorMsg(null);
    setPassword("");
    setSelectedAccount({
      email,
      name,
      exists: true,
      role: "client",
    });
    setStep("password");
  };

  const handleCustomEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await lookupGoogleAccountAction(customEmail);
      if (!res.ok) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }
      setSelectedAccount(res.data);
      setFullName(res.data.name || "");
      setPassword("");
      setStep("password");
      setLoading(false);
    } catch {
      setErrorMsg("Failed to verify account identity.");
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !password) return;

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

      // Navigate to callback route with cryptographically signed code
      window.location.href = res.callbackUrl;
    } catch {
      setErrorMsg("Authentication failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F9] flex flex-col items-center justify-center p-4 antialiased font-sans">
      <div className="w-full max-w-[460px] bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-[#E0E2EC]">
        {/* Google Header Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <svg className="w-10 h-10 mb-4" viewBox="0 0 24 24">
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

          {step === "select" ? (
            <>
              <h1 className="text-[22px] font-medium text-[#1F1F1F]">Choose an account</h1>
              <p className="text-sm text-[#444746] mt-1">
                to sign in to <strong className="text-[#1F1F1F] font-semibold">Vivona</strong>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[22px] font-medium text-[#1F1F1F]">Welcome</h1>
              <button
                type="button"
                onClick={() => setStep("select")}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#747775]/40 text-xs font-medium text-[#1F1F1F] hover:bg-[#F2F6FC] transition-colors"
              >
                <span>{selectedAccount?.email}</span>
                <span className="text-[10px] text-[#0B57D0]">Change</span>
              </button>
            </>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Account Selection (Multi-Role) */}
        {step === "select" && (
          <div className="space-y-1 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#747775] mb-2 px-1">
              Select Account by Role
            </p>
            <div className="divide-y divide-[#E0E2EC]/70 border border-[#E0E2EC] rounded-2xl overflow-hidden">
              {accounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleChooseAccount(acc.email, acc.name)}
                  className="w-full text-left py-3 px-3.5 hover:bg-[#F2F6FC] transition-colors flex items-center gap-3.5 group cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 rounded-full ${acc.avatarBg} flex items-center justify-center text-xs font-semibold shrink-0 shadow-xs`}
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

              {/* Use Another Account */}
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full text-left py-3 px-3.5 hover:bg-[#F2F6FC] transition-colors flex items-center gap-3.5 group cursor-pointer bg-slate-50/50"
                >
                  <div className="w-9 h-9 rounded-full bg-[#E8EAED] text-[#444746] flex items-center justify-center text-xs shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#1F1F1F] group-hover:text-[#0B57D0]">
                    Use another Google account
                  </p>
                </button>
              ) : (
                <form onSubmit={handleCustomEmailNext} className="p-3.5 bg-slate-50/80 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#444746] mb-1">
                      Google Email Address
                    </label>
                    <input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      required
                      placeholder="e.g. name@gmail.com"
                      className="w-full rounded-lg border border-[#747775] bg-white px-3.5 py-2 text-sm text-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="px-3 py-1.5 text-xs text-[#444746] hover:bg-white rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 text-xs font-medium bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-md"
                    >
                      {loading ? "Checking..." : "Next"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Password Verification (Real Authentication) */}
        {step === "password" && selectedAccount && (
          <form onSubmit={handleVerifyPassword} className="space-y-4 mb-6">
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <span>🔒 Security Verification</span>
              </p>
              <p>
                Enter the password for <strong>{selectedAccount.email}</strong> to verify your identity and access your Vivona workspace.
              </p>
            </div>

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
                  className="w-full rounded-xl border border-[#747775] px-3.5 py-2.5 text-sm text-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] outline-none"
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
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#747775] px-3.5 py-2.5 text-sm text-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] outline-none"
                autoFocus
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPasswordToggle"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-[#747775] text-[#0B57D0] focus:ring-[#0B57D0]"
                />
                <label htmlFor="showPasswordToggle" className="text-xs text-[#444746] cursor-pointer">
                  Show password
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="text-xs font-medium text-[#0B57D0] hover:underline"
              >
                Back to accounts
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-full shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Verifying..." : "Sign In with Google"}
              </button>
            </div>
          </form>
        )}

        {/* Google Legal Footer */}
        <p className="text-[11px] text-[#444746] leading-relaxed border-t border-[#E0E2EC] pt-4">
          To continue, Google will share your name, email address, and profile picture with Vivona. Before using this app, review Vivona&apos;s privacy policy and terms of service.
        </p>
      </div>

      <div className="mt-4 flex gap-6 text-xs text-[#5E5E5E]">
        <span>English (United States)</span>
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
