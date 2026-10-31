"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GoldKnotIcon } from "@/components/ui/logo";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "ENQ-2026-9482";
  const email = searchParams.get("email") || "couple@vivona.demo";
  const city = searchParams.get("city") || "Jaipur";

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-gold-400/50 bg-card p-8 sm:p-12 text-center space-y-6 shadow-sm">
      <div className="w-16 h-16 rounded-full bg-gold-100 text-gold-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
        <GoldKnotIcon className="w-8 h-8 text-gold-600" />
      </div>

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-widest text-maroon font-bold">
          Enquiry Registered
        </span>
        <h1 className="font-serif text-3xl font-semibold text-charcoal">
          Wedding Blueprint Submitted
        </h1>
        <p className="text-xs text-charcoal/70 leading-relaxed font-sans">
          Your wedding enquiry for {city} has been logged in our executive CRM and assigned to our lead planning desk.
        </p>
      </div>

      {/* Reference Card */}
      <div className="p-4 rounded-xl border border-border bg-ivory-200/80 space-y-1">
        <span className="text-[11px] font-semibold text-charcoal/60 uppercase tracking-wider">
          Enquiry Reference Code
        </span>
        <p className="font-mono text-2xl font-bold text-maroon tracking-wider">{code}</p>
        <p className="text-[11px] text-charcoal/50">Linked Client Account: {email}</p>
      </div>

      {/* 3 Immediate Next Steps */}
      <div className="text-left space-y-3 pt-2 border-t border-border/80">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal">
          Immediate Next Steps:
        </h3>
        <ol className="space-y-2 text-xs text-charcoal/80 list-decimal list-inside leading-relaxed">
          <li>Our Lead Planner will review date availability at your preferred heritage venues.</li>
          <li>We will schedule your initial digital consultation to refine themes and vendor riders.</li>
          <li>Your service agreement will be dispatched to your Client Portal for digital signing.</li>
        </ol>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={`/login?demo=client&email=${encodeURIComponent(email)}`}
          className="w-full sm:w-auto rounded-xl bg-maroon px-6 py-3 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
        >
          Enter Client Portal →
        </Link>
        <Link
          href="/"
          className="w-full sm:w-auto rounded-xl border border-border px-6 py-3 text-xs font-semibold text-charcoal hover:bg-ivory-200 transition-colors"
        >
          Return to Overview
        </Link>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <div className="container py-12 md:py-20">
      <React.Suspense
        fallback={
          <div className="p-12 text-center text-xs text-charcoal/60 animate-pulse">
            Loading confirmation receipt...
          </div>
        }
      >
        <ConfirmationContent />
      </React.Suspense>
    </div>
  );
}
