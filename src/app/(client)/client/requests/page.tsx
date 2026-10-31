import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPaise } from "@/lib/utils";
import type { Enquiry } from "@/types/database";

export const metadata = {
  title: "My Wedding Requests · Vivona Client Portal",
};

export default async function ClientRequestsPage() {
  const session = await getSessionProfile();
  let enquiries: Enquiry[] = [];

  if (session) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("enquiries")
      .select("*")
      .eq("client_id", session.profile.id)
      .order("created_at", { ascending: false });
    if (data) enquiries = data as Enquiry[];
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-maroon font-semibold">
            Wedding Blueprint Status
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            My Submitted Requests
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Track your initial wedding inquiries, ceremony parameters, and planning drafts.
          </p>
        </div>

        <Link
          href="/book"
          className="rounded-xl bg-maroon px-4 py-2.5 text-xs font-medium text-ivory hover:bg-maroon-600 transition-colors shadow-sm text-center"
        >
          + Submit Another Plan
        </Link>
      </div>

      {enquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-4">
          <p className="text-sm font-serif text-charcoal">No wedding requests submitted yet.</p>
          <p className="text-xs text-charcoal/60 max-w-sm mx-auto">
            Ready to begin? Use our interactive booking wizard to configure dates, themes, and guest scales.
          </p>
          <Link
            href="/book"
            className="inline-block rounded-xl bg-maroon px-6 py-2.5 text-xs font-semibold text-ivory hover:bg-maroon-600"
          >
            Launch Booking Wizard →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {enquiries.map((enq) => {
            const isEditable = enq.status === "new" || enq.status === "contacted";

            return (
              <div
                key={enq.id}
                className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-maroon bg-maroon/10 px-2.5 py-1 rounded">
                      {enq.code}
                    </span>
                    <h2 className="font-serif text-xl font-semibold text-charcoal mt-2">
                      {enq.theme || "Luxury Wedding Blueprint"}
                    </h2>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      Destination: {enq.city} · Submitted on {new Date(enq.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gold-100 text-gold-700 border border-gold-300">
                      Status: {enq.status.replace("_", " ")}
                    </span>
                    <p className="text-[11px] text-charcoal/50 mt-1">
                      {isEditable ? "Editable until admin consultation lock" : "Locked for proposal generation"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-ivory-200/50">
                    <span className="text-charcoal/50 block">Dates</span>
                    <span className="font-semibold text-charcoal">
                      {enq.preferred_start_date} to {enq.preferred_end_date}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-ivory-200/50">
                    <span className="text-charcoal/50 block">Guest Scale</span>
                    <span className="font-semibold text-charcoal">{enq.guest_count} Guests</span>
                  </div>
                  <div className="p-3 rounded-xl bg-ivory-200/50">
                    <span className="text-charcoal/50 block">Plan Type</span>
                    <span className="font-semibold text-charcoal capitalize">{enq.type}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-ivory-200/50">
                    <span className="text-charcoal/50 block">Target Budget</span>
                    <span className="font-semibold text-maroon">
                      {formatPaise(enq.budget_max_paise, { showCompact: true })}
                    </span>
                  </div>
                </div>

                {enq.custom_services && enq.custom_services.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <span className="text-xs font-semibold uppercase tracking-wider text-charcoal block">
                      Custom Modules Selected:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {enq.custom_services.map((svc, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-[11px] bg-ivory-300 text-charcoal border border-border"
                        >
                          {svc.category}: {svc.notes || "Included"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <Link
                    href="/client/agreement"
                    className="text-xs font-semibold text-maroon hover:underline"
                  >
                    View Associated Service Agreement →
                  </Link>

                  {isEditable && (
                    <span className="text-[11px] text-sage-600 font-medium">
                      ✓ Details active with lead planner
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
