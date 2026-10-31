import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";

export const metadata = {
  title: "Messages & Team Thread · Vivona Client Portal",
};

export default async function ClientMessagesPage() {
  const session = await getSessionProfile();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-sage-600 font-semibold">
            Direct Concierge Channel
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Planning Team Messages
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Realtime private chat thread between your family and assigned Vivona planners.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sage-100 text-sage-700 border border-sage-300">
          <span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" />
          Realtime Connected
        </span>
      </div>

      {/* Messages Window */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 min-h-[420px] flex flex-col justify-between">
        {/* Chat History */}
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-[10px] uppercase font-semibold text-charcoal/40 bg-ivory-200 px-3 py-1 rounded-full">
              Thread Initiated with Vivona Executive Concierge
            </span>
          </div>

          <div className="flex items-start gap-3 max-w-md">
            <div className="w-8 h-8 rounded-full bg-maroon text-ivory text-xs font-serif font-bold flex items-center justify-center shrink-0">
              DR
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-sm bg-ivory-200/80 text-xs text-charcoal space-y-1">
              <p className="font-semibold text-maroon">Devraj Rathore (Managing Director)</p>
              <p className="leading-relaxed">
                Namaste {session?.profile.full_name || "Esteemed Client"}! Welcome to Vivona. Our team has received your dates and initial brief. We are actively reviewing palace lawn availability and preparing your caterer tender shortlist.
              </p>
              <span className="text-[10px] text-charcoal/40 block text-right">10:45 AM</span>
            </div>
          </div>

          <div className="flex items-start gap-3 max-w-md">
            <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-700 text-xs font-serif font-bold flex items-center justify-center shrink-0">
              AS
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-sm bg-ivory-200/80 text-xs text-charcoal space-y-1">
              <p className="font-semibold text-sage-700">Ananya Sharma (Lead Planner)</p>
              <p className="leading-relaxed">
                Please make sure to review and execute your Service Agreement in the Agreement tab when ready. It unlocks our negotiated tasting menus and floor plans.
              </p>
              <span className="text-[10px] text-charcoal/40 block text-right">11:15 AM</span>
            </div>
          </div>
        </div>

        {/* Reply Box */}
        <div className="pt-4 border-t border-border/80">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Type your message to Devraj and Ananya..."
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-xs text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              className="rounded-xl bg-maroon px-5 py-3 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
            >
              Send Message
            </button>
          </div>
          <p className="text-[10px] text-charcoal/50 mt-1.5">
            Full file attachments and multi-planner threads are active across all assigned devices.
          </p>
        </div>
      </div>
    </div>
  );
}
