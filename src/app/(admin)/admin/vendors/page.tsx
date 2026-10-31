import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Vendor, VendorCategory } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Directory & Procurement · Vivona Admin",
};

const CATEGORIES: Array<{ key: VendorCategory | "all"; label: string; icon: string }> = [
  { key: "all", label: "All Vendors", icon: "🏛️" },
  { key: "catering", label: "Catering (3 Caterers)", icon: "🍽️" },
  { key: "decor", label: "Decor & Architecture", icon: "🌸" },
  { key: "photography", label: "Cinema & Drones", icon: "📸" },
  { key: "entertainment", label: "Music & Royal Troupe", icon: "🎺" },
  { key: "makeup", label: "Bridal Styling", icon: "💄" },
  { key: "logistics", label: "Luxury Chauffeur Fleet", icon: "🚘" },
  { key: "venue", label: "Palace Properties", icon: "🏰" },
];

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const admin = createAdminClient();
  const activeCat = searchParams.category || "all";

  let query = admin.from("vendors").select("*").order("name", { ascending: true });
  if (activeCat !== "all") {
    query = query.eq("category", activeCat);
  }

  const [vendorsRes, rfqsRes] = await Promise.all([
    query,
    admin.from("rfqs").select("id, category, status, weddings(code, title)").order("created_at", { ascending: false }).limit(5),
  ]);

  const vendors = (vendorsRes.data || []) as Vendor[];
  const recentRfqs = rfqsRes.data || [];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Procurement & Procurement Tenders
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Vendor Directory & Side-by-Side RFQs
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Manage Rajasthan’s premier vendor network. Compare multi-caterer bids, per-plate costs, and overtime fees.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.key}
            href={`/admin/vendors${cat.key === "all" ? "" : `?category=${cat.key}`}`}
            className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeCat === cat.key
                ? "bg-maroon text-ivory shadow-xs"
                : "border border-border bg-card text-charcoal/70 hover:border-maroon"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </Link>
        ))}
      </div>

      {/* Active RFQ Comparison Shortcuts */}
      {recentRfqs.length > 0 && (
        <div className="rounded-2xl border border-gold-400/40 bg-gold-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-charcoal flex items-center gap-2">
              <span>⚖️</span> Active RFQ Comparisons Ready for Review
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentRfqs.map((rfq: any) => (
              <Link
                key={rfq.id}
                href={`/admin/vendors/compare/${rfq.id}`}
                className="rounded-xl border border-border bg-card p-3 hover:border-gold-500 transition-colors block text-xs"
              >
                <div className="flex justify-between font-mono text-[10px] text-maroon font-bold">
                  <span>{rfq.weddings?.code || "VIV-2026"}</span>
                  <span className="uppercase">{rfq.status}</span>
                </div>
                <div className="font-semibold text-charcoal mt-1">
                  {rfq.category.toUpperCase()} Tender Comparison
                </div>
                <span className="text-[11px] text-gold-700 font-semibold block mt-2">
                  Open Side-by-Side Matrix →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <div
            key={v.id}
            className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs hover:border-gold-400/50 transition-all"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold bg-maroon/10 text-maroon px-2 py-0.5 rounded">
                  {v.category}
                </span>
                <span className="text-xs font-semibold text-gold-600">
                  ★ {v.rating ?? 5.0}
                </span>
              </div>
              <h3 className="font-serif text-lg font-semibold text-charcoal mt-2">
                {v.name}
              </h3>
              <p className="text-xs text-charcoal/60 mt-0.5">
                Contact: {v.contact_name} · 📍 {v.city}
              </p>
              {v.notes && (
                <p className="text-[11px] text-charcoal/70 mt-2 line-clamp-2 leading-relaxed bg-ivory-100/50 p-2 rounded-lg">
                  {v.notes}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="font-mono text-charcoal/60">{v.phone}</span>
              <span className="text-[11px] text-charcoal/50">{v.email}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
