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
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("password", password);

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

      {errorMsg && (
        <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
          {errorMsg}
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
            placeholder="e.g. Rohan & Priyamvada"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
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
            placeholder="e.g. couple@domain.com"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">
            Mobile Number (WhatsApp Preferred)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98290 00000"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">
            Password (at least 6 characters)
          </label>
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
          {loading ? "Creating Account..." : "Register Client Account"}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-border/60">
        <p className="text-xs text-charcoal/70">
          Already have an account?{" "}
          <Link href="/login" className="text-maroon font-semibold hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
