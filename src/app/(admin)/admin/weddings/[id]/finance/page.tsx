import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();

  const [weddingRes, milestonesRes, vendorsRes, extrasRes, timesheetsRes] = await Promise.all([
    admin.from("weddings").select("id, code, title").eq("id", params.id).single(),
    admin.from("payment_milestones").select("*").eq("wedding_id", params.id).order("due_date", { ascending: true }),
    admin.from("wedding_vendors").select("*, vendors(*), vendor_bills(*), vendor_payments(*)").eq("wedding_id", params.id),
    admin.from("extra_charges").select("*").eq("wedding_id", params.id).order("created_at", { ascending: false }),
    admin.from("timesheets").select("hours, hourly_rate_paise").eq("wedding_id", params.id),
  ]);

  if (weddingRes.error || !weddingRes.data) notFound();

  const wedding = weddingRes.data;
  const milestones = (milestonesRes.data || []) as PaymentMilestone[];
  const rawVendors = vendorsRes.data || [];
  const extraCharges = (extrasRes.data || []) as ExtraCharge[];
  const timesheets = timesheetsRes.data || [];

  const vendors = rawVendors.map((wv: any) => ({
    ...wv,
    vendor: wv.vendors as Vendor,
    bills: wv.vendor_bills || [],
    payments: wv.vendor_payments || [],
  })) as Array<WeddingVendor & { vendor?: Vendor; bills?: any[]; payments?: any[] }>;

  const labourCostPaise = timesheets.reduce(
    (acc, t: any) => acc + Number(t.hours) * Number(t.hourly_rate_paise),
    0
  );

  return (
    <div className="max-w-6xl mx-auto">
      <ReconciliationLedger
        weddingId={wedding.id}
        weddingCode={wedding.code}
        weddingTitle={wedding.title}
        milestones={milestones}
        vendors={vendors}
        extraCharges={extraCharges}
        labourCostPaise={labourCostPaise}
      />
    </div>
  );
}
