import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { VendorComparisonMatrix } from "@/components/features/admin/vendor-comparison-matrix";
import type { ComparisonQuote } from "@/lib/procurement/comparison";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Side-by-Side Vendor Comparison · Vivona Admin",
};

export default async function AdminRfqComparePage({
  params,
}: {
  params: { rfqId: string };
}) {
  const admin = createAdminClient();

  // 1. Fetch RFQ with wedding details
  const { data: rfq, error: rfqErr } = await admin
    .from("rfqs")
    .select("*, weddings(id, code, title, guest_count_planned)")
    .eq("id", params.rfqId)
    .single();

  if (rfqErr || !rfq) {
    notFound();
  }

  // 2. Fetch all quotes and line items
  const { data: quotesData } = await admin
    .from("vendor_quotes")
    .select("*, vendors(id, name, city, category), quote_lines(*)")
    .eq("rfq_id", params.rfqId);

  const wedding = rfq.weddings as unknown as {
    id: string;
    code: string;
    title: string;
    guest_count_planned: number;
  } | null;

  const comparisonQuotes: ComparisonQuote[] = (quotesData || []).map((q: any) => ({
    quoteId: q.id,
    vendorId: q.vendor_id,
    vendorName: q.vendors?.name || "Vendor",
    vendorCategory: q.vendors?.category || rfq.category,
    city: q.vendors?.city || "Jaipur",
    status: q.status,
    extraHourRatePaise: q.extra_hour_rate_paise || 0,
    validUntil: q.valid_until,
    documentPath: q.document_path,
    lines: (q.quote_lines || []).map((l: any) => ({
      id: l.id,
      label: l.label,
      qty: Number(l.qty),
      unit: l.unit,
      unitPricePaise: Number(l.unit_price_paise),
      taxPct: Number(l.tax_pct),
      totalPaise: Number(l.total_paise),
      included: l.included,
      isExtra: l.is_extra,
    })),
  }));

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <Link
          href="/admin/vendors"
          className="text-xs text-charcoal/60 hover:text-maroon transition-colors"
        >
          ← Back to Vendor Directory
        </Link>
        <span className="font-mono text-xs font-bold text-maroon">
          RFQ: {rfq.id.slice(0, 8)}
        </span>
      </div>

      <VendorComparisonMatrix
        rfqId={rfq.id}
        weddingCode={wedding?.code || "VIV-2026"}
        weddingTitle={wedding?.title || "Royal Wedding"}
        guestCount={wedding?.guest_count_planned || 400}
        quotes={comparisonQuotes}
        rfqStatus={rfq.status}
      />
    </div>
  );
}
