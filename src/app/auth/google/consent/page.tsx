"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { authorizeGoogleAccountAction } from "@/app/actions/google-consent";

function GoogleConsentForm() {
  const searchParams = useSearchParams();
  const state = searchParams.get("state") || "";
  const redirectUri = searchParams.get("redirect_uri") || "/api/auth/google/callback";

  const [loadingEmail, setLoadingEmail] = React.useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customEmail, setCustomEmail] = React.useState("");
  const [customName, setCustomName] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSelectAccount = async (email: string, name: string) => {
    setLoadingEmail(email);
    setErrorMsg(null);
    try {
      const res = await authorizeGoogleAccountAction({
        email,
        name,
        state,
        redirectUri,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Failed to authorize Google account.");
        setLoadingEmail(null);
        return;
      }

      // Perform full browser navigation to OAuth callback handler
      window.location.href = res.callbackUrl;
    } catch {
      setErrorMsg("Failed to authorize Google account.");
      setLoadingEmail(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    await handleSelectAccount(customEmail, customName || customEmail.split("@")[0]);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F9] flex flex-col items-center justify-center p-4 antialiased font-sans">
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-[#E0E2EC]">
        {/* Google Header */}
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
          <h1 className="text-[22px] font-medium text-[#1F1F1F]">Choose an account</h1>
          <p className="text-sm text-[#444746] mt-1">
            to continue to <strong className="text-[#1F1F1F] font-semibold">Vivona</strong>
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Account Selector List */}
        <div className="space-y-1 mb-6 divide-y divide-[#E0E2EC]/70">
          {/* Account 1: Prithith */}
          <button
            type="button"
            onClick={() => handleSelectAccount("prithitha24it@psnacet.edu.in", "Prithith")}
            disabled={loadingEmail !== null}
            className="w-full text-left py-3.5 px-3 rounded-xl hover:bg-[#F2F6FC] transition-colors flex items-center gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#1A73E8] text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-xs">
              P
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1F1F1F] group-hover:text-[#0B57D0] truncate">
                Prithith
              </p>
              <p className="text-xs text-[#5E5E5E] truncate">prithitha24it@psnacet.edu.in</p>
            </div>
            {loadingEmail === "prithitha24it@psnacet.edu.in" && (
              <span className="w-4 h-4 border-2 border-[#1A73E8] border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </button>

          {/* Account 2: Priyamvada & Rohan */}
          <button
            type="button"
            onClick={() => handleSelectAccount("couple@vivona.demo", "Priyamvada & Rohan")}
            disabled={loadingEmail !== null}
            className="w-full text-left py-3.5 px-3 rounded-xl hover:bg-[#F2F6FC] transition-colors flex items-center gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#E37400] text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-xs">
              P&R
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1F1F1F] group-hover:text-[#0B57D0] truncate">
                Priyamvada &amp; Rohan
              </p>
              <p className="text-xs text-[#5E5E5E] truncate">couple@vivona.demo</p>
            </div>
            {loadingEmail === "couple@vivona.demo" && (
              <span className="w-4 h-4 border-2 border-[#1A73E8] border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </button>

          {/* Option: Use another account */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              disabled={loadingEmail !== null}
              className="w-full text-left py-3.5 px-3 rounded-xl hover:bg-[#F2F6FC] transition-colors flex items-center gap-3.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#E8EAED] text-[#444746] flex items-center justify-center text-sm shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#1F1F1F] group-hover:text-[#0B57D0]">
                Use another Google account
              </p>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="pt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#444746] mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  required
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full rounded-lg border border-[#747775] px-3.5 py-2.5 text-sm text-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#444746] mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full rounded-lg border border-[#747775] px-3.5 py-2.5 text-sm text-[#1F1F1F] focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="px-4 py-2 text-xs font-medium text-[#444746] hover:bg-[#F2F6FC] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingEmail !== null}
                  className="px-5 py-2 text-xs font-medium bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-lg flex items-center gap-1.5"
                >
                  {loadingEmail ? "Signing in..." : "Continue"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Google Legal Footer */}
        <p className="text-[11px] text-[#444746] leading-relaxed border-t border-[#E0E2EC] pt-4">
          To continue, Google will share your name, email address, language preference, and profile picture with Vivona. Before using this app, you can review Vivona&apos;s privacy policy and terms of service.
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
