import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";
import { decryptField, computeBlindIndex } from "@/lib/crypto/field-encryption";
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
  searchParams: { status?: string; q?: string; page?: string; limit?: string };
}) {
  const session = await getSessionProfile();
  const userId = session?.profile.id || "00000000-0000-0000-0000-000000000000";

  const activeFilter = searchParams.status || "all";
  const searchQuery = searchParams.q?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = Math.min(100, Math.max(12, parseInt(searchParams.limit || "24", 10)));
  const offset = (page - 1) * pageSize;

  const bidx = searchQuery ? computeBlindIndex(searchQuery) : null;

  const { enquiryList, totalCount, statusCounts, staleCount } = await withUser(userId, async (sql) => {
    // 1. Status count aggregations for tabs
    const countsRaw = await sql`
      SELECT status, count(*)::int as count
      FROM public.enquiries
      GROUP BY status
    `;
    const countMap: Record<string, number> = {};
    let allTotal = 0;
    for (const r of countsRaw) {
      countMap[r.status] = r.count;
      allTotal += r.count;
    }

    const [staleRes] = await sql`
      SELECT count(*)::int as count
      FROM public.enquiries
      WHERE status = 'new' AND created_at < NOW() - INTERVAL '48 hours'
    `;

    // 2. Build where clause
    let statusSql = sql``;
    if (activeFilter === "stale") {
      statusSql = sql`AND e.status = 'new' AND e.created_at < NOW() - INTERVAL '48 hours'`;
    } else if (activeFilter !== "all") {
      statusSql = sql`AND e.status = ${activeFilter}`;
    }

    let searchSql = sql``;
    if (searchQuery) {
      searchSql = sql`AND (
        e.code ILIKE ${'%' + searchQuery + '%'}
        OR e.contact_name ILIKE ${'%' + searchQuery + '%'}
        OR e.city ILIKE ${'%' + searchQuery + '%'}
        ${bidx ? sql`OR e.contact_email_bidx = ${bidx} OR e.contact_phone_bidx = ${bidx}` : sql``}
      )`;
    }

    // 3. Count matching
    const [totalRes] = await sql`
      SELECT count(*)::int as count
      FROM public.enquiries e
      WHERE 1=1
        ${statusSql}
        ${searchSql}
    `;

    // 4. Fetch page
    const rows = await sql`
      SELECT 
        e.*,
        row_to_json(p.*) as packages
      FROM public.enquiries e
      LEFT JOIN public.packages p ON p.id = e.package_id
      WHERE 1=1
        ${statusSql}
        ${searchSql}
      ORDER BY e.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    return {
      enquiryList: (rows || []) as unknown as Array<
        Enquiry & { packages?: { name: string; slug: string } | null }
      >,
      totalCount: totalRes?.count || 0,
      statusCounts: { ...countMap, all: allTotal } as Record<string, number>,
      staleCount: staleRes?.count || 0,
    };
  });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const now = new Date().getTime();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  // Build CSV export link with current filters
  const exportParams = new URLSearchParams();
  if (activeFilter !== "all") exportParams.set("status", activeFilter);
  if (searchQuery) exportParams.set("q", searchQuery);
  const exportUrl = `/api/admin/enquiries/export${exportParams.toString() ? "?" + exportParams.toString() : ""}`;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Luxury Pipeline Architecture · Volume View
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Enquiries & CRM Pipeline ({totalCount.toLocaleString("en-IN")})
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Track inquiries from initial blueprint through consultation, e-signed agreements, proposal creation, and wedding confirmation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            download
            className="rounded-xl border border-charcoal/20 bg-card px-4 py-2 text-xs font-semibold text-charcoal hover:bg-ivory-100 transition-colors shadow-xs flex items-center gap-1.5"
          >
            📥 Export CSV
          </a>
          <Link
            href="/book"
            target="_blank"
            className="rounded-xl border border-gold-400 bg-gold-50/50 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-gold-100 transition-colors shadow-xs"
          >
            + Submit Booking (Test Inbound)
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <form method="GET" action="/admin/enquiries" className="flex items-center gap-2 flex-1 max-w-lg">
          {activeFilter !== "all" && <input type="hidden" name="status" value={activeFilter} />}
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search by name, code, city, email or phone (blind index)..."
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-charcoal placeholder:text-charcoal/40 focus:border-maroon focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors"
          >
            Search
          </button>
          {searchQuery && (
            <Link
              href={`/admin/enquiries${activeFilter !== "all" ? `?status=${activeFilter}` : ""}`}
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-charcoal/70 hover:text-charcoal"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="text-xs text-charcoal/60 flex items-center gap-2 self-end sm:self-auto">
          <span>
            Showing <strong>{totalCount === 0 ? 0 : offset + 1}</strong>–
            <strong>{Math.min(offset + pageSize, totalCount)}</strong> of <strong>{totalCount}</strong>
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs">
        <Link
          href={`/admin/enquiries${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeFilter === "all"
              ? "bg-maroon text-ivory"
              : "border border-border bg-card text-charcoal/70 hover:border-maroon"
          }`}
        >
          All ({statusCounts.all || 0})
        </Link>
        <Link
          href={`/admin/enquiries?status=stale${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeFilter === "stale"
              ? "bg-terracotta text-ivory"
              : "border border-border bg-card text-terracotta hover:border-terracotta"
          }`}
        >
          ⚠️ Stale &gt;48h ({staleCount})
        </Link>
        {STATUS_ORDER.map((item) => (
          <Link
            key={item.status}
            href={`/admin/enquiries?status=${item.status}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeFilter === item.status
                ? "bg-maroon text-ivory"
                : "border border-border bg-card text-charcoal/70 hover:border-maroon"
            }`}
          >
            {item.label} ({statusCounts[item.status] || 0})
          </Link>
        ))}
      </div>

      {/* Enquiries Grid / List */}
      {enquiryList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <span className="text-3xl">📭</span>
          <h3 className="font-serif text-lg font-semibold text-charcoal">No Enquiries Found</h3>
          <p className="text-xs text-charcoal/60 max-w-md mx-auto">
            {searchQuery
              ? `No enquiries matched search query "${searchQuery}". Try searching by exact email or phone for blind-index lookup.`
              : "No wedding requests currently match this filter. Submissions from the public booking wizard appear here in real time."}
          </p>
          {searchQuery && (
            <Link
              href="/admin/enquiries"
              className="inline-block mt-2 text-xs font-semibold text-maroon hover:underline"
            >
              Reset filters and search
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enquiryList.map((enq) => {
            const isStale =
              enq.status === "new" &&
              now - new Date(enq.created_at).getTime() > fortyEightHoursMs;
            const statusConfig = STATUS_ORDER.find((s) => s.status === enq.status);

            const decryptedEmail = decryptField("enquiries", "contact_email", enq.contact_email);
            const decryptedPhone = decryptField("enquiries", "contact_phone", enq.contact_phone);

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
                    <div className="text-[11px] text-charcoal/60 mt-1 truncate">
                      ✉️ {decryptedEmail || "Encrypted"} · 📞 {decryptedPhone || "Encrypted"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-ivory-100/60 p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-charcoal/60">Target Dates:</span>
                      <span className="font-medium text-charcoal">
                        {enq.preferred_start_date || "TBD"} → {enq.preferred_end_date || "TBD"}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/80 pt-4 text-xs">
          <div>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total leads)
          </div>
          <div className="flex items-center gap-1.5">
            {page > 1 ? (
              <Link
                href={`/admin/enquiries?page=${page - 1}${activeFilter !== "all" ? `&status=${activeFilter}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium hover:border-maroon transition-colors"
              >
                ← Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-border/40 bg-card/40 px-3 py-1.5 text-charcoal/40 cursor-not-allowed">
                ← Previous
              </span>
            )}

            {/* Direct Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && page > 3) {
                  p = page - 2 + i;
                  if (p > totalPages) p = totalPages - (4 - i);
                }
                return (
                  <Link
                    key={p}
                    href={`/admin/enquiries?page=${p}${activeFilter !== "all" ? `&status=${activeFilter}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                    className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                      page === p
                        ? "bg-maroon text-ivory"
                        : "border border-border bg-card text-charcoal hover:border-maroon"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>

            {page < totalPages ? (
              <Link
                href={`/admin/enquiries?page=${page + 1}${activeFilter !== "all" ? `&status=${activeFilter}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium hover:border-maroon transition-colors"
              >
                Next →
              </Link>
            ) : (
              <span className="rounded-lg border border-border/40 bg-card/40 px-3 py-1.5 text-charcoal/40 cursor-not-allowed">
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
