import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";

export default async function ClientDashboardPage() {
  const session = await getSessionProfile();

  const timelineSteps = [
    { label: "Enquiry", status: "completed" },
    { label: "Consultation", status: "completed" },
    { label: "Agreement", status: "current" },
    { label: "Proposal", status: "pending" },
    { label: "Booked", status: "pending" },
    { label: "Planning", status: "pending" },
    { label: "Live Day", status: "pending" },
    { label: "Settled", status: "pending" },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-gold-400/30 bg-gradient-to-r from-ivory-200 to-ivory-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-maroon font-semibold">
            Couple Dashboard
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Namaste, {session?.profile.full_name || "Esteemed Client"}
          </h1>
          <p className="text-sm text-charcoal/70 mt-1">
            Welcome to your dedicated Vivona portal. Track your luxury wedding lifecycle in real time.
          </p>
        </div>
        <Link
          href="/client/requests"
          className="rounded-xl bg-maroon px-5 py-2.5 text-xs font-medium text-ivory hover:bg-maroon-600 transition-colors shadow-sm shrink-0"
        >
          View Requests & Plan
        </Link>
      </div>

      {/* Lifecycle Status Timeline (Orvane Stepper Ideology) */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-4 flex items-center justify-between">
          <span>Wedding Lifecycle Timeline</span>
          <span className="text-xs font-normal text-maroon font-medium">Stage 3 of 8: Agreement Pending</span>
        </h2>

        <div className="relative">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 relative z-10">
            {timelineSteps.map((step, idx) => {
              const isCompleted = step.status === "completed";
              const isCurrent = step.status === "current";

              return (
                <div key={step.label} className="flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all shadow-sm ${
                      isCompleted
                        ? "bg-maroon text-ivory border-maroon"
                        : isCurrent
                        ? "bg-gold-400 text-charcoal border-gold-400 ring-4 ring-gold-400/20 animate-pulse"
                        : "bg-background text-charcoal/40 border-border"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isCompleted || isCurrent ? "text-charcoal" : "text-charcoal/40"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gold-500">Service Contract</span>
          <h3 className="font-serif text-xl font-semibold text-maroon">Service Agreement</h3>
          <p className="text-xs text-charcoal/70 leading-relaxed">
            Review your tailored service terms and sign with our touch-friendly signature pad to unlock your vendor shortlist.
          </p>
          <div className="pt-2">
            <Link
              href="/client/agreement"
              className="text-xs font-semibold text-maroon hover:underline"
            >
              Review & Sign Agreement →
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-sage-500">Live Team Thread</span>
          <h3 className="font-serif text-xl font-semibold text-maroon">Messages & Updates</h3>
          <p className="text-xs text-charcoal/70 leading-relaxed">
            Direct real-time communication channel with your assigned lead planner Devraj and on-site coordinators.
          </p>
          <div className="pt-2">
            <Link
              href="/client/messages"
              className="text-xs font-semibold text-maroon hover:underline"
            >
              Open Message Thread →
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-maroon">Staged Billing</span>
          <h3 className="font-serif text-xl font-semibold text-maroon">Payment Milestones</h3>
          <p className="text-xs text-charcoal/70 leading-relaxed">
            View booking deposit, 30-day advance milestone, and final post-event settlement with downloadable PDF receipts.
          </p>
          <div className="pt-2">
            <span className="text-xs text-charcoal/50 italic">Unlocks after proposal acceptance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
