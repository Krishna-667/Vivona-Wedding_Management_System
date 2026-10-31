import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPaise } from "@/lib/utils";
import type { Enquiry, EnquiryStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM Pipeline · Vivona Admin",
};

const STATUS_ORDER: Array<{ status: EnquiryStatus; label: string; badge: string }> = [
  { status: "new", label: "New Leads", badge: "bg-maroon/10 text-maroon" },
  { status: "contacted", label: "Contacted", badge: "bg-gold-100 text-gold-700" },
  { status: "consultation_scheduled", label: "Consultation", badge: "bg-blue-50 text-blue-700" },
  { status: "agreement_sent", label: "Agreement Sent", badge: "bg-purple-50 text-purple-700" },
  { status: "agreement_signed", label: "Agreement Signed", badge: "bg-sage-100 text-sage-800" },
  { status: "proposal_sent", label: "Proposal Sent", badge: "bg-amber-50 text-amber-800" },
  { status: "confirmed", label: "Confirmed Weddings", badge: "bg-sage-600 text-ivory" },
  { status: "lost", label: "Lost / Closed", badge: "bg-charcoal/10 text-charcoal/60" },
];

export default async function AdminEnquiriesPipelinePage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const admin = createAdminClient();
  const activeFilter = searchParams.status || "all";

  let query = admin
    .from("enquiries")
    .select("*, packages(name, slug)")
    .order("created_at", { ascending: false });

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data: enquiries } = await query;
  const enquiryList = (enquiries || []) as Array<
    Enquiry & { packages?: { name: string; slug: string } | null }
  >;

  const now = new Date().getTime();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Luxury Pipeline Architecture
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Enquiries & CRM Pipeline
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Track inquiries from initial blueprint through consultation, e-signed agreements, proposal creation, and wedding confirmation.
          </p>
        </div>

        <Link
          href="/book"
          target="_blank"
          className="rounded-xl border border-gold-400 bg-gold-50/50 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-gold-100 transition-colors shadow-xs"
        >
          + Submit Booking (Test Inbound)
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <Link
          href="/admin/enquiries"
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeFilter === "all"
              ? "bg-maroon text-ivory"
              : "border border-border bg-card text-charcoal/70 hover:border-maroon"
          }`}
        >
          All Enquiries ({enquiryList.length})
        </Link>
        {STATUS_ORDER.map((item) => (
          <Link
            key={item.status}
            href={`/admin/enquiries?status=${item.status}`}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeFilter === item.status
                ? "bg-maroon text-ivory"
                : "border border-border bg-card text-charcoal/70 hover:border-maroon"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Enquiries Grid / List */}
      {enquiryList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <span className="text-3xl">📭</span>
          <h3 className="font-serif text-lg font-semibold text-charcoal">No Enquiries Found</h3>
          <p className="text-xs text-charcoal/60 max-w-md mx-auto">
            No wedding requests currently match this filter. Submissions from the public booking wizard appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enquiryList.map((enq) => {
            const isStale =
              enq.status === "new" &&
              now - new Date(enq.created_at).getTime() > fortyEightHoursMs;
            const statusConfig = STATUS_ORDER.find((s) => s.status === enq.status);

            return (
              <div
                key={enq.id}
                className={`rounded-2xl border bg-card p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-maroon transition-all ${
                  isStale ? "border-terracotta/70 bg-terracotta/5" : "border-border"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold bg-maroon/10 text-maroon px-2 py-0.5 rounded">
                      {enq.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isStale && (
                        <span className="text-[10px] font-bold bg-terracotta text-ivory px-2 py-0.5 rounded-full animate-pulse">
                          ⚠️ Stale &gt;48h
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          statusConfig?.badge || "bg-card text-foreground"
                        }`}
                      >
                        {statusConfig?.label || enq.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-serif text-lg font-semibold text-charcoal leading-snug">
                      {enq.contact_name}
                    </h3>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      📍 {enq.city} · 👥 {enq.guest_count} Guests
                    </p>
                  </div>

                  <div className="rounded-xl bg-ivory-100/60 p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-charcoal/60">Target Dates:</span>
                      <span className="font-medium text-charcoal">
                        {enq.preferred_start_date} → {enq.preferred_end_date}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal/60">Format:</span>
                      <span className="font-medium text-charcoal">
                        {enq.packages?.name || (enq.type === "package" ? "Curated Package" : "Custom Architecture")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal/60">Target Budget:</span>
                      <span className="font-mono font-semibold text-gold-700">
                        {formatPaise(BigInt(enq.budget_max_paise))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-charcoal/50">
                    Logged: {new Date(enq.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                  <Link
                    href={`/admin/enquiries/${enq.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-maroon px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors"
                  >
                    Manage Lead →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
