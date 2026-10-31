import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPaise } from "@/lib/utils";
import { EnquiryManager } from "@/components/features/admin/enquiry-manager";
import type { Enquiry, EnquiryActivity, Proposal, Agreement } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Enquiry Blueprint Detail · Vivona Admin",
};

export default async function AdminEnquiryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();

  const [enqRes, actRes, propRes, agRes, teamRes] = await Promise.all([
    admin.from("enquiries").select("*, packages(name, slug)").eq("id", params.id).single(),
    admin.from("enquiry_activities").select("*").eq("enquiry_id", params.id).order("created_at", { ascending: false }),
    admin.from("proposals").select("*, proposal_lines(*)").eq("enquiry_id", params.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("agreements").select("*").eq("enquiry_id", params.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("profiles").select("id, full_name, role").in("role", ["admin", "employee"]).eq("is_active", true),
  ]);

  if (enqRes.error || !enqRes.data) {
    notFound();
  }

  const enquiry = enqRes.data as unknown as Enquiry & { packages?: { name: string; slug: string } | null };
  const activities = (actRes.data || []) as EnquiryActivity[];
  const proposal = propRes.data as unknown as (Proposal & { proposal_lines?: Array<any> }) | null;
  const agreement = agRes.data as unknown as Agreement | null;
  const teamMembers = (teamRes.data || []) as Array<{ id: string; full_name: string; role: string }>;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <Link
            href="/admin/enquiries"
            className="text-xs text-charcoal/60 hover:text-maroon transition-colors block mb-1"
          >
            ← Back to CRM Pipeline
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold bg-maroon/10 text-maroon px-2.5 py-1 rounded-md">
              {enquiry.code}
            </span>
            <h1 className="font-serif text-3xl font-semibold text-charcoal">
              {enquiry.contact_name}
            </h1>
          </div>
          <p className="text-xs text-charcoal/70 mt-1">
            📍 {enquiry.city} · 👥 {enquiry.guest_count} Planned Guests · Target: {enquiry.preferred_start_date} to {enquiry.preferred_end_date}
          </p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-[11px] text-charcoal/60 block">Max Target Budget</span>
            <span className="font-mono text-xl font-bold text-gold-700">
              {formatPaise(BigInt(enquiry.budget_max_paise))}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Enquiry Manager */}
      <EnquiryManager
        enquiry={enquiry}
        activities={activities}
        proposal={proposal}
        agreement={agreement}
        teamMembers={teamMembers}
      />
    </div>
  );
}
