import * as React from "react";
import { BookingWizard } from "@/components/features/booking/booking-wizard";
import { GoldKnotIcon } from "@/components/ui/logo";

export const metadata = {
  title: "Book Your Royal Wedding · Vivona Rajasthan",
  description:
    "Design your tailored wedding blueprint for Jaipur or Udaipur. Choose packages or build a custom service architecture with instant indicative cost estimation.",
};

export default function BookPage() {
  return (
    <div className="container py-12 md:py-20 space-y-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-50/60 px-4 py-1 text-xs font-semibold text-charcoal">
          <GoldKnotIcon className="w-3.5 h-3.5 text-gold-500" />
          <span>Interactive Wedding Architecture Wizard</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-6xl font-semibold text-maroon">
          Craft Your Celebration
        </h1>
        <p className="text-xs sm:text-sm text-charcoal/70 leading-relaxed font-sans">
          Four simple steps to calculate indicative costs, lock preferred dates, and generate your CRM enquiry record with Vivona.
        </p>
      </div>

      <React.Suspense
        fallback={
          <div className="p-12 text-center text-xs text-charcoal/60 animate-pulse">
            Loading Vivona interactive booking engine...
          </div>
        }
      >
        <BookingWizard />
      </React.Suspense>
    </div>
  );
}
