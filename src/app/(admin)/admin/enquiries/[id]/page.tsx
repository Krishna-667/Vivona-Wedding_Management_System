import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
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
  const session = await getSessionProfile();
  const userId = session?.profile.id || "00000000-0000-0000-0000-000000000000";

  const data = await withUser(userId, async (sql) => {
    const [enquiry] = await sql`
      SELECT 
        e.*,
        row_to_json(p.*) as packages
      FROM public.enquiries e
      LEFT JOIN public.packages p ON p.id = e.package_id
      WHERE e.id = ${params.id}
    `;

    if (!enquiry) return null;

    const activities = await sql`
      SELECT * FROM public.enquiry_activities
      WHERE enquiry_id = ${params.id}
      ORDER BY created_at DESC
    `;

    const [propData] = await sql`
      SELECT 
        pr.*,
        COALESCE((
          SELECT json_agg(pl.*)
          FROM public.proposal_lines pl
          WHERE pl.proposal_id = pr.id
        ), '[]') as proposal_lines
      FROM public.proposals pr
      WHERE pr.enquiry_id = ${params.id}
      ORDER BY pr.created_at DESC
      LIMIT 1
    `;

    const [agreement] = await sql`
      SELECT * FROM public.agreements
      WHERE enquiry_id = ${params.id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const teamMembers = await sql`
      SELECT id, full_name, role FROM public.profiles
      WHERE role IN ('admin', 'employee') AND is_active = true
    `;

    return {
      enquiry: enquiry as unknown as Enquiry & { packages?: { name: string; slug: string } | null },
      activities: (activities || []) as unknown as EnquiryActivity[],
      proposal: (propData || null) as unknown as (Proposal & { proposal_lines?: Array<any> }) | null,
      agreement: (agreement || null) as unknown as Agreement | null,
      teamMembers: (teamMembers || []) as unknown as Array<{ id: string; full_name: string; role: string }>,
    };
  });

  if (!data || !data.enquiry) {
    notFound();
  }

  const { enquiry, activities, proposal, agreement, teamMembers } = data;

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
