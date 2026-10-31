import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { ReconciliationLedger } from "@/components/features/finance/reconciliation-ledger";
import type { PaymentMilestone, ExtraCharge, WeddingVendor, Vendor } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Financial Reconciliation & Settlement Ledger · Vivona Admin",
};

export default async function AdminWeddingFinancePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionProfile();
  const userId = session?.profile.id || "00000000-0000-0000-0000-000000000000";

  const data = await withUser(userId, async (sql) => {
    const [wedding] = await sql`
      SELECT id, code, title FROM public.weddings WHERE id = ${params.id}
    `;
    if (!wedding) return null;

    const milestones = await sql`
      SELECT * FROM public.payment_milestones
      WHERE wedding_id = ${params.id}
      ORDER BY due_date ASC
    `;

    const rawVendors = await sql`
      SELECT 
        wv.*,
        row_to_json(v.*) as vendors,
        COALESCE((
          SELECT json_agg(vb.*)
          FROM public.vendor_bills vb
          WHERE vb.wedding_vendor_id = wv.id
        ), '[]') as vendor_bills,
        COALESCE((
          SELECT json_agg(vp.*)
          FROM public.vendor_payments vp
          WHERE vp.wedding_vendor_id = wv.id
        ), '[]') as vendor_payments
      FROM public.wedding_vendors wv
      LEFT JOIN public.vendors v ON v.id = wv.vendor_id
      WHERE wv.wedding_id = ${params.id}
    `;

    const extraCharges = await sql`
      SELECT * FROM public.extra_charges
      WHERE wedding_id = ${params.id}
      ORDER BY created_at DESC
    `;

    const timesheets = await sql`
      SELECT hours, hourly_rate_paise
      FROM public.timesheets
      WHERE wedding_id = ${params.id}
    `;

    return { wedding, milestones, rawVendors, extraCharges, timesheets };
  });

  if (!data || !data.wedding) notFound();

  const { wedding, milestones, rawVendors, extraCharges, timesheets } = data;

  const vendors = rawVendors.map((wv: any) => ({
    ...wv,
    vendor: wv.vendors as Vendor,
    bills: wv.vendor_bills || [],
    payments: wv.vendor_payments || [],
  })) as Array<WeddingVendor & { vendor?: Vendor; bills?: any[]; payments?: any[] }>;

  const labourCostPaise = timesheets.reduce(
    (acc: number, t: any) => acc + Number(t.hours) * Number(t.hourly_rate_paise),
    0
  );

  return (
    <div className="max-w-6xl mx-auto">
      <ReconciliationLedger
        weddingId={wedding.id}
        weddingCode={wedding.code}
        weddingTitle={wedding.title}
        milestones={milestones as unknown as PaymentMilestone[]}
        vendors={vendors}
        extraCharges={extraCharges as unknown as ExtraCharge[]}
        labourCostPaise={labourCostPaise}
      />
    </div>
  );
}
